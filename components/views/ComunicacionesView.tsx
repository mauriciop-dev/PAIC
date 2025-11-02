import React, { useState, useRef } from 'react';
import { UserProfile } from '../../types';
import { Icon } from '../ui/Icon';
import { geminiService } from '../../services/geminiService';
import { apiService } from '../../services/apiService';

interface ComunicacionesViewProps {
    userProfile: UserProfile;
}

const ComunicacionesView: React.FC<ComunicacionesViewProps> = ({ userProfile }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipients, setRecipients] = useState<string[]>([]);
    const [files, setFiles] = useState<File[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    

    const handleGenerateSubject = async () => {
        if (!body.trim()) {
            setFeedback({type: 'error', text: 'Escribe el cuerpo del mensaje para generar un asunto.'});
            return;
        };
        setIsGenerating(true);
        setFeedback(null);
        try {
            const newSubject = await geminiService.generateSubject(body);
            setSubject(newSubject);
        } catch (error) {
            console.error("Error generating subject:", error);
            setFeedback({type: 'error', text: 'No se pudo generar el asunto.'});
        } finally {
            setIsGenerating(false);
        }
    };

    const handleImproveWriting = async () => {
        if (!body.trim()) {
            setFeedback({type: 'error', text: 'Escribe el cuerpo del mensaje para mejorarlo.'});
            return;
        }
        setIsGenerating(true);
        setFeedback(null);
        try {
            const improvedBody = await geminiService.improveWriting(body);
            setBody(improvedBody);
        } catch (error) {
            console.error("Error improving writing:", error);
            setFeedback({type: 'error', text: 'No se pudo mejorar la redacción.'});
        } finally {
            setIsGenerating(false);
        }
    };
    
    const addRecipientGroup = async (group: 'all' | 'debtors' | 'providers' | 'internal') => {
        if (!userProfile.conjuntoId) return;
        let emailList: string[] = [];
        switch(group) {
            case 'all':
                emailList = (await apiService.fetchResidents(userProfile.conjuntoId)).map(r => r.email);
                break;
            case 'debtors':
                 const accounts = await apiService.fetchAccountStatus(userProfile.conjuntoId);
                const debtorApartments = accounts.filter(a => a.outstandingBalance > 0).map(a => a.apartment);
                const residents = await apiService.fetchResidents(userProfile.conjuntoId);
                emailList = residents.filter(r => debtorApartments.includes(r.apartment)).map(r => r.email);
                break;
            case 'providers':
                emailList = (await apiService.fetchProviders(userProfile.conjuntoId)).map(p => p.email);
                break;
            case 'internal':
                emailList = (await apiService.fetchInternalStaff(userProfile.conjuntoId)).map(s => s.email);
                break;
        }
        setRecipients(prev => [...new Set([...prev, ...emailList.filter(Boolean)])]);
    }
    
    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setFiles(prev => [...prev, ...Array.from(event.target.files!)]);
        }
    };

    const removeFile = (fileToRemove: File) => {
        setFiles(prev => prev.filter(file => file !== fileToRemove));
    };


    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim() || recipients.length === 0) {
            setFeedback({type: 'error', text: 'Por favor, completa asunto, cuerpo y destinatarios.'});
            return;
        }
        setIsSending(true);
        setIsUploading(files.length > 0);
        setFeedback(null);
        
        try {
            let uploadedAttachments: { name: string; url: string }[] = [];
            if (files.length > 0 && userProfile.conjuntoId) {
                const uploadPromises = files.map(file => apiService.uploadCommunicationAttachment(userProfile.conjuntoId!, file));
                const results = await Promise.all(uploadPromises);
                const successfulUploads = results.filter(res => res !== null) as { name: string; url: string }[];
                if (successfulUploads.length !== files.length) {
                    throw new Error("Algunos archivos no se pudieron subir.");
                }
                uploadedAttachments = successfulUploads;
            }
            setIsUploading(false);

            const result = await apiService.sendCommunicationEmail(recipients, subject, body, uploadedAttachments);
            
            if (result.success) {
                setFeedback({type: 'success', text: `¡Correo enviado exitosamente a ${recipients.length} destinatario(s)!`});
                setSubject('');
                setBody('');
                setRecipients([]);
                setFiles([]);
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido en el servidor.');
            }

        } catch (error: any) {
            console.error("Error sending communication:", error);
            setFeedback({type: 'error', text: `Error al enviar: ${error.message}`});
        } finally {
            setIsSending(false);
            setIsUploading(false);
            setTimeout(() => setFeedback(null), 7000);
        }
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-2">Destinatarios</label>
                            <div className="flex flex-wrap gap-2 mb-2">
                                <button type="button" onClick={() => addRecipientGroup('all')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Todos los residentes</button>
                                <button type="button" onClick={() => addRecipientGroup('debtors')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Residentes en mora</button>
                                <button type="button" onClick={() => addRecipientGroup('providers')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Proveedores</button>
                                <button type="button" onClick={() => addRecipientGroup('internal')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Internos</button>
                            </div>
                            <textarea
                                id="recipients"
                                value={recipients.join(', ')}
                                onChange={(e) => setRecipients(e.target.value.split(',').map(em => em.trim()))}
                                placeholder="Añade correos aquí o selecciona un grupo"
                                className="w-full p-2 border border-gray-300 rounded-md"
                                rows={2}
                            />
                        </div>
                        <div>
                            <div className="flex justify-between items-center mb-1">
                                <label htmlFor="subject" className="block text-sm font-medium text-gray-700">Asunto</label>
                                <button type="button" onClick={handleGenerateSubject} disabled={isGenerating || !body.trim()} className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50">
                                    <Icon name="bot" className="w-4 h-4" /> Re-escribir con IA
                                </button>
                            </div>
                            <input
                                type="text"
                                id="subject"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                placeholder="Asunto del comunicado"
                                className="w-full p-2 border border-gray-300 rounded-md"
                                required
                            />
                        </div>
                        <div>
                             <div className="flex justify-between items-center mb-1">
                                <label htmlFor="body" className="block text-sm font-medium text-gray-700">Cuerpo del Mensaje</label>
                                 <button type="button" onClick={handleImproveWriting} disabled={isGenerating || !body.trim()} className="text-xs text-blue-600 hover:underline flex items-center gap-1 disabled:opacity-50">
                                    <Icon name="bot" className="w-4 h-4" /> Mejorar redacción
                                </button>
                            </div>
                            <textarea
                                id="body"
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                placeholder="Escribe tu mensaje aquí..."
                                className="w-full p-2 border border-gray-300 rounded-md h-64 resize-none"
                                required
                            />
                        </div>
                        <div className="flex justify-end">
                            <button
                                type="submit"
                                disabled={isSending || isGenerating}
                                className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                            >
                                <Icon name="send" className="w-5 h-5" />
                                {isUploading ? 'Subiendo archivos...' : isSending ? 'Enviando...' : 'Enviar Comunicado'}
                            </button>
                        </div>
                         {feedback && (
                            <p className={`text-sm mt-4 text-center ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                                {feedback.text}
                            </p>
                        )}
                    </form>
                </div>
                <div className="lg:col-span-1">
                    <div className="bg-white p-6 rounded-lg shadow-md sticky top-24">
                        <h3 className="text-lg font-semibold text-gray-700 mb-4">Gestor de Archivos</h3>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-500 hover:bg-blue-50 cursor-pointer"
                        >
                          <Icon name="package" className="mx-auto h-10 w-10 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600">
                            Arrastra archivos aquí o haz clic para seleccionar.
                          </p>
                          <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleFileChange}
                                className="hidden"
                                multiple
                            />
                        </div>
                        {files.length > 0 && (
                            <div className="mt-4 space-y-2">
                                <h4 className="text-sm font-medium text-gray-600">Archivos adjuntos:</h4>
                                {files.map((file, index) => (
                                    <div key={index} className="flex items-center justify-between text-sm bg-gray-100 p-2 rounded-md">
                                        <span className="truncate">{file.name}</span>
                                        <button onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700">
                                            <Icon name="x" className="w-4 h-4" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComunicacionesView;