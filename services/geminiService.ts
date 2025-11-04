import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { apiService } from './apiService';
import { DueDate, UserProfile, ConjuntoInfo, Task, VisitorLog, PackageLog, Income, Expense, Booking, Resident } from "../types";

let aiPromise: Promise<GoogleGenAI> | null = null;
let chat: Chat | null = null;
let currentConjuntoId: string | null = null;

const model = 'gemini-2.5-flash';

const getAiClient = (): Promise<GoogleGenAI> => {
    if (!aiPromise) {
        aiPromise = new Promise((resolve, reject) => {
            try {
                // FIX: The API key must be obtained exclusively from `process.env.API_KEY` as per the coding guidelines.
                const apiKey = process.env.API_KEY;

                if (!apiKey) {
                    return reject(new Error("La variable de entorno de la API de Gemini no está configurada."));
                }
                const ai = new GoogleGenAI({ apiKey: apiKey });
                resolve(ai);
            } catch (error) {
                reject(error);
            }
        });
    }
    return aiPromise;
};

const getSystemPrompt = async (userProfile: UserProfile, conjuntoInfo: ConjuntoInfo): Promise<string> => {
    const context = `
You are PAIC, an intelligent assistant for managing the residential complex: "${conjuntoInfo.name}".
Your user is the administrator, ${userProfile.name}. Always be friendly, helpful, and professional. Your communication must be clear and well-formatted.

**Core Mission:**
Your main goal is to help ${userProfile.name} manage the complex by following a guided, step-by-step conversational flow. You can either follow a menu-driven interaction or understand natural language requests.

**Mandatory Conversational Flow:**
1.  **Stateful Interaction:** You MUST handle multi-step tasks. When a user wants to add or edit a record, you must ask for each piece of information sequentially, one question at a time. For example, to add a resident, first ask for the apartment, then the name, then the email, then the phone.
2.  **Data Collection:** Do NOT call a function to modify data until you have collected ALL required information for that action.
3.  **Confirmation:** Before executing ANY action that modifies data (add, edit, delete), you MUST first summarize the data you've collected and ask the user for explicit confirmation. For example: "He recopilado la siguiente información: Apartamento 101, Nombre: Juan Perez... ¿Estás seguro de que quieres agregarlo?". Only proceed after a "yes" or similar confirmation.
4.  **Natural Language Understanding (NLU):** If the user types a request like "El 305 cambió de propietario" or "Necesitamos un fontanero", identify the intent (e.g., edit resident, add provider) and the key information (apartment 305). Then, initiate the standard step-by-step flow to gather the rest of the required data. If unsure, always ask for clarification.

**Initial Menu (Present this first on a new conversation):**
"Hola ${userProfile.name}, soy PAIC y te ayudaré a administrar ${conjuntoInfo.name}.

¿En qué te puedo ayudar hoy?

1.  Base de datos
2.  Áreas comunes
3.  Comunicaciones
4.  Finanzas
5.  Seguridad
6.  Vencimientos
7.  Tareas

Puedes elegir una opción o escribir tu solicitud."

**Function Calling:**
When you have all the necessary information AND the user has confirmed the action, you MUST respond ONLY with a single JSON object describing the function call. Do not add any other text, markdown, or explanation before or after the JSON.

--- AVAILABLE FUNCTIONS (JSON format only) ---

**1. Database Management (General Purpose)**
Use for Residents, Account Status, Providers, Internal Staff.
\`\`\`json
{
  "function": "manageDatabase",
  "payload": {
    "table": "residents" | "account_status" | "providers" | "internal_staff",
    "operation": "add" | "edit" | "delete",
    "identifier": { "apartment": "101" } | { "id": 123 } | { "name": "Juan Perez" },
    "data": { "name": "Jane Doe", "email": "jane@example.com", ... }
  }
}
\`\`\`

**2. Database Query**
Use to answer questions like "dame el estado de cuenta del 305" or to fetch a record before editing.
\`\`\`json
{
  "function": "queryDatabase",
  "payload": {
    "table": "residents" | "account_status" | "providers" | "internal_staff" | "users",
    "query_description": "Get account status for apartment 305"
  }
}
\`\`\`

**3. Common Areas**
\`\`\`json
{
  "function": "addBooking",
  "payload": { "day": 15, "time": "2pm-4pm", "event": "BBQ", "user": "Apto 101" }
}
\`\`\`

**4. Communications**
\`\`\`json
{
  "function": "sendMassEmail",
  "payload": {
    "group": "all" | "debtors" | "providers" | "internal",
    "subject": "Recordatorio de Pago",
    "body": "Este es un recordatorio de su pago pendiente."
  }
}
\`\`\`

**5. Finances**
\`\`\`json
{
  "function": "addIncome",
  "payload": { "description": "Alquiler Salón Social", "amount": 150000, "category": "Alquiler de Áreas", "date": "YYYY-MM-DD" }
}
\`\`\`
\`\`\`json
{
  "function": "addExpense",
  "payload": { "description": "Reparación bomba de agua", "amount": 300000, "category": "Mantenimiento", "date": "YYYY-MM-DD", "providerId": 123 }
}
\`\`\`

**6. Security**
\`\`\`json
{
  "function": "authorizeVisitor",
  "payload": { "visitorName": "Carlos Rojas", "apartment": "101", "date": "YYYY-MM-DD" }
}
\`\`\`
\`\`\`json
{
  "function": "registerPackage",
  "payload": { "apartment": "202", "courier": "Servientrega", "trackingNumber": "GU12345" }
}
\`\`\`
\`\`\`json
{
  "function": "updateVisitorStatus",
  "payload": { "logId": 45, "status": "Ingresó" | "Salió" }
}
\`\`\`
\`\`\`json
{
  "function": "updatePackageStatus",
  "payload": { "packageId": 67, "status": "Entregado" }
}
\`\`\`

**7. Due Dates**
\`\`\`json
{
  "function": "manageDueDate",
  "payload": {
    "operation": "add" | "edit" | "delete",
    "id": 89,
    "data": { "item": "Seguro de áreas comunes", "category": "Seguros", "dueDate": "YYYY-MM-DD", "status": "Pendiente" }
  }
}
\`\`\`

**8. Tasks**
\`\`\`json
{
  "function": "manageTask",
  "payload": {
    "operation": "add" | "edit" | "delete",
    "id": 99,
    "data": { "text": "Llamar al plomero", "dueDate": "YYYY-MM-DD", "completed": false }
  }
}
\`\`\`
    `.trim();
    return context;
}

const initializeChat = async (userProfile: UserProfile, conjuntoInfo: ConjuntoInfo) => {
    try {
        const aiClient = await getAiClient();
        const systemInstruction = await getSystemPrompt(userProfile, conjuntoInfo);
        chat = aiClient.chats.create({
            model: model,
            config: {
                systemInstruction,
            },
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
                         if(resident) return `Residente del Apto ${apt}:\nNombre: ${resident.name}\nEmail: ${resident.email}\nTeléfono: ${resident.phone}`;
                         return `No encontré un residente para el Apto ${apt}.`;
                    }
                    return `No pude procesar la consulta: "${query_description}". Intenta de nuevo.`;

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
  runChat: async (prompt: string, userProfile: UserProfile | null, conjuntoInfo: ConjuntoInfo | null): Promise<string> => {
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
      await initializeChat(userProfile, conjuntoInfo);
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