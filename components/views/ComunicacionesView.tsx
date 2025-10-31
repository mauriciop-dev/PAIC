import React, { useState, useEffect, useMemo } from 'react';
import { apiService } from '../../services/apiService';
import { geminiService } from '../../services/geminiService';
import { AccountStatus, Resident, InternalStaff } from '../../types';
import { Icon } from '../ui/Icon';

type TargetAudience = 'all' | 'in_debt' | 'up_to_date';

const ComunicacionesView: React.FC = () => {
    const [target, setTarget] = useState<TargetAudience>('all');
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [additionalEmails, setAdditionalEmails] = useState('');
    const [copyToAdmin, setCopyToAdmin] = useState(false);
    const [copyToAccountant, setCopyToAccountant] = useState(false);
    
    const [residents, setResidents] = useState<Resident[]>([]);
    const [accounts, setAccounts] = useState<AccountStatus[]>([]);
    const [internalStaff, setInternalStaff] = useState<InternalStaff[]>([]);
    
    const [isSubjectLoading, setIsSubjectLoading] = useState(false);
    const [isBodyLoading, setIsBodyLoading] = useState(false);
    const [isSending, setIsSending] = useState(false);
    
    const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

    useEffect(() => {
        const fetchData = async () => {
            const [fetchedResidents, fetchedAccounts, fetchedStaff] = await Promise.all([
                apiService.fetchResidents(),
                apiService.fetchAccountStatus(),
                apiService.fetchInternalStaff(),
            ]);
            setResidents(fetchedResidents);
            setAccounts(fetchedAccounts);
            setInternalStaff(fetchedStaff);
        };
        fetchData();
    }, []);

    const audienceCounts = useMemo(() => {
        const inDebtApts = new Set(accounts.filter(a => a.outstandingBalance > 0).map(a => a.apartment));
        return {
            all: residents.length,
            in_debt: inDebtApts.size,
            up_to_date: residents.length - inDebtApts.size,
        };
    }, [residents, accounts]);

    const { admin, accountant } = useMemo(() => {
        const admin = internalStaff.find(s => s.position.toLowerCase() === 'administrador');
        const accountant = internalStaff.find(s => s.position.toLowerCase() === 'contadora');
        return { admin, accountant };
    }, [internalStaff]);

    const handleSuggestSubject = async () => {
        if (!body.trim()) {
            alert('Por favor, escribe primero el cuerpo del mensaje.');
            return;
        }
        setIsSubjectLoading(true);
        try {
            const suggestedSubject = await geminiService.generateSubject(body);
            setSubject(suggestedSubject);
        } catch (error) {
            console.error(error);
            alert('No se pudo sugerir un asunto.');
        } finally {
            setIsSubjectLoading(false);
        }
    };
    
    const handleImproveWriting = async () => {
        if (!body.trim()) {
            alert('Por favor, escribe primero el cuerpo del mensaje.');
            return;
        }
        setIsBodyLoading(true);
        try {
            const improvedBody = await geminiService.improveWriting(body);
            setBody(improvedBody);
        } catch (error) {
            console.error(error);
            alert('No se pudo mejorar la redacción.');
        } finally {
            setIsBodyLoading(false);
        }
    };

    const handleSend = () => {
        if (!subject.trim() || !body.trim()) {
            alert('Por favor, completa el asunto y el cuerpo del mensaje.');
            return;
        }
        setIsSending(true);
        setFeedbackMessage(null);

        const additionalRecipients = [];
        if (copyToAdmin && admin) additionalRecipients.push('Administrador');
        if (copyToAccountant && accountant) additionalRecipients.push('Contadora');
        if (additionalEmails.trim()) {
            const emailCount = additionalEmails.split(',').filter(e => e.trim()).length;
            if (emailCount > 0) {
                additionalRecipients.push(`${emailCount} correo(s) adicional(es)`);
            }
        }
        
        let feedbackExtra = '';
        if (additionalRecipients.length > 0) {
            feedbackExtra = ` e incluido a: ${additionalRecipients.join(', ')}`;
        }

        setTimeout(() => {
            const count = audienceCounts[target];
            setFeedbackMessage(`¡Comunicación enviada exitosamente a ${count} residente(s)${feedbackExtra}!`);
            setIsSending(false);
            setSubject('');
            setBody('');
            setAdditionalEmails('');
            setCopyToAdmin(false);
            setCopyToAccountant(false);
            setTimeout(() => setFeedbackMessage(null), 7000);
        }, 1500);
    };

    const targetOptions: { id: TargetAudience; label: string }[] = [
        { id: 'all', label: 'Todos los residentes' },
        { id: 'in_debt', label: 'Residentes en mora' },
        { id: 'up_to_date', label: 'Residentes al día' },
    ];

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Enviar Comunicaciones</h2>
            <p className="text-gray-600 mb-6">
                Redacta y envía mensajes a los residentes. Usa la IA para mejorar tus comunicados.
            </p>

            <div className="bg-white p-6 rounded-lg shadow-md">
                <div className="space-y-6">
                    {/* Target Audience */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Paso 1: Elige los destinatarios</label>
                        <div className="flex flex-wrap gap-3">
                            {targetOptions.map(option => (
                                <button
                                    key={option.id}
                                    onClick={() => setTarget(option.id)}
                                    className={`px-4 py-2 text-sm font-semibold rounded-full flex items-center gap-2 transition-colors ${
                                        target === option.id 
                                        ? 'bg-blue-600 text-white shadow-md' 
                                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                                >
                                    {option.label}
                                    <span className={`px-2 py-0.5 rounded-full text-xs ${
                                        target === option.id ? 'bg-white text-blue-600' : 'bg-gray-300 text-gray-800'
                                    }`}>{audienceCounts[option.id]}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                    
                    {/* Additional Recipients */}
                    <div>
                        <label htmlFor="additional-emails" className="block text-sm font-medium text-gray-700 mb-2">Paso 1.5: Destinatarios Adicionales (Opcional)</label>
                        <input
                            id="additional-emails"
                            type="email"
                            placeholder="ej: correo1@ejemplo.com, correo2@ejemplo.com"
                            value={additionalEmails}
                            onChange={(e) => setAdditionalEmails(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                        <p className="text-xs text-gray-500 mt-1">Separa múltiples correos con comas.</p>
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3">
                            {admin && (
                                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={copyToAdmin}
                                        onChange={(e) => setCopyToAdmin(e.target.checked)}
                                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2">Incluir al Administrador</span>
                                </label>
                            )}
                            {accountant && (
                                <label className="flex items-center text-sm text-gray-600 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={copyToAccountant}
                                        onChange={(e) => setCopyToAccountant(e.target.checked)}
                                        className="h-4 w-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300"
                                    />
                                    <span className="ml-2">Incluir a la Contadora</span>
                                </label>
                            )}
                        </div>
                    </div>

                    {/* Subject */}
                    <div>
                        <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">Paso 2: Escribe el asunto</label>
                         <div className="flex items-center gap-2">
                            <input
                                id="subject"
                                type="text"
                                placeholder="Asunto del comunicado"
                                value={subject}
                                onChange={(e) => setSubject(e.target.value)}
                                className="flex-1 p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                            <button 
                                onClick={handleSuggestSubject}
                                disabled={isSubjectLoading}
                                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Icon name="bot" className="w-4 h-4" />
                                {isSubjectLoading ? 'Sugiriendo...' : 'Sugerir Asunto (IA)'}
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div>
                        <label htmlFor="body" className="block text-sm font-medium text-gray-700 mb-2">Paso 3: Redacta el mensaje</label>
                        <div className="relative">
                            <textarea
                                id="body"
                                placeholder="Escribe aquí tu mensaje..."
                                value={body}
                                onChange={(e) => setBody(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none min-h-[150px]"
                                rows={8}
                                disabled={isBodyLoading}
                            />
                             {isBodyLoading && (
                                <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center rounded-md">
                                    <p className="text-indigo-700 font-semibold">Mejorando texto...</p>
                                </div>
                            )}
                        </div>
                        <div className="mt-2 flex justify-end">
                             <button
                                onClick={handleImproveWriting}
                                disabled={isBodyLoading}
                                className="px-3 py-2 bg-indigo-100 text-indigo-700 rounded-lg font-semibold hover:bg-indigo-200 transition-colors text-sm flex items-center gap-1.5 disabled:opacity-50"
                            >
                                <Icon name="bot" className="w-4 h-4" />
                                {isBodyLoading ? 'Procesando...' : 'Mejorar Redacción (IA)'}
                            </button>
                        </div>
                    </div>
                    
                    {/* Send Button */}
                    <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                         <button 
                            onClick={handleSend}
                            disabled={isSending}
                            className="px-6 py-3 w-full sm:w-auto bg-green-600 text-white rounded-lg font-bold hover:bg-green-700 transition-colors shadow-lg text-base disabled:bg-green-300"
                        >
                            {isSending ? 'Enviando...' : 'Enviar Comunicado'}
                        </button>
                         {feedbackMessage && (
                            <p className="text-sm text-green-700 font-semibold text-center sm:text-right flex-1">
                                {feedbackMessage}
                            </p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ComunicacionesView;