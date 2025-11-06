import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { apiService } from './apiService';
import { DueDate, UserProfile, ConjuntoInfo, Task, VisitorLog, PackageLog, Income, Expense, Booking, Resident, Provider } from "../types";

let aiPromise: Promise<GoogleGenAI> | null = null;
let chat: Chat | null = null;
let currentConjuntoId: string | null = null;
let systemPromptTemplate: string | null = null; // Cache for the prompt template

const model = 'gemini-2.5-flash';

const getAiClient = (): Promise<GoogleGenAI> => {
    if (!aiPromise) {
        aiPromise = new Promise((resolve, reject) => {
            let apiKey: string | undefined;

            // Prioritize reading from `process.env`, checking multiple common names.
            if (typeof process !== 'undefined' && process.env) {
                // @ts-ignore
                apiKey = process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY;
            }

            // Fallback to Vite's standard `import.meta.env`.
            if (!apiKey) {
                try {
                    // @ts-ignore
                    if (import.meta.env) {
                        // @ts-ignore
                        apiKey = import.meta.env.VITE_GEMINI_API_KEY;
                    }
                } catch (e) {
                    // Silently fail if import.meta.env is not available.
                }
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
    // FIX: Cache the prompt template to avoid fetching it on every chat initialization, improving performance.
    if (!systemPromptTemplate) { 
        try {
            const response = await fetch('/src/prompts/system_prompt.txt');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            systemPromptTemplate = await response.text(); // Cache the template
        } catch (error) {
            console.error("Failed to fetch and cache system prompt:", error);
            // Fallback to a very basic prompt in case of failure
            return `You are a helpful assistant for ${conjuntoInfo.name}. The user is ${userProfile.name}.`;
        }
    }
    
    const formattedDate = new Date().toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    // Replace placeholders with actual data from the cached template
    const finalPrompt = (systemPromptTemplate || '')
        .replace(/{{userName}}/g, userProfile.name)
        .replace(/{{conjuntoName}}/g, conjuntoInfo.name)
        .replace(/{{currentDate}}/g, formattedDate);
        
    return finalPrompt;
}

// FIX: `initialAiMessage` is now optional. It's used to prime the chat history with the UI's welcome message, giving context to the AI for the user's first reply.
const initializeChat = async (userProfile: UserProfile, conjuntoInfo: ConjuntoInfo, initialAiMessage?: string) => {
    try {
        const aiClient = await getAiClient();
        const systemInstruction = await getSystemPrompt(userProfile, conjuntoInfo);
        const history = initialAiMessage ? [{ role: 'model', parts: [{ text: initialAiMessage }] }] : undefined;

        chat = aiClient.chats.create({
            model: model,
            config: {
                systemInstruction,
            },
            history: history, // Provide the initial AI message as context if it exists
        });
        currentConjuntoId = conjuntoInfo.id;
    } catch (error) {
        console.error("Failed to initialize chat:", error);
        chat = null;
    }
};

const processApiResponse = async (response: string): Promise<string> => {
    try {
        const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const action = JSON.parse(cleanResponse);
        
        if (action.function && action.payload && currentConjuntoId) {
            apiService.logChatbotInteraction(currentConjuntoId); // Log interaction
            
            // This re-initializes the chat after a function call to keep the context clean.
            // It correctly calls initializeChat without an initial message.
            await initializeChat(chat?.userProfile as UserProfile, chat?.conjuntoInfo as ConjuntoInfo);

            switch (action.function) {
                // --- DATABASE ---
                case 'manageDatabase':
                    const { table, operation, identifier, data } = action.payload;
                    switch (table) {
                        case 'residents':
                            if (operation === 'add') await apiService.addResident(currentConjuntoId, data);
                            else if (operation === 'edit') await apiService.updateResident(currentConjuntoId, { ...identifier, ...data });
                            else if (operation === 'delete') await apiService.deleteResident(currentConjuntoId, identifier.apartment);
                            break;
                        case 'account_status':
                            if (operation === 'add') await apiService.addAccountStatus(currentConjuntoId, data);
                            else if (operation === 'edit') await apiService.updateAccountStatus(currentConjuntoId, { ...identifier, ...data });
                            else if (operation === 'delete') await apiService.deleteAccountStatus(currentConjuntoId, identifier.apartment);
                            break;
                         case 'providers':
                            if (operation === 'add') await apiService.addProvider(currentConjuntoId, data);
                            else if (operation === 'edit') await apiService.updateProvider(currentConjuntoId, { ...identifier, ...data });
                            else if (operation === 'delete') await apiService.deleteProvider(currentConjuntoId, identifier.id);
                            break;
                        case 'internal_staff':
                            if (operation === 'add') await apiService.addInternalStaff(currentConjuntoId, data);
                            else if (operation === 'edit') await apiService.updateInternalStaff(currentConjuntoId, { ...identifier, ...data });
                            else if (operation === 'delete') await apiService.deleteInternalStaff(currentConjuntoId, identifier.name);
                            break;
                    }
                    return `Operación de ${operation} en ${table} completada exitosamente. ¿En qué más te puedo ayudar?`;

                case 'queryDatabase':
                    const { table: queryTable, query_description } = action.payload;
                    const aptMatch = query_description.match(/\d+/);
                    const apt = aptMatch ? aptMatch[0] : null;

                    if (queryTable === 'account_status' && apt) {
                        const account = await apiService.fetchAccountStatusByApartment(currentConjuntoId, apt);
                        if (account) return `El saldo pendiente del Apto ${apt} es de $${account.outstandingBalance.toLocaleString()}. Último pago: ${account.lastPaymentDate}.`;
                        return `No encontré información para el Apto ${apt}.`;
                    }
                     if (queryTable === 'residents' && apt) {
                        const resident = await apiService.fetchResidentByApartment(currentConjuntoId, apt);
                         if(resident) return `Residente del Apto ${apt}:\n- Nombre: ${resident.name}\n- Email: ${resident.email}\n- Teléfono: ${resident.phone}`;
                         return `No encontré un residente para el Apto ${apt}.`;
                    }
                    return `No pude procesar la consulta: "${query_description}". Intenta de nuevo.`;

                case 'queryDebtors':
                    const debtors = await apiService.fetchDebtors(currentConjuntoId);
                    if (debtors.length === 0) {
                        return "¡Buenas noticias! No hay residentes en mora en este momento.";
                    }
                    const debtorsList = debtors
                        .map(d => `- Apto ${d.apartment} (${d.name}): $${d.balance.toLocaleString('es-CO')}`)
                        .join('\n');
                    return `Claro, aquí está la lista de residentes en mora:\n\n${debtorsList}`;

                case 'queryProviders':
                    const { specialty } = action.payload;
                    const providers: Provider[] = await apiService.fetchProvidersBySpecialty(currentConjuntoId, specialty);
                     if (providers.length === 0) {
                        return specialty 
                            ? `No encontré proveedores con la especialidad "${specialty}" en la base de datos.`
                            : `No hay proveedores registrados en la base de datos.`;
                    }
                    const providersList = providers
                        .map(p => `- ${p.company} (${p.specialty}) - Contacto: ${p.phone || 'N/A'}, ${p.email || 'N/A'}`)
                        .join('\n');
                    return `Entendido. Consulté la base de datos y encontré estos proveedores:\n\n${providersList}`;

                // --- COMMON AREAS ---
                case 'addBooking':
                    await apiService.addBooking(currentConjuntoId, action.payload as Booking);
                    return `¡Listo! He agendado "${action.payload.event}" para ${action.payload.user}. ¿Algo más?`;

                // --- COMMUNICATIONS ---
                case 'sendMassEmail':
                    const result = await apiService.sendMassEmail(currentConjuntoId, action.payload.group, action.payload.subject, action.payload.body);
                    return result.message;

                // --- FINANCES ---
                case 'addIncome':
                    await apiService.addIncome(currentConjuntoId, action.payload as Omit<Income, 'id'>);
                    return `Ingreso de $${action.payload.amount.toLocaleString()} por "${action.payload.description}" agregado. ¿Necesitas algo más?`;
                case 'addExpense':
                    await apiService.addExpense(currentConjuntoId, action.payload as Omit<Expense, 'id'>);
                     return `Gasto de $${action.payload.amount.toLocaleString()} por "${action.payload.description}" agregado. ¿Necesitas algo más?`;
                
                // --- SECURITY ---
                case 'authorizeVisitor':
                    await apiService.addVisitorLog(currentConjuntoId, {...action.payload, status: 'Autorizado'});
                    return `Visitante "${action.payload.visitorName}" autorizado para el Apto ${action.payload.apartment}.`;
                case 'registerPackage':
                    await apiService.addPackageLog(currentConjuntoId, action.payload);
                    return `Paquete de "${action.payload.courier}" para el Apto ${action.payload.apartment} registrado.`;
                case 'updateVisitorStatus':
                    await apiService.updateVisitorLog(currentConjuntoId, action.payload.logId, { status: action.payload.status });
                    return `Estado del visitante actualizado a "${action.payload.status}".`;
                case 'updatePackageStatus':
                    await apiService.updatePackageLogStatus(currentConjuntoId, action.payload.packageId, action.payload.status);
                    return `Estado del paquete actualizado a "${action.payload.status}".`;
                
                // --- DUE DATES ---
                case 'manageDueDate':
                    if (action.payload.operation === 'add') await apiService.addDueDate(currentConjuntoId, action.payload.data);
                    else if (action.payload.operation === 'edit') await apiService.updateDueDate(currentConjuntoId, { ...action.payload.data, id: action.payload.id });
                    else if (action.payload.operation === 'delete') await apiService.deleteDueDate(currentConjuntoId, action.payload.id);
                    return `Vencimiento gestionado exitosamente. ¿Algo más?`;
                
                // --- TASKS ---
                 case 'manageTask':
                    if (action.payload.operation === 'add') await apiService.addTask(currentConjuntoId, action.payload.data);
                    else if (action.payload.operation === 'edit') await apiService.updateTask(currentConjuntoId, { ...action.payload.data, id: action.payload.id });
                    else if (action.payload.operation === 'delete') await apiService.deleteTask(currentConjuntoId, action.payload.id);
                    return `Tarea gestionada exitosamente. ¿Algo más?`;

                default:
                    return "No pude reconocer la acción solicitada. ¿Puedes intentarlo de otra manera?";
            }
        }
        return response;
    } catch (e) {
        // If it's not a JSON or not a valid function call, return the raw response
        return response;
    }
};

const runStandaloneQuery = async (systemInstruction: string, prompt: string): Promise<string> => {
    const aiClient = await getAiClient();
    const response: GenerateContentResponse = await aiClient.models.generateContent({
        model: model,
        contents: prompt,
        config: { systemInstruction },
    });
    return response.text;
}

export const geminiService = {
  runChat: async (prompt: string, userProfile: UserProfile | null, conjuntoInfo: ConjuntoInfo | null, initialAiMessage?: string): Promise<string> => {
    try {
        await getAiClient();
    } catch (error: any) {
        console.error("AI Client Initialization failed:", error);
        return `Error de configuración: ${error.message || 'No se pudo inicializar el servicio de IA'}. Por favor, asegúrate de que la clave de API de Gemini esté configurada en el entorno.`;
    }

    if (!userProfile || !conjuntoInfo) {
        return "No se ha podido identificar el contexto de usuario. No puedo procesar tu solicitud.";
    }
      
    if (!chat || currentConjuntoId !== conjuntoInfo.id) {
      await initializeChat(userProfile, conjuntoInfo, initialAiMessage);
    }
    
    if (!chat) {
        return "No se pudo inicializar el chat. Verifica la configuración de la API y que la clave sea correcta."
    }
    // Pass userProfile and conjuntoInfo to the chat object for use in processApiResponse
    (chat as any).userProfile = userProfile;
    (chat as any).conjuntoInfo = conjuntoInfo;

    try {
      const result: GenerateContentResponse = await chat.sendMessage({ message: prompt });
      const responseText = result.text;
      const processedResponse = await processApiResponse(responseText);
      
      return processedResponse;
    } catch (error) {
      console.error("Error running chat:", error);
      return "Lo siento, tuve un problema al procesar tu solicitud. Por favor, inténtalo de nuevo.";
    }
  },

  generateSubject: async (messageBody: string): Promise<string> => {
    const systemInstruction = "Eres un experto en comunicación. Tu tarea es crear un asunto de correo electrónico corto, claro y efectivo (máximo 10 palabras) para el siguiente mensaje. Responde únicamente con el texto del asunto.";
    try {
        return await runStandaloneQuery(systemInstruction, `Crea un asunto para este mensaje: "${messageBody}"`);
    } catch (error) {
        console.error("Error in generateSubject:", error);
        return "Asunto no disponible";
    }
  },

  improveWriting: async (messageBody: string): Promise<string> => {
    const systemInstruction = "Eres un asistente de redacción profesional. Tu tarea es mejorar el siguiente texto para que sea más claro, profesional y amigable, manteniendo el mensaje central. No agregues saludos ni despedidas, solo mejora el cuerpo del mensaje. Responde únicamente con el texto mejorado.";
    try {
        return await runStandaloneQuery(systemInstruction, `Mejora la redacción de este mensaje: "${messageBody}"`);
    } catch (error) {
        console.error("Error in improveWriting:", error);
        return messageBody; // Return original text on failure
    }
  },
};