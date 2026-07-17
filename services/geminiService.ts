import { GoogleGenAI, Chat, GenerateContentResponse, FunctionCall } from "@google/genai";
import { apiService } from './apiService';
// FIX: Added missing types to ensure proper casting and type safety.
import { UserProfile, ConjuntoInfo, Income, Expense, VisitorLog, Resident, Provider, PackageLog, InternalStaff } from "../types";
import { geminiTools } from './geminiTools';

interface ChatHistoryEntry {
    role: 'user' | 'model';
    text: string;
}

let aiPromise: Promise<GoogleGenAI> | null = null;
let chat: Chat | null = null;
let currentConjuntoId: string | null = null;
let systemPromptTemplate: string | null = null;
let conversationHistory: ChatHistoryEntry[] = [];

const MAX_HISTORY_LENGTH = 50;

const model = 'gemini-3-flash-preview';

const getAiClient = (): Promise<GoogleGenAI> => {
    if (!aiPromise) {
        aiPromise = new Promise((resolve, reject) => {
            let apiKey: string | undefined;
            
            // Try different possible environment variable names
            // In this environment, process.env.GEMINI_API_KEY is the standard.
            // We also check VITE_ prefix for client-side exposure if configured.
            if (typeof process !== 'undefined' && process.env) {
                apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
            }
            
            if (!apiKey) {
                try {
                    // @ts-ignore
                    if (import.meta.env) {
                        // @ts-ignore
                        apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
                    }
                } catch (e) { /* Silently fail */ }
            }

            if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
                return reject(new Error("La API Key de Gemini no está configurada o es inválida. Por favor, configúrala en los ajustes de la plataforma."));
            }

            const ai = new GoogleGenAI({ apiKey: apiKey });
            resolve(ai);
        });
    }
    return aiPromise;
};

const getSystemPrompt = async (userProfile: UserProfile, conjuntoInfo: ConjuntoInfo): Promise<string> => {
    if (!systemPromptTemplate) {
        try {
            const response = await fetch(`/src/prompts/system_prompt.txt?v=${new Date().getTime()}`);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            systemPromptTemplate = await response.text();
        } catch (error) {
            console.error("Failed to fetch system prompt:", error);
            // Fallback if fetch fails
            return `Eres un asistente útil para el conjunto ${conjuntoInfo?.name || 'residencial'}. El usuario es ${userProfile?.fullName || 'Administrador'}.`;
        }
    }
    
    if (!userProfile || !conjuntoInfo) {
        console.warn("getSystemPrompt called with missing profile or conjunto info");
        return systemPromptTemplate || "Eres un asistente útil.";
    }

    const formattedDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return (systemPromptTemplate || '')
        .replace(/{{userName}}/g, userProfile.fullName || 'Usuario')
        .replace(/{{conjuntoName}}/g, conjuntoInfo.name || 'Conjunto')
        .replace(/{{currentDate}}/g, formattedDate);
};

const initializeChat = async (userProfile: UserProfile, conjuntoInfo: ConjuntoInfo, initialAiMessage?: string) => {
    try {
        if (currentConjuntoId !== conjuntoInfo.id) {
            conversationHistory = [];
        }
        if (initialAiMessage && conversationHistory.length === 0) {
            conversationHistory.push({ role: 'model', text: initialAiMessage });
        }

        const aiClient = await getAiClient();
        const systemInstruction = await getSystemPrompt(userProfile, conjuntoInfo);
        const history = conversationHistory.length > 0
            ? conversationHistory.map(e => ({ role: e.role, parts: [{ text: e.text }] }))
            : undefined;

        chat = aiClient.chats.create({
            model: model,
            config: {
                systemInstruction,
                tools: geminiTools,
            },
            history: history,
        });
        (chat as any).userProfile = userProfile;
        (chat as any).conjuntoInfo = conjuntoInfo;
        currentConjuntoId = conjuntoInfo.id;
    } catch (error) {
        console.error("Failed to initialize chat:", error);
        chat = null;
    }
};

const runChat = async (prompt: string, userProfile: UserProfile | null, conjuntoInfo: ConjuntoInfo | null, initialAiMessage?: string): Promise<string> => {
    if (!userProfile || !conjuntoInfo) {
        return "No se ha podido inicializar el asistente. Falta información de usuario o conjunto.";
    }

    if (!chat || currentConjuntoId !== conjuntoInfo.id) {
        await initializeChat(userProfile, conjuntoInfo, initialAiMessage);
    }
    
    if (!chat) {
        return "Error al inicializar el chat. Inténtalo de nuevo.";
    }

    try {
        const response: GenerateContentResponse = await chat.sendMessage({ message: prompt });
        const functionCalls = response.functionCalls;

        let finalResponse: string;
        if (functionCalls && functionCalls.length > 0) {
            console.log("Gemini requested function calls:", functionCalls);
            finalResponse = await processFunctionCalls(functionCalls);
        } else if (!response.text) {
            console.warn("Gemini returned an empty response.");
            finalResponse = "Recibí una respuesta vacía del asistente. Por favor, intenta de nuevo.";
        } else {
            finalResponse = response.text;
        }

        conversationHistory.push({ role: 'user', text: prompt });
        conversationHistory.push({ role: 'model', text: finalResponse });
        if (conversationHistory.length > MAX_HISTORY_LENGTH) {
            conversationHistory = conversationHistory.slice(-MAX_HISTORY_LENGTH);
        }

        return finalResponse;
    } catch (error: any) {
        console.error("Error during chat execution:", error);
        if (error.message?.includes('API_KEY_INVALID')) {
            return "La API Key de Gemini parece ser inválida. Por favor, revísala en la configuración.";
        }
        return `Lo siento, tuve un problema al procesar tu solicitud: ${error.message || 'Error desconocido'}`;
    }
};

const MUTATION_FUNCTIONS = new Set([
    'addResident', 'updateResident', 'deleteResident',
    'addProvider', 'updateProvider', 'deleteProvider',
    'addInternalStaff', 'updateInternalStaff', 'deleteInternalStaff',
    'createReservation',
    'addIncome', 'addExpense',
    'authorizeVisitor', 'updateVisitorStatus', 'registerPackage',
    'sendMassEmail',
]);

const processFunctionCalls = async (functionCalls: FunctionCall[], depth = 0): Promise<string> => {
    if (depth > 5) return "Se alcanzó el límite de operaciones encadenadas. Por favor, continúa con tu solicitud.";

    if (!functionCalls || functionCalls.length === 0) {
        return "No se recibieron instrucciones claras del asistente.";
    }

    const call = functionCalls[0];
    const { name, args } = call;
    console.log(`Executing function call: ${name}`, args);

    if (!currentConjuntoId) {
        console.error("Context error: currentConjuntoId is missing in processFunctionCalls");
        return "Error de contexto: no se pudo determinar el conjunto actual.";
    }

    let resultText: string;
    let isMutation = false;

    try {
        apiService.logChatbotInteraction(currentConjuntoId).catch(e => console.warn("Failed to log interaction:", e));

        switch (name) {
            // --- Resident Management ---
            case 'addResident': {
                const residentArgs = args as unknown as Resident;
                if (!residentArgs || !residentArgs.apartment) throw new Error("Faltan datos del residente (apartamento).");
                await apiService.addResident(currentConjuntoId, residentArgs);
                resultText = `Residente para el apto ${residentArgs.apartment} agregado exitosamente.`;
                break;
            }
            case 'updateResident': {
                const { apartment, data } = args as unknown as { apartment: string, data: Partial<Resident> };
                if (!apartment) throw new Error("Falta el número de apartamento.");
                const existingResident = await apiService.fetchResidentByApartment(currentConjuntoId, apartment);
                if (!existingResident) throw new Error(`No se encontró un residente en el apartamento ${apartment}.`);
                await apiService.updateResident(currentConjuntoId, { ...existingResident, ...data });
                resultText = `Información del residente del apto ${apartment} actualizada.`;
                break;
            }
            case 'deleteResident': {
                const { apartment } = args as unknown as { apartment: string };
                if (!apartment) throw new Error("Falta el número de apartamento.");
                await apiService.deleteResident(currentConjuntoId, apartment);
                resultText = `Residente del apto ${apartment} eliminado.`;
                break;
            }

            // --- Provider Management ---
            case 'addProvider': {
                const providerArgs = args as unknown as Omit<Provider, 'id'>;
                if (!providerArgs || !providerArgs.company) throw new Error("Faltan datos del proveedor (empresa).");
                await apiService.addProvider(currentConjuntoId, providerArgs);
                resultText = `Proveedor ${providerArgs.company} agregado exitosamente.`;
                break;
            }
            case 'updateProvider': {
                const { company, data } = args as unknown as { company: string, data: Partial<Provider> };
                if (!company) throw new Error("Falta el nombre de la empresa.");
                const providers = await apiService.fetchProviders(currentConjuntoId);
                const matchingProviders = providers.filter(p => p.company.toLowerCase() === company.toLowerCase());
                if (matchingProviders.length === 0) throw new Error(`No se encontró un proveedor con el nombre "${company}".`);
                if (matchingProviders.length > 1) { resultText = `Encontré varios proveedores con el nombre "${company}". Por favor, sé más específico.`; break; }
                const providerToUpdate = matchingProviders[0];
                await apiService.updateProvider(currentConjuntoId, { ...providerToUpdate, ...data });
                resultText = `Información del proveedor ${company} actualizada.`;
                break;
            }
            case 'deleteProvider': {
                const { company } = args as unknown as { company: string };
                if (!company) throw new Error("Falta el nombre de la empresa.");
                const providers = await apiService.fetchProviders(currentConjuntoId);
                const matchingProviders = providers.filter(p => p.company.toLowerCase() === company.toLowerCase());
                if (matchingProviders.length === 0) throw new Error(`No se encontró un proveedor con el nombre "${company}".`);
                if (matchingProviders.length > 1) { resultText = `Encontré varios proveedores con el nombre "${company}". Por favor, sé más específico.`; break; }
                const providerToDelete = matchingProviders[0];
                await apiService.deleteProvider(currentConjuntoId, providerToDelete.id);
                resultText = `Proveedor ${company} eliminado.`;
                break;
            }

            // --- Internal Staff Management ---
            case 'addInternalStaff': {
                const staffArgs = args as unknown as InternalStaff;
                if (!staffArgs || !staffArgs.name) throw new Error("Faltan datos del personal (nombre).");
                await apiService.addInternalStaff(currentConjuntoId, staffArgs);
                resultText = `Miembro del personal ${staffArgs.name} agregado exitosamente.`;
                break;
            }
            case 'updateInternalStaff': {
                const { name, data } = args as unknown as { name: string, data: Partial<InternalStaff> };
                if (!name) throw new Error("Falta el nombre de la persona.");
                const staffList = await apiService.fetchInternalStaff(currentConjuntoId);
                const matchingStaff = staffList.filter(s => s.name.toLowerCase() === name.toLowerCase());
                if (matchingStaff.length === 0) throw new Error(`No se encontró un miembro del personal llamado "${name}".`);
                if (matchingStaff.length > 1) { resultText = `Encontré varias personas llamadas "${name}". Por favor, proporciona más detalles.`; break; }
                const staffToUpdate = matchingStaff[0];
                await apiService.updateInternalStaff(currentConjuntoId, { ...staffToUpdate, ...data } as InternalStaff);
                resultText = `Información de ${name} actualizada.`;
                break;
            }
            case 'deleteInternalStaff': {
                const { name } = args as unknown as { name: string };
                if (!name) throw new Error("Falta el nombre de la persona.");
                const staffList = await apiService.fetchInternalStaff(currentConjuntoId);
                const matchingStaff = staffList.filter(s => s.name.toLowerCase() === name.toLowerCase());
                if (matchingStaff.length === 0) throw new Error(`No se encontró un miembro del personal llamado "${name}".`);
                if (matchingStaff.length > 1) { resultText = `Encontré varias personas llamadas "${name}". Por favor, proporciona más detalles.`; break; }
                await apiService.deleteInternalStaff(currentConjuntoId, name);
                resultText = `Miembro del personal ${name} eliminado.`;
                break;
            }

            case 'createReservation': {
                const reservationArgs = args as unknown as { commonAreaName: string; apartment: string; date: string; startTime: string; endTime: string; };
                if (!reservationArgs.commonAreaName || !reservationArgs.apartment || !reservationArgs.date) {
                    throw new Error("Faltan datos para crear la reserva (área, apartamento o fecha).");
                }
                await apiService.createReservationFromChat(currentConjuntoId, reservationArgs);
                resultText = `Reserva del área ${reservationArgs.commonAreaName} para el Apto ${reservationArgs.apartment} el ${reservationArgs.date} registrada exitosamente.`;
                break;
            }
            
            case 'queryDatabase': {
                const { table, query_description } = args as unknown as { table: string, query_description: string };
                const aptMatch = query_description.match(/\d+/);
                const apt = aptMatch ? aptMatch[0] : null;

                if (table === 'account_status' && apt) {
                    const account = await apiService.fetchAccountStatusByApartment(currentConjuntoId, apt);
                    resultText = account
                        ? `El saldo pendiente del Apto ${apt} es de $${account.outstandingBalance.toLocaleString()}. Último pago: ${account.lastPaymentDate}.`
                        : `No encontré información para el Apto ${apt}.`;
                    break;
                }
                if (table === 'residents' && apt) {
                    const resident = await apiService.fetchResidentByApartment(currentConjuntoId, apt);
                    resultText = resident
                        ? `Residente del Apto ${apt}: Nombre: ${resident.name}, Email: ${resident.email}, Teléfono: ${resident.phone}`
                        : `No encontré un residente para el Apto ${apt}.`;
                    break;
                }
                resultText = `No pude procesar la consulta: "${query_description}". Intenta de nuevo.`;
                break;
            }

            case 'queryDebtors': {
                const debtors = await apiService.fetchDebtors(currentConjuntoId);
                if (debtors.length === 0) {
                    resultText = "No hay residentes en mora en este momento.";
                } else {
                    const debtorsList = debtors.map(d => `Apto ${d.apartment} (${d.name}): $${d.balance.toLocaleString('es-CO')}`).join('\n');
                    resultText = `Residentes en mora:\n${debtorsList}`;
                }
                break;
            }

            case 'queryProviders': {
                const { specialty } = args as unknown as { specialty?: string };
                const providers = await apiService.fetchProvidersBySpecialty(currentConjuntoId, specialty || '');
                if (providers.length === 0) {
                    resultText = specialty
                        ? `No encontré proveedores con la especialidad "${specialty}".`
                        : `No hay proveedores registrados.`;
                } else {
                    const providersList = providers.map(p => `${p.company} (${p.specialty}) - Contacto: ${p.phone || 'N/A'}, ${p.email || 'N/A'}`).join('\n');
                    resultText = `Proveedores encontrados:\n${providersList}`;
                }
                break;
            }
            
            case 'sendMassEmail': {
                const { group, subject, body } = args as unknown as { group: string, subject: string, body: string };
                if (!group || !subject || !body) throw new Error("Faltan datos para enviar el correo masivo.");
                const result = await apiService.sendMassEmail(currentConjuntoId, group, subject, body);
                resultText = result.message;
                break;
            }

            case 'addIncome': {
                const incomeArgs = args as unknown as Omit<Income, 'id'>;
                if (!incomeArgs.amount || !incomeArgs.description) throw new Error("Faltan datos del ingreso (monto o descripción).");
                await apiService.addIncome(currentConjuntoId, incomeArgs);
                resultText = `Ingreso de $${incomeArgs.amount.toLocaleString()} por "${incomeArgs.description}" agregado.`;
                break;
            }
            
            case 'addExpense': {
                const expenseArgs = args as unknown as Omit<Expense, 'id'>;
                if (!expenseArgs.amount || !expenseArgs.description) throw new Error("Faltan datos del gasto (monto o descripción).");
                await apiService.addExpense(currentConjuntoId, expenseArgs);
                resultText = `Gasto de $${expenseArgs.amount.toLocaleString()} por "${expenseArgs.description}" agregado.`;
                break;
            }
            
            case 'authorizeVisitor': {
                const visitorArgs = args as unknown as { visitorName: string, apartment: string, date: string };
                if (!visitorArgs.visitorName || !visitorArgs.apartment) throw new Error("Faltan datos del visitante.");
                await apiService.addVisitorLog(currentConjuntoId, {...visitorArgs, status: 'Autorizado'});
                resultText = `Visitante "${visitorArgs.visitorName}" autorizado para el Apto ${visitorArgs.apartment}.`;
                break;
            }
            
            case 'registerPackage': {
                const packageArgs = args as unknown as Partial<PackageLog>;
                if (!packageArgs.apartment || !packageArgs.courier) throw new Error("Faltan datos del paquete.");
                await apiService.addPackageLog(currentConjuntoId, packageArgs);
                resultText = `Paquete de "${packageArgs.courier}" para el Apto ${packageArgs.apartment} registrado.`;
                break;
            }
           
            case 'updateVisitorStatus': {
                const { logId, status } = args as unknown as { logId: number, status: string };
                if (!logId || !status) throw new Error("Faltan datos para actualizar el estado del visitante.");
                const newStatus = status as VisitorLog['status'];
                if (!['Autorizado', 'Ingresó', 'Salió'].includes(newStatus)) {
                    resultText = `El estado "${newStatus}" no es válido. Estados permitidos: Autorizado, Ingresó, Salió.`;
                    break;
                }
                await apiService.updateVisitorLog(currentConjuntoId, logId, { status: newStatus });
                resultText = `Estado del visitante actualizado a "${status}".`;
                break;
            }

            default:
                resultText = `No entendí la acción: ${name}.`;
                break;
        }

        isMutation = MUTATION_FUNCTIONS.has(name);

    } catch (error: any) {
        console.error(`Error executing function ${name}:`, error);
        resultText = `Error al ejecutar ${name}: ${error.message || 'Error desconocido'}`;
    }

    if (isMutation) {
        try { window.dispatchEvent(new CustomEvent('data-changed')); } catch {}
    }

    if (chat) {
        try {
            const response = await chat.sendMessage({ message: resultText });
            if (response.functionCalls && response.functionCalls.length > 0) {
                return await processFunctionCalls(response.functionCalls, depth + 1);
            }
            return response.text || resultText;
        } catch (error) {
            console.error("Error sending function result to Gemini:", error);
            return resultText;
        }
    }

    return resultText;
};

const generateSubject = async (body: string): Promise<string> => {
    try {
        const ai = await getAiClient();
        const prompt = `Genera un asunto corto y profesional para el siguiente correo electrónico:\n\n"${body}"\n\nAsunto:`;
        const response = await ai.models.generateContent({ model, contents: prompt });
        if (!response.text) throw new Error("Empty response from Gemini");
        return response.text.trim();
    } catch (error: any) {
        console.error("Error generating subject:", error);
        return "Asunto no disponible (Error: " + (error.message || "desconocido") + ")";
    }
};

const improveWriting = async (body: string): Promise<string> => {
    try {
        const ai = await getAiClient();
        const prompt = `Mejora la redacción del siguiente texto para que sea más claro, profesional y conciso, manteniendo el tono original. No agregues saludos ni despedidas, solo mejora el texto proporcionado:\n\n"${body}"`;
        const response = await ai.models.generateContent({ model, contents: prompt });
        if (!response.text) throw new Error("Empty response from Gemini");
        return response.text.trim();
    } catch (error: any) {
        console.error("Error improving writing:", error);
        return body; // Return original body on error
    }
};

const resetSession = () => {
    chat = null;
    conversationHistory = [];
};

export const geminiService = {
    runChat,
    generateSubject,
    improveWriting,
    resetSession,
};
