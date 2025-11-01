import React, { useState } from 'react';
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
    const [recipients, setRecipients] = useState('all');
    const [isSending, setIsSending] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
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

    const handleSend = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!subject.trim() || !body.trim() || !userProfile.conjuntoId) {
            setFeedback({type: 'error', text: 'Por favor, completa el asunto, el cuerpo del mensaje y asegúrate de que el conjunto esté identificado.'});
            return;
        }
        setIsSending(true);
        setFeedback(null);
        
        try {
            // 1. Fetch emails based on recipient group
            let emailList: string[] = [];
            if (recipients === 'all') {
                const residents = await apiService.fetchResidents(userProfile.conjuntoId);
                emailList = residents.map(r => r.email).filter(Boolean);
            } else if (recipients === 'debtors') {
                const accounts = await apiService.fetchAccountStatus(userProfile.conjuntoId);
                const debtorApartments = accounts.filter(a => a.outstandingBalance > 0).map(a => a.apartment);
                const residents = await apiService.fetchResidents(userProfile.conjuntoId);
                emailList = residents.filter(r => debtorApartments.includes(r.apartment)).map(r => r.email).filter(Boolean);
            }

            if (emailList.length === 0) {
                setFeedback({type: 'error', text: 'No se encontraron destinatarios para el grupo seleccionado.'});
                setIsSending(false);
                return;
            }

            // 2. Call the Edge Function via apiService
            const result = await apiService.sendCommunicationEmail(emailList, subject, body);
            
            if (result.success) {
                setFeedback({type: 'success', text: `¡Comunicado enviado a ${emailList.length} destinatario(s)!`});
                setSubject('');
                setBody('');
            } else {
                throw new Error(result.error || 'Ocurrió un error desconocido.');
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
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Enviar Comunicaciones</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-md">
                    <form onSubmit={handleSend} className="space-y-4">
                        <div>
                            <label htmlFor="recipients" className="block text-sm font-medium text-gray-700 mb-1">Destinatarios</label>
                            <select
                                id="recipients"
                                value={recipients}
                                onChange={(e) => setRecipients(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md bg-white"
                            >
                                <option value="all">Todos los Residentes</option>
                                <option value="debtors">Residentes en Mora</option>
                                <option value="group">Grupo específico (próximamente)</option>
                            </select>
                        </div>
                        <div>
                            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Asunto</label>
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
                            <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-1">Cuerpo del Mensaje</label>
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
                                {isSending ? 'Enviando...' : 'Enviar Comunicado'}
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
                        <h3 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
                            <Icon name="bot" className="w-6 h-6 text-blue-600" />
                            Asistente de IA
                        </h3>
                        <p className="text-sm text-gray-600 mb-4">
                            Usa la IA para mejorar tus comunicados con un solo clic.
                        </p>
                        <div className="space-y-3">
                            <button
                                onClick={handleGenerateSubject}
                                disabled={isGenerating || !body.trim()}
                                className="w-full px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 disabled:opacity-50"
                            >
                                {isGenerating ? 'Generando...' : 'Generar Asunto'}
                            </button>
                            <button
                                onClick={handleImproveWriting}
                                disabled={isGenerating || !body.trim()}
                                className="w-full px-4 py-2 bg-blue-100 text-blue-700 font-semibold rounded-lg hover:bg-blue-200 disabled:opacity-50"
                            >
                                {isGenerating ? 'Mejorando...' : 'Mejorar Redacción'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComunicacionesView;