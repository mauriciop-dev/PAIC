import { GoogleGenAI, Chat, GenerateContentResponse, FunctionCall } from "@google/genai";
import { apiService } from './apiService';
// FIX: Added missing types to ensure proper casting and type safety.
import { UserProfile, ConjuntoInfo, Income, Expense, VisitorLog, Resident, Provider, PackageLog, InternalStaff } from "../types";
import { geminiTools } from './geminiTools';

let aiPromise: Promise<GoogleGenAI> | null = null;
let chat: Chat | null = null;
let currentConjuntoId: string | null = null;
let systemPromptTemplate: string | null = null;

const model = 'gemini-2.5-flash';

const getAiClient = (): Promise<GoogleGenAI> => {
    if (!aiPromise) {
        aiPromise = new Promise((resolve, reject) => {
            let apiKey: string | undefined;
            if (typeof process !== 'undefined' && process.env) {
                // @ts-ignore
                apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
            }
            if (!apiKey) {
                try {
                    // @ts-ignore
                    if (import.meta.env) {
                        // @ts-ignore
                        apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                    }
                } catch (e) { /* Silently fail */ }
            }
            if (!apiKey) {
                return reject(new Error("La variable de entorno de la API de Gemini no está configurada."));
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
            return `You are a helpful assistant for ${conjuntoInfo.name}. The user is ${userProfile.fullName}.`;
        }
    }
    const formattedDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    return (systemPromptTemplate || '')
        .replace(/{{userName}}/g, userProfile.fullName)
        .replace(/{{conjuntoName}}/g, conjuntoInfo.name)
        .replace(/{{currentDate}}/g, formattedDate);
};

const initializeChat = async (userProfile: UserProfile, conjuntoInfo: ConjuntoInfo, initialAiMessage?: string) => {
    try {
        const aiClient = await getAiClient();
        const systemInstruction = await getSystemPrompt(userProfile, conjuntoInfo);
        const history = initialAiMessage ? [{ role: 'model', parts: [{ text: initialAiMessage }] }] : undefined;

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

        if (functionCalls && functionCalls.length > 0) {
            return await processFunctionCalls(functionCalls);
        }
        
        return response.text;
    } catch (error) {
        console.error("Error during chat execution:", error);
        return "Lo siento, tuve un problema al procesar tu solicitud.";
    }
};

const processFunctionCalls = async (functionCalls: FunctionCall[]): Promise<string> => {
    const call = functionCalls[0];
    const { name, args } = call;

    const userProfile = (chat as any)?.userProfile as UserProfile;
    const conjuntoInfo = (chat as any)?.conjuntoInfo as ConjuntoInfo;

    if (!currentConjuntoId) {
        return "Error de contexto: no se pudo determinar el conjunto actual.";
    }
    
    apiService.logChatbotInteraction(currentConjuntoId);

    try {
        switch (name) {
            // --- Resident Management ---
            case 'addResident': {
// FIX: Cast to 'unknown' first to prevent TypeScript conversion error.
                await apiService.addResident(currentConjuntoId, args as unknown as Resident);
// FIX: Cast to 'unknown' first to prevent TypeScript conversion error.
                return `¡Confirmado! Residente para el apto **${(args as unknown as Resident).apartment}** agregado exitosamente.`;
            }
            case 'updateResident': {
                const { apartment, data } = args as unknown as { apartment: string, data: Partial<Resident> };
                const existingResident = await apiService.fetchResidentByApartment(currentConjuntoId, apartment);
                if (!existingResident) throw new Error(`No se encontró un residente en el apartamento ${apartment}.`);
                await apiService.updateResident(currentConjuntoId, { ...existingResident, ...data });
                return `¡Confirmado! La información del residente del apto **${apartment}** ha sido actualizada.`;
            }
            case 'deleteResident': {
                const { apartment } = args as unknown as { apartment: string };
                await apiService.deleteResident(currentConjuntoId, apartment);
                return `¡Confirmado! El residente del apto **${apartment}** ha sido eliminado.`;
            }

            // --- Provider Management ---
            case 'addProvider': {
// FIX: Cast to 'unknown' first to prevent TypeScript conversion error.
                await apiService.addProvider(currentConjuntoId, args as unknown as Omit<Provider, 'id'>);
                return `¡Confirmado! Proveedor **${(args as unknown as Provider).company}** agregado exitosamente.`;
            }
            case 'updateProvider': {
                const { company, data } = args as unknown as { company: string, data: Partial<Provider> };
                const providers = await apiService.fetchProviders(currentConjuntoId);
                const matchingProviders = providers.filter(p => p.company.toLowerCase() === company.toLowerCase());
                if (matchingProviders.length === 0) throw new Error(`No se encontró un proveedor con el nombre "${company}".`);
                if (matchingProviders.length > 1) return `Encontré varios proveedores con el nombre "${company}". Por favor, sé más específico.`;
                const providerToUpdate = matchingProviders[0];
                await apiService.updateProvider(currentConjuntoId, { ...providerToUpdate, ...data });
                return `¡Confirmado! La información del proveedor **${company}** ha sido actualizada.`;
            }
            case 'deleteProvider': {
                const { company } = args as unknown as { company: string };
                const providers = await apiService.fetchProviders(currentConjuntoId);
                const matchingProviders = providers.filter(p => p.company.toLowerCase() === company.toLowerCase());
                if (matchingProviders.length === 0) throw new Error(`No se encontró un proveedor con el nombre "${company}".`);
                if (matchingProviders.length > 1) return `Encontré varios proveedores con el nombre "${company}". Por favor, sé más específico.`;
                const providerToDelete = matchingProviders[0];
                await apiService.deleteProvider(currentConjuntoId, providerToDelete.id);
                return `¡Confirmado! El proveedor **${company}** ha sido eliminado.`;
            }

            // --- Internal Staff Management ---
            case 'addInternalStaff': {
// FIX: Cast to 'unknown' first to prevent TypeScript conversion error.
                await apiService.addInternalStaff(currentConjuntoId, args as unknown as InternalStaff);
// FIX: Cast to 'unknown' first to prevent TypeScript conversion error.
                return `¡Confirmado! Miembro del personal **${(args as unknown as InternalStaff).name}** agregado exitosamente.`;
            }
            case 'updateInternalStaff': {
                const { name, data } = args as unknown as { name: string, data: Partial<InternalStaff> };
                const staffList = await apiService.fetchInternalStaff(currentConjuntoId);
                const matchingStaff = staffList.filter(s => s.name.toLowerCase() === name.toLowerCase());
                if (matchingStaff.length === 0) throw new Error(`No se encontró un miembro del personal llamado "${name}".`);
                if (matchingStaff.length > 1) return `Encontré varias personas llamadas "${name}". Por favor, proporciona más detalles para identificar a la persona correcta.`;
                const staffToUpdate = matchingStaff[0];
                await apiService.updateInternalStaff(currentConjuntoId, { ...staffToUpdate, ...data } as InternalStaff);
                return `¡Confirmado! La información de **${name}** ha sido actualizada.`;
            }
            case 'deleteInternalStaff': {
                const { name } = args as unknown as { name: string };
                const staffList = await apiService.fetchInternalStaff(currentConjuntoId);
                const matchingStaff = staffList.filter(s => s.name.toLowerCase() === name.toLowerCase());
                if (matchingStaff.length === 0) throw new Error(`No se encontró un miembro del personal llamado "${name}".`);
                if (matchingStaff.length > 1) return `Encontré varias personas llamadas "${name}". Por favor, proporciona más detalles para identificar a la persona correcta.`;
                await apiService.deleteInternalStaff(currentConjuntoId, name);
                return `¡Confirmado! El miembro del personal **${name}** ha sido eliminado.`;
            }

            case 'createReservation': {
                const reservationArgs = args as unknown as { commonAreaName: string; apartment: string; date: string; startTime: string; endTime: string; };
                await apiService.createReservationFromChat(currentConjuntoId, reservationArgs);
                return `¡Confirmado! La reserva del área **${reservationArgs.commonAreaName}** para el **Apto ${reservationArgs.apartment}** el **${reservationArgs.date}** de **${reservationArgs.startTime} a ${reservationArgs.endTime}** ha sido registrada exitosamente.`;
            }
            
            case 'queryDatabase': {
                const { table, query_description } = args as unknown as { table: string, query_description: string };
                const aptMatch = query_description.match(/\d+/);
                const apt = aptMatch ? aptMatch[0] : null;

                if (table === 'account_status' && apt) {
                    const account = await apiService.fetchAccountStatusByApartment(currentConjuntoId, apt);
                    if (account) return `El saldo pendiente del Apto ${apt} es de $${account.outstandingBalance.toLocaleString()}. Último pago: ${account.lastPaymentDate}.`;
                    return `No encontré información para el Apto ${apt}.`;
                }
                 if (table === 'residents' && apt) {
                    const resident = await apiService.fetchResidentByApartment(currentConjuntoId, apt);
                     if(resident) return `Residente del Apto ${apt}:\n- Nombre: ${resident.name}\n- Email: ${resident.email}\n- Teléfono: ${resident.phone}`;
                     return `No encontré un residente para el Apto ${apt}.`;
                }
                return `No pude procesar la consulta: "${query_description}". Intenta de nuevo.`;
            }

            case 'queryDebtors': {
                const debtors = await apiService.fetchDebtors(currentConjuntoId);
                if (debtors.length === 0) return "¡Buenas noticias! No hay residentes en mora en este momento.";
                const debtorsList = debtors.map(d => `- Apto ${d.apartment} (${d.name}): $${d.balance.toLocaleString('es-CO')}`).join('\n');
                return `Claro, aquí está la lista de residentes en mora:\n\n${debtorsList}`;
            }

            case 'queryProviders': {
                const { specialty } = args as unknown as { specialty?: string };
                const providers = await apiService.fetchProvidersBySpecialty(currentConjuntoId, specialty || '');
                 if (providers.length === 0) {
                    return specialty ? `No encontré proveedores con la especialidad "${specialty}".` : `No hay proveedores registrados.`;
                }
                const providersList = providers.map(p => `- ${p.company} (${p.specialty}) - Contacto: ${p.phone || 'N/A'}, ${p.email || 'N/A'}`).join('\n');
                return `Entendido. Consulté la base de datos y encontré estos proveedores:\n\n${providersList}`;
            }
            
            case 'sendMassEmail': {
                const { group, subject, body } = args as unknown as { group: string, subject: string, body: string };
                const result = await apiService.sendMassEmail(currentConjuntoId, group, subject, body);
                return result.message;
            }

            case 'addIncome': {
                const incomeArgs = args as unknown as Omit<Income, 'id'>;
                await apiService.addIncome(currentConjuntoId, incomeArgs);
                return `Ingreso de $${incomeArgs.amount.toLocaleString()} por "${incomeArgs.description}" agregado. ¿Necesitas algo más?`;
            }
            
            case 'addExpense': {
                const expenseArgs = args as unknown as Omit<Expense, 'id'>;
                await apiService.addExpense(currentConjuntoId, expenseArgs);
                 return `Gasto de $${expenseArgs.amount.toLocaleString()} por "${expenseArgs.description}" agregado. ¿Necesitas algo más?`;
            }
            
            case 'authorizeVisitor': {
                const visitorArgs = args as unknown as { visitorName: string, apartment: string, date: string };
                await apiService.addVisitorLog(currentConjuntoId, {...visitorArgs, status: 'Autorizado'});
                return `Visitante "${visitorArgs.visitorName}" autorizado para el Apto ${visitorArgs.apartment}.`;
            }
            
            case 'registerPackage': {
                const packageArgs = args as unknown as Partial<PackageLog>;
                await apiService.addPackageLog(currentConjuntoId, packageArgs);
                return `Paquete de "${packageArgs.courier}" para el Apto ${packageArgs.apartment} registrado.`;
            }
           
            case 'updateVisitorStatus': {
                const { logId, status } = args as unknown as { logId: number, status: string };
                const newStatus = status as VisitorLog['status'];
                if (!['Autorizado', 'Ingresó', 'Salió'].includes(newStatus)) {
                    return `El estado "${newStatus}" no es válido. Los estados permitidos son: Autorizado, Ingresó, Salió.`;
                }
                await apiService.updateVisitorLog(currentConjuntoId, logId, { status: newStatus });
                return `Estado del visitante actualizado a "${args.status}".`;
            }

            default:
                 return `No entendí la acción: ${name}.`;
        }
    } catch (error: any) {
        console.error(`Error executing function ${name}:`, error);
        return `Lo siento, no pude completar la operación. Motivo: ${error.message}`;
    } finally {
        await initializeChat(userProfile, conjuntoInfo);
    }
};

const generateSubject = async (body: string): Promise<string> => {
    const ai = await getAiClient();
    const prompt = `Genera un asunto corto y profesional para el siguiente correo electrónico:\n\n"${body}"\n\nAsunto:`;
    try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating subject:", error);
        return "Asunto no disponible";
    }
};

const improveWriting = async (body: string): Promise<string> => {
    const ai = await getAiClient();
    const prompt = `Mejora la redacción del siguiente texto para que sea más claro, profesional y conciso, manteniendo el tono original. No agregues saludos ni despedidas, solo mejora el texto proporcionado:\n\n"${body}"`;
    try {
        const response = await ai.models.generateContent({ model, contents: prompt });
        return response.text.trim();
    } catch (error) {
        console.error("Error improving writing:", error);
        return body;
    }
};

export const geminiService = {
    runChat,
    generateSubject,
    improveWriting,
};
