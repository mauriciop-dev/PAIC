
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
            {/* Header banner */}
            <div className="bg-gradient-to-r from-blue-700 to-indigo-800 text-white p-5 rounded-2xl shadow-lg flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
                        <Icon name="send" className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">Centro de Comunicaciones</h2>
                        <p className="text-xs text-blue-100 mt-0.5">Redacta y envía comunicados a residentes, proveedores y personal interno.</p>
                    </div>
                </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
                <form id="form-comunicaciones" onSubmit={handleSend} className="space-y-5">
                    {/* Destinatarios */}
                    <div>
                        <label htmlFor="recipients" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">Destinatarios</label>
                        <button
                            type="button"
                            onClick={() => setIsRecipientModalOpen(true)}
                            className="flex w-full items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-3 text-left hover:border-blue-400 hover:bg-white transition-all"
                        >
                            <span className={selectedApartments.length ? 'text-gray-900 font-medium text-sm' : 'text-gray-400 text-sm'}>
                                {selectedApartments.length
                                    ? `${selectedApartments.length} apartamento(s) · ${recipients.length} correo(s)`
                                    : 'Seleccionar unidades o apartamentos…'}
                            </span>
                            <Icon name="users" className="h-5 w-5 text-blue-500" />
                        </button>
                    </div>

                    {/* Asunto */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="subject" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Asunto</label>
                            <button type="button" onClick={handleGenerateSubject} disabled={isGenerating || !body.trim()} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-40 transition-colors">
                                <Icon name="bot" className="w-3.5 h-3.5" /> Re-escribir con IA
                            </button>
                        </div>
                        <input
                            type="text"
                            id="subject"
                            value={subject}
                            onChange={(e) => setSubject(e.target.value)}
                            placeholder="Asunto del comunicado…"
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Programación */}
                    <div className="rounded-xl border border-gray-200 bg-gray-50/70 p-4">
                        <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-3">
                            <Icon name="calendar" className="w-3.5 h-3.5 inline mr-1" />
                            Programación de Envío
                        </label>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <select value={scheduleMode} onChange={event => setScheduleMode(event.target.value as typeof scheduleMode)} className="rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                                <option value="now">Enviar ahora</option>
                                <option value="once">Programar una vez</option>
                                <option value="weekly">Repetir semanalmente</option>
                                <option value="monthly">Repetir mensualmente</option>
                            </select>
                            {scheduleMode !== 'now' && (
                                <input type="datetime-local" value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} className="rounded-xl border border-gray-200 bg-white p-2.5 text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                            )}
                        </div>
                        {scheduleMode !== 'now' && <p className="mt-2 text-xs text-gray-500">Los destinatarios se recalcularán en cada ejecución según la segmentación elegida.</p>}
                    </div>

                    {/* Cuerpo del mensaje */}
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <label htmlFor="body" className="block text-xs font-semibold text-gray-700 uppercase tracking-wider">Cuerpo del Mensaje</label>
                            <button type="button" onClick={handleImproveWriting} disabled={isGenerating || !body.trim()} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 disabled:opacity-40 transition-colors">
                                <Icon name="bot" className="w-3.5 h-3.5" /> Mejorar redacción
                            </button>
                        </div>
                        <textarea
                            id="body"
                            value={body}
                            onChange={(e) => setBody(e.target.value)}
                            placeholder="Escribe tu mensaje aquí…"
                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm h-64 resize-none focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            required
                        />
                    </div>

                    {/* Adjuntos */}
                    {attachments.length > 0 && (
                        <div>
                            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                <Icon name="paperclip" className="w-3.5 h-3.5 inline mr-1" />
                                Archivos Adjuntos
                            </label>
                            <div className="space-y-2">
                                {attachments.map((attachment, index) => (
                                    <div key={index} className="flex items-center gap-3 px-3 py-2.5 bg-blue-50/60 border border-blue-100 rounded-xl">
                                        <Icon name="drive" className="w-4 h-4 text-blue-600 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-gray-800 text-sm truncate">{attachment.name}</p>
                                            <p className="text-xs text-gray-500 truncate">{attachment.url}</p>
                                        </div>
                                        <button type="button" onClick={() => removeAttachment(index)} className="p-1 text-gray-400 hover:text-red-500 rounded-lg transition-colors">
                                            <Icon name="x" className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Acciones */}
                    <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-2 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsDriveLinkInputOpen(true)}
                            className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-sm rounded-xl flex items-center justify-center gap-2 transition-colors"
                        >
                            <Icon name="drive" className="w-4 h-4" />
                            Adjuntar desde Drive
                        </button>
                        <button
                            type="submit"
                            disabled={isSending || isGenerating}
                            className="w-full sm:w-auto px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 disabled:bg-blue-300 flex items-center justify-center gap-2 transition-all"
                        >
                            <Icon name="send" className="w-4 h-4" />
                            {isSending ? 'Enviando…' : scheduleMode === 'now' ? `Enviar a ${recipients.length} destinatario(s)` : 'Guardar programación'}
                        </button>
                    </div>

                    {feedback && (
                        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${feedback.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                            <Icon name={feedback.type === 'success' ? 'check' : 'alert-triangle'} className="w-4 h-4 flex-shrink-0" />
                            <span>{feedback.text}</span>
                        </div>
                    )}
                </form>
            </div>

            <CommunicationRecipientModal
                conjuntoId={conjuntoInfo.id}
                open={isRecipientModalOpen}
                initialSelection={recipientSelection}
                onClose={() => setIsRecipientModalOpen(false)}
                onConfirm={selection => {
                    setRecipientSelection(selection);
                    setSelectedApartments(selection.apartments);
                    setRecipients(selection.emails);
                    setIsRecipientModalOpen(false);
                }}
            />

            {/* Modal Google Drive */}
            {isDriveLinkInputOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4" onClick={() => setIsDriveLinkInputOpen(false)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full md:w-2/3 lg:w-1/2 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                        <header className="p-6 border-b border-gray-100 flex items-start justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">Adjuntar desde Google Drive</h2>
                                <p className="text-sm text-gray-500 mt-0.5">Pega el enlace público de un archivo o carpeta</p>
                            </div>
                            <button onClick={() => setIsDriveLinkInputOpen(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-colors">
                                <Icon name="x" className="w-5 h-5" />
                            </button>
                        </header>
                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-800 flex items-start gap-2">
                                <Icon name="alert-triangle" className="w-4 h-4 flex-shrink-0 mt-0.5" />
                                <span>Asegúrate que el archivo tenga acceso "Cualquier persona con el enlace puede ver" para evitar problemas de acceso.</span>
                            </div>
                            <div className="flex items-center gap-2 px-3 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus-within:ring-2 focus-within:ring-blue-500 focus-within:bg-white transition-all">
                                <Icon name="drive" className="w-5 h-5 text-gray-400 flex-shrink-0" />
                                <input
                                    type="text"
                                    value={driveLink}
                                    onChange={(e) => { setDriveLink(e.target.value); setDriveLinkError(null); }}
                                    placeholder="https://drive.google.com/file/d/..."
                                    className="flex-1 bg-transparent focus:outline-none text-sm"
                                />
                                <button
                                    type="button"
                                    onClick={handleAddDriveLink}
                                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors">
                                    Añadir
                                </button>
                            </div>
                            {driveLinkError && <p className="text-xs text-red-600 font-medium">{driveLinkError}</p>}
                            {driveLink && isGoogleDriveFileUrl(driveLink) && (
                                <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
                                    <p className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500">Vista previa</p>
                                    <iframe src={getGoogleDrivePreviewUrl(driveLink)} className="h-64 w-full rounded-xl border border-gray-200" title="Vista previa" allow="autoplay" />
                                </div>
                            )}
                        </div>
                        <footer className="p-4 border-t border-gray-100 bg-gray-50/50 rounded-b-2xl flex justify-end">
                            <button type="button" onClick={() => setIsDriveLinkInputOpen(false)} className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold rounded-xl transition-colors">
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
