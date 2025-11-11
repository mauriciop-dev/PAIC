
import React, { useState } from 'react';
import { ConjuntoInfo, UserProfile, StoredFile } from '../../types';
import { Icon } from '../ui/Icon';
import { geminiService } from '../../services/geminiService';
import { apiService } from '../../services/apiService';
import FileSelectorModal from '../FileSelectorModal';

interface ComunicacionesViewProps {
    userProfile: UserProfile;
    conjuntoInfo: ConjuntoInfo;
}

const ComunicacionesView: React.FC<ComunicacionesViewProps> = ({ userProfile, conjuntoInfo }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipients, setRecipients] = useState<string[]>([]);
    const [currentRecipient, setCurrentRecipient] = useState('');
    const [attachments, setAttachments] = useState<StoredFile[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
    const [feedback, setFeedback] = useState<{type: 'success' | 'error', text: string} | null>(null);
    

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
    
    const handleAddRecipient = () => {
        const newRecipient = currentRecipient.trim().replace(/,$/, ''); // Remove trailing comma
        if (newRecipient && /\S+@\S+\.\S+/.test(newRecipient) && !recipients.includes(newRecipient)) {
            setRecipients([...recipients, newRecipient]);
            setCurrentRecipient('');
        }
    };

    const handleRemoveRecipient = (recipientToRemove: string) => {
        setRecipients(recipients.filter(r => r !== recipientToRemove));
    };
    
    const handleSelectFiles = (selectedFiles: StoredFile[]) => {
        setAttachments(selectedFiles);
        setIsFileSelectorOpen(false);
    };

    const removeAttachment = (fileToRemove: StoredFile) => {
        setAttachments(prev => prev.filter(file => file.id !== fileToRemove.id));
    };


    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim() || recipients.length === 0) {
            setFeedback({type: 'error', text: 'Por favor, completa asunto, cuerpo y destinatarios.'});
            return;
        }
        setIsSending(true);
        setFeedback(null);
        
        try {
            const attachmentLinks = attachments.map(file => ({ name: file.name, url: file.url }));

            const result = await apiService.sendCommunicationEmail(recipients, subject, body, attachmentLinks, conjuntoInfo.adminName, conjuntoInfo.adminEmail);
            
            if (result.success) {
                setFeedback({type: 'success', text: `¡Correo enviado exitosamente a ${recipients.length} destinatario(s)!`});
                setSubject('');
                setBody('');
                setRecipients([]);
                setAttachments([]);
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido en el servidor.');
            }

        } catch (error: any) {
            console.error("Error sending communication:", error);
            setFeedback({type: 'error', text: `Error al enviar: ${error.message}`});
        } finally {
            setIsSending(false);
            setTimeout(() => setFeedback(null), 7000);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-md">
                <form onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-2">Destinatarios</label>
                         <div className="flex flex-wrap gap-2 mb-2">
                            <button type="button" onClick={() => addRecipientGroup('all')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Todos los residentes</button>
                            <button type="button" onClick={() => addRecipientGroup('debtors')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Residentes en mora</button>
                            <button type="button" onClick={() => addRecipientGroup('providers')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Proveedores</button>
                            <button type="button" onClick={() => addRecipientGroup('internal')} className="px-2 py-1 text-xs bg-gray-200 rounded-full hover:bg-gray-300">Internos</button>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md bg-white focus-within:ring-2 focus-within:ring-blue-500">
                            {recipients.map(recipient => (
                                <div key={recipient} className="flex items-center gap-2 bg-blue-100 text-blue-800 text-sm font-medium px-2 py-1 rounded-full">
                                    {recipient}
                                    <button type="button" onClick={() => handleRemoveRecipient(recipient)} className="text-blue-600 hover:text-blue-800">
                                        <Icon name="x" className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                            <input
                                type="email"
                                value={currentRecipient}
                                onChange={(e) => setCurrentRecipient(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                        e.preventDefault();
                                        handleAddRecipient();
                                    }
                                }}
                                placeholder={recipients.length === 0 ? "Añadir correos y presionar Enter..." : ""}
                                className="flex-1 bg-transparent focus:outline-none p-1 text-sm"
                            />
                        </div>
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
                     {attachments.length > 0 && (
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Archivos Adjuntos</label>
                            <div className="flex flex-wrap gap-2 p-2 border border-gray-200 rounded-md bg-gray-50">
                                {attachments.map(file => (
                                     <div key={file.id} className="flex items-center gap-2 bg-indigo-100 text-indigo-800 text-sm font-medium px-2 py-1 rounded-full">
                                        <Icon name="file-text" className="w-4 h-4"/>
                                        {file.name}
                                        <button type="button" onClick={() => removeAttachment(file)} className="text-indigo-600 hover:text-indigo-800">
                                            <Icon name="x" className="w-3 h-3" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    <div className="flex justify-end items-center gap-4">
                        <button
                            type="button"
                            onClick={() => setIsFileSelectorOpen(true)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 flex items-center gap-2"
                        >
                            <Icon name="file-text" className="w-5 h-5" />
                            Adjuntar desde Archivos
                        </button>

                        <button
                            type="submit"
                            disabled={isSending || isGenerating}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                        >
                            <Icon name="send" className="w-5 h-5" />
                            {isSending ? 'Enviando...' : `Enviar a ${recipients.length} destinatarios`}
                        </button>
                    </div>
                     {feedback && (
                        <p className={`text-sm mt-4 text-center ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback.text}
                        </p>
                    )}
                </form>
            </div>
             {isFileSelectorOpen && (
                <FileSelectorModal
                    isOpen={isFileSelectorOpen}
                    onClose={() => setIsFileSelectorOpen(false)}
                    conjuntoId={userProfile.conjuntoId!}
                    onSelectFiles={handleSelectFiles}
                    currentSelection={attachments}
                />
            )}
        </div>
    );
};

export default ComunicacionesView;