import { GoogleGenAI, Chat, GenerateContentResponse, FunctionCall } from "@google/genai";
import { apiService } from './apiService';
// FIX: Added missing types to ensure proper casting and type safety.
import { UserProfile, ConjuntoInfo, Income, Expense, VisitorLog, Resident, Provider, PackageLog } from "../types";
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
    // For simplicity, we process the first function call. Gemini may support parallel calls in the future.
    const call = functionCalls[0];
    const { name, args } = call;

    const userProfile = (chat as any)?.userProfile as UserProfile;
    const conjuntoInfo = (chat as any)?.conjuntoInfo as ConjuntoInfo;

    if (!currentConjuntoId) {
        return "Error de contexto: no se pudo determinar el conjunto actual.";
    }
    
    apiService.logChatbotInteraction(currentConjuntoId); // Log every attempted action

    try {
        switch (name) {
            case 'manageDatabase': {
                // FIX: Added type assertions to 'args' properties to satisfy function signatures.
                const { table, operation, data, identifier } = args as { table: string, operation: string, data: unknown, identifier: unknown };
                switch (table) {
                    case 'residents':
                        if (operation === 'add') await apiService.addResident(currentConjuntoId, data as Resident);
                        else if (operation === 'edit') await apiService.updateResident(currentConjuntoId, { ...(identifier as any), ...(data as any) });
                        else if (operation === 'delete') await apiService.deleteResident(currentConjuntoId, (identifier as { apartment: string }).apartment);
                        break;
                    case 'providers':
                        if (operation === 'add') await apiService.addProvider(currentConjuntoId, data as Omit<Provider, 'id'>);
                        else if (operation === 'edit') await apiService.updateProvider(currentConjuntoId, { ...(identifier as any), ...(data as any) });
                        else if (operation === 'delete') await apiService.deleteProvider(currentConjuntoId, (identifier as { id: number }).id);
                        break;
                    default:
                        throw new Error(`Tabla '${table}' no es válida para esta operación.`);
                }
                return `¡Confirmado! La operación de **${operation}** en la tabla **${table}** se completó exitosamente.`;
            }

            case 'createReservation': {
                // FIX: Cast `args` to the shape expected by `createReservationFromChat`.
                const reservationArgs = args as { commonAreaName: string; apartment: string; date: string; startTime: string; endTime: string; };
                await apiService.createReservationFromChat(currentConjuntoId, reservationArgs);
                return `¡Confirmado! La reserva del área **${reservationArgs.commonAreaName}** para el **Apto ${reservationArgs.apartment}** el **${reservationArgs.date}** de **${reservationArgs.startTime} a ${reservationArgs.endTime}** ha sido registrada exitosamente.`;
            }
            
            case 'queryDatabase': {
                // FIX: Cast `args` to access its properties with correct types.
                const { table, query_description } = args as { table: string, query_description: string };
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
                // FIX: Cast `args` to access `specialty` safely.
                const { specialty } = args as { specialty?: string };
                const providers = await apiService.fetchProvidersBySpecialty(currentConjuntoId, specialty || '');
                 if (providers.length === 0) {
                    return specialty ? `No encontré proveedores con la especialidad "${specialty}".` : `No hay proveedores registrados.`;
                }
                const providersList = providers.map(p => `- ${p.company} (${p.specialty}) - Contacto: ${p.phone || 'N/A'}, ${p.email || 'N/A'}`).join('\n');
                return `Entendido. Consulté la base de datos y encontré estos proveedores:\n\n${providersList}`;
            }
            
            case 'sendMassEmail': {
                // FIX: Cast `args` to access its properties safely.
                const { group, subject, body } = args as { group: string, subject: string, body: string };
                const result = await apiService.sendMassEmail(currentConjuntoId, group, subject, body);
                return result.message;
            }

            case 'addIncome': {
                const incomeArgs = args as Omit<Income, 'id'>;
                await apiService.addIncome(currentConjuntoId, incomeArgs);
                return `Ingreso de $${incomeArgs.amount.toLocaleString()} por "${incomeArgs.description}" agregado. ¿Necesitas algo más?`;
            }
            
            case 'addExpense': {
                const expenseArgs = args as Omit<Expense, 'id'>;
                await apiService.addExpense(currentConjuntoId, expenseArgs);
                 return `Gasto de $${expenseArgs.amount.toLocaleString()} por "${expenseArgs.description}" agregado. ¿Necesitas algo más?`;
            }
            
            case 'authorizeVisitor': {
                // FIX: Spread `args` and add status, ensuring the object matches the expected type.
                const visitorArgs = args as { visitorName: string, apartment: string, date: string };
                await apiService.addVisitorLog(currentConjuntoId, {...visitorArgs, status: 'Autorizado'});
                return `Visitante "${visitorArgs.visitorName}" autorizado para el Apto ${visitorArgs.apartment}.`;
            }
            
            case 'registerPackage': {
                const packageArgs = args as Partial<PackageLog>;
                await apiService.addPackageLog(currentConjuntoId, packageArgs);
                return `Paquete de "${packageArgs.courier}" para el Apto ${packageArgs.apartment} registrado.`;
            }
           
            case 'updateVisitorStatus': {
                // FIX: Cast `args` to access its properties safely.
                const { logId, status } = args as { logId: number, status: string };
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
        // Re-initialize chat to clear context after a function call completes or fails.
        // This prevents the AI from getting stuck in a loop.
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
