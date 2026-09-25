
import React, { useState } from 'react';
import { ConjuntoInfo, UserProfile } from '../../types';
import { Icon } from '@paic/ui';
import { geminiService } from '../../services/geminiService';
import { apiService } from '../../services/apiService';
import CommunicationRecipientModal, { RecipientSelection } from '../CommunicationRecipientModal';
import {
    getGoogleDrivePreviewUrl,
    isGoogleDriveFileUrl,
    isValidGoogleDriveLink,
} from '../../utils/googleDriveLinks';

interface ComunicacionesViewProps {
    userProfile: UserProfile;
    conjuntoInfo: ConjuntoInfo;
}

const ComunicacionesView: React.FC<ComunicacionesViewProps> = ({ userProfile, conjuntoInfo }) => {
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipients, setRecipients] = useState<string[]>([]);
    const [selectedApartments, setSelectedApartments] = useState<string[]>([]);
    const [recipientSelection, setRecipientSelection] = useState<RecipientSelection>({ audience: 'manual', apartments: [], emails: [], emailsByApartment: {} });
    const [isRecipientModalOpen, setIsRecipientModalOpen] = useState(false);
    const [scheduleMode, setScheduleMode] = useState<'now' | 'once' | 'weekly' | 'monthly'>('now');
    const [scheduledAt, setScheduledAt] = useState('');
    const [currentRecipient, setCurrentRecipient] = useState('');
    const [attachments, setAttachments] = useState<{name: string, url: string}[]>([]);
    const [isSending, setIsSending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [isFileSelectorOpen, setIsFileSelectorOpen] = useState(false);
    const [isDriveLinkInputOpen, setIsDriveLinkInputOpen] = useState(false);
    const [driveLink, setDriveLink] = useState('');
    const [driveLinkError, setDriveLinkError] = useState<string | null>(null);
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
    
    const validateDriveLink = (url: string): string | null => {
        if (!url.trim()) return 'Por favor ingrese un enlace';

        if (isValidGoogleDriveLink(url)) {
            return null;
        }

        return 'El enlace debe ser un archivo o carpeta de Google Drive público (ej: https://drive.google.com/file/d/FILE_ID/view o https://drive.google.com/folders/FOLDER_ID)';
    };
    
    const handleAddDriveLink = () => {
        const error = validateDriveLink(driveLink);
        if (error) {
            setDriveLinkError(error);
            return;
        }
        
        // Extract a name from the URL for display
        let name = 'Enlace de Google Drive';
        try {
            const urlObj = new URL(driveLink);
            if (driveLink.includes('/file/d/')) {
                name = `Archivo de Drive`;
            } else if (driveLink.includes('/folders/')) {
                name = `Carpeta de Drive`;
            }
        } catch (e) {
            // Use default name if URL parsing fails
        }
        
        setAttachments(prev => [...prev, { name, url: driveLink.trim() }]);
        setDriveLink('');
        setDriveLinkError(null);
        setIsDriveLinkInputOpen(false);
    };
    
    const removeAttachment = (indexToRemove: number) => {
        setAttachments(prev => prev.filter((_, index) => index !== indexToRemove));
    };


    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim() || selectedApartments.length === 0) {
            setFeedback({type: 'error', text: 'Por favor, completa asunto, cuerpo y destinatarios.'});
            return;
        }
        setIsSending(true);
        setFeedback(null);
        
        try {
            const attachmentLinks = attachments.map(file => ({ name: file.name, url: file.url }));

            if (scheduleMode !== 'now') {
                if (!scheduledAt) throw new Error('Selecciona la fecha y hora de inicio.');
                const { data: campaign, error: campaignError } = await apiService.createCommunicationCampaign({
                    conjuntoId: conjuntoInfo.id,
                    createdBy: userProfile.id,
                    title: subject,
                    body,
                    channel: 'email',
                    audience: recipientSelection.audience,
                    apartments: selectedApartments,
                    emails: recipients,
                    emailsByApartment: recipientSelection.emailsByApartment,
                    attachments: attachmentLinks,
                    scheduledAt: new Date(scheduledAt).toISOString(),
                    recurrence: scheduleMode === 'once' ? 'none' : scheduleMode,
                });
                if (campaignError) throw campaignError;
                setFeedback({type: 'success', text: `Comunicación programada${campaign ? '.' : '.'}`});
                setSubject('');
                setBody('');
                setRecipients([]);
                setSelectedApartments([]);
                setRecipientSelection({ audience: 'manual', apartments: [], emails: [], emailsByApartment: {} });
                setAttachments([]);
                setScheduledAt('');
                setScheduleMode('now');
                return;
            }

            const result = await apiService.sendCommunicationEmail(recipients, subject, body, attachmentLinks, conjuntoInfo.adminName, conjuntoInfo.adminEmail);
            
            if (result.success) {
                setFeedback({type: 'success', text: `¡Correo enviado exitosamente a ${recipients.length} destinatario(s)!`});
                setSubject('');
                setBody('');
                setRecipients([]);
                setSelectedApartments([]);
                setRecipientSelection({ audience: 'manual', apartments: [], emails: [], emailsByApartment: {} });
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
                <form id="form-comunicaciones" onSubmit={handleSend} className="space-y-4">
                    <div>
                        <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-2">Destinatarios</label>
                        <button type="button" onClick={() => setIsRecipientModalOpen(true)} className="flex w-full items-center justify-between rounded-md border border-gray-300 p-3 text-left hover:border-blue-500">
                            <span className={selectedApartments.length ? 'text-gray-900' : 'text-gray-500'}>{selectedApartments.length ? `${selectedApartments.length} apartamento(s) seleccionados · ${recipients.length} correo(s)` : 'Seleccionar unidades o apartamentos'}</span>
                            <Icon name="users" className="h-5 w-5 text-blue-600" />
                        </button>
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
                    <div className="rounded-md border border-gray-200 bg-gray-50 p-4">
                        <label className="block text-sm font-medium text-gray-700">Programación</label>
                        <div className="mt-2 grid gap-3 sm:grid-cols-2">
                            <select value={scheduleMode} onChange={event => setScheduleMode(event.target.value as typeof scheduleMode)} className="rounded border border-gray-300 bg-white p-2 text-sm">
                                <option value="now">Enviar ahora</option>
                                <option value="once">Programar una vez</option>
                                <option value="weekly">Repetir semanalmente</option>
                                <option value="monthly">Repetir mensualmente</option>
                            </select>
                            {scheduleMode !== 'now' && <input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="rounded border border-gray-300 bg-white p-2 text-sm" required />}
                        </div>
                        {scheduleMode !== 'now' && <p className="mt-2 text-xs text-gray-500">Los destinatarios se recalcularán en cada ejecución según la segmentación elegida.</p>}
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
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Enlaces Adjuntos
                                </label>
                                <div className="space-y-2">
                                    {attachments.map((attachment, index) => (
                                        <div key={index} 
                                             className="flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-md">
                                            <Icon name="drive" className="w-4 h-4 text-blue-600" />
                                            <div className="flex-1">
                                                <p className="font-medium text-gray-800">{attachment.name}</p>
                                                <p className="text-xs text-gray-500 break-all">{attachment.url}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(index)}
                                                className="text-red-500 hover:text-red-700 p-1">
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
                            onClick={() => setIsDriveLinkInputOpen(true)}
                            className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300 flex items-center gap-2"
                        >
                            <Icon name="drive" className="w-5 h-5" />
                            Adjuntar desde Google Drive
                        </button>

                        <button
                            type="submit"
                            disabled={isSending || isGenerating}
                            className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2"
                        >
                            <Icon name="send" className="w-5 h-5" />
                            {isSending ? 'Enviando...' : scheduleMode === 'now' ? `Enviar a ${recipients.length} destinatarios` : 'Guardar programación'}
                        </button>
                    </div>
{feedback && (
                        <p className={`text-sm mt-4 text-center ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                            {feedback.text}
                        </p>
                    )}
                </form>
            </div>
            <CommunicationRecipientModal conjuntoId={conjuntoInfo.id} open={isRecipientModalOpen} initialSelection={recipientSelection} onClose={() => setIsRecipientModalOpen(false)} onConfirm={selection => { setRecipientSelection(selection); setSelectedApartments(selection.apartments); setRecipients(selection.emails); setIsRecipientModalOpen(false); }} />
             {isDriveLinkInputOpen && (
                <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={() => setIsDriveLinkInputOpen(false)}>
                    <div className="bg-white rounded-lg shadow-2xl w-11/12 md:w-2/3 lg:w-1/2 relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
                        <header className="p-6 border-b border-gray-200">
                            <button onClick={() => setIsDriveLinkInputOpen(false)} 
                                    className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
                                <Icon name="x" className="w-6 h-6" />
                            </button>
                            <h2 className="text-2xl font-bold text-gray-800">Adjuntar desde Google Drive</h2>
                            <p className="text-sm text-gray-600">Pegue el enlace público de un archivo o carpeta de Google Drive</p>
                        </header>
                        <div className="p-6 flex-1 overflow-y-auto">
                            <div className="space-y-4">
                                <div className="rounded-md border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-800">
                                    Asegúrate de que este archivo o carpeta en Google Drive tenga los permisos configurados como "Cualquier persona con el enlace puede ver" para evitar problemas de acceso con los residentes.
                                </div>
                                <div className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md focus-within:ring-2 focus-within:ring-blue-500">
                                    <Icon name="drive" className="w-5 h-5 text-gray-400" />
                                    <input
                                        type="text"
                                        value={driveLink}
                                        onChange={(e) => {
                                            setDriveLink(e.target.value);
                                            setDriveLinkError(null);
                                        }}
                                        placeholder="https://drive.google.com/file/d/FILE_ID/view o https://drive.google.com/folders/FOLDER_ID"
                                        className="flex-1 bg-transparent focus:outline-none p-0 text-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleAddDriveLink}
                                        disabled={isSending || isGenerating}
                                        className="px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400">
                                        Añadir Enlace
                                    </button>
                                </div>
                                {driveLinkError && (
                                    <p className="text-red-500 text-sm">{driveLinkError}</p>
                                )}
                                {driveLink && isGoogleDriveFileUrl(driveLink) && (
                                    <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
                                        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-600">Vista previa</p>
                                        <iframe
                                            src={getGoogleDrivePreviewUrl(driveLink)}
                                            className="h-64 w-full rounded border border-gray-200"
                                            title="Vista previa de archivo de Google Drive"
                                            allow="autoplay"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                        <footer className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4">
                            <button type="button" onClick={() => setIsDriveLinkInputOpen(false)} 
                                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
                                Cancelar
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ComunicacionesView;
