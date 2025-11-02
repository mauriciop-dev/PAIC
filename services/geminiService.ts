import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { apiService } from './apiService';
import { DueDate } from "../types";

// This promise will hold the initialized AI client. It's created once and reused
// to prevent multiple initialization attempts.
let aiPromise: Promise<GoogleGenAI> | null = null;
let chat: Chat | null = null;
let currentConjuntoId: string | null = null;

const model = 'gemini-2.5-flash';

/**
 * Initializes and returns a singleton promise for the GoogleGenAI client.
 * This is the correct, robust way to handle async initialization.
 */
// FIX: Updated to check for the API key in both Vercel's `import.meta.env` and AI Studio's `process.env` to ensure compatibility across both environments.
const getAiClient = (): Promise<GoogleGenAI> => {
    if (!aiPromise) {
        aiPromise = new Promise((resolve, reject) => {
            try {
                // Vercel (Vite) uses `import.meta.env.VITE_...`, AI Studio uses `process.env.API_KEY`
                const apiKey = (import.meta.env.VITE_GEMINI_API_KEY as string) || process.env.API_KEY;

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


const getSystemPrompt = async (conjuntoId: string): Promise<string> => {
    // This prompt engineering is crucial for the chatbot's performance.
    const context = `
You are PAIC, an intelligent assistant for managing residential complexes. Your goal is to help the administrator manage their tasks efficiently.
You are friendly, helpful, and professional. Your communication must be clear and well-formatted. DO NOT use asterisks for formatting. Use newlines for lists.

**Core Functionality:**
When a user asks to perform an action, you MUST ask for all necessary information sequentially if it's not provided. Once you have all the information, you MUST respond ONLY with a single JSON object describing the function call. Do not add any other text, markdown, or explanation.

**Available Functions (JSON format only):**

1.  **Add a new task:**
    // FIX: Escaped backticks within the template literal to resolve syntax errors.
    - Required info: \\\`text\\\`, \\\`dueDate\\\`.
    - Example user interaction:
      - User: "1" or "crear tarea"
      - You: "Claro, ¿cuál es la descripción de la tarea?"
      - User: "llamar al plomero"
      - You: "Entendido. ¿Para qué fecha necesitas este recordatorio?"
      - User: "para mañana"
      - You: \\\`{"function": "addTask", "payload": {"text": "Llamar al plomero", "dueDate": "YYYY-MM-DD"}}\\\` (replace with tomorrow's date)

2.  **Book a common area:**
    // FIX: Escaped backticks within the template literal to resolve syntax errors.
    - Required info: \\\`event\\\` (area name), \\\`user\\\` (apartment), \\\`day\\\`, \\\`time\\\`.
    - You respond: \\\`{"function": "addBooking", "payload": {"day": 15, "time": "2pm-4pm", "event": "BBQ", "user": "Apto 101"}}\\\`

3.  **Send a communication:**
    // FIX: Escaped backticks within the template literal to resolve syntax errors.
    - Required info: \\\`recipients\\\` ('all', 'debtors'), \\\`subject\\\`, \\\`body\\\`.
    - You respond: \\\`{"function": "sendCommunication", "payload": {"recipients": "debtors", "subject": "Recordatorio de Pago", "body": "Este es un recordatorio de su pago pendiente."}}\\\`

4.  **Query the database:**
    - Use this for specific questions about data (e.g., account status, bookings for a specific date).
    // FIX: Escaped backticks within the template literal to resolve syntax errors.
    - Required info: \\\`query_description\\\`.
    - Example user interaction:
      - User: "cuanto debe el 305"
      - You: \\\`{"function": "queryDatabase", "payload": {"query_description": "Get account status for apartment 305"}}\\\`
      - User: "que dias esta alquilado el salon comunal el proximo mes"
      - You: \\\`{"function": "queryDatabase", "payload": {"query_description": "Get all bookings for 'Salón Comunal' in the next month"}}\\\`

For general questions or conversation, provide a helpful text response.
    `.trim();

    return context;
}

const initializeChat = async (conjuntoId: string) => {
    try {
        const aiClient = await getAiClient();
        const systemInstruction = await getSystemPrompt(conjuntoId);
        chat = aiClient.chats.create({
            model: model,
            config: {
                systemInstruction,
            },
        });
        currentConjuntoId = conjuntoId;
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
            switch (action.function) {
                case 'addTask':
                    await apiService.addTask(currentConjuntoId, action.payload);
                    await initializeChat(currentConjuntoId); 
                    return "Tarea agregada exitosamente. ¿Necesitas algo más?";
                case 'addBooking':
                    await apiService.addBooking(currentConjuntoId, action.payload);
                    await initializeChat(currentConjuntoId);
                    return `¡Listo! He agendado "${action.payload.event}" para ${action.payload.user}. ¿Algo más?`;
                case 'updateDueDateStatus': {
                    const allDueDates = await apiService.fetchDueDates(currentConjuntoId);
                    const dueDateToUpdate = allDueDates.find(d => d.id === action.payload.id);
                    if (dueDateToUpdate) {
                        await apiService.updateDueDate(currentConjuntoId, { ...dueDateToUpdate, status: action.payload.status as DueDate['status'] });
                        await initializeChat(currentConjuntoId);
                        return `El estado del pago ha sido actualizado a '${action.payload.status}'. ¿Te ayudo con otra cosa?`;
                    }
                    return "No pude encontrar el vencimiento que mencionaste.";
                }
                case 'sendCommunication': {
                    const { recipients, subject, body } = action.payload;
                    const result = await apiService.sendMassEmail(currentConjuntoId, recipients, subject, body);
                    await initializeChat(currentConjuntoId);
                    return result.message;
                }
                 case 'queryDatabase': {
                    // This is a simplified query handler. A real-world app would need a more robust NLP-to-SQL layer.
                    const desc = action.payload.query_description.toLowerCase();
                    if (desc.includes('account status') || desc.includes('debe')) {
                        const aptMatch = desc.match(/\d+/);
                        if (aptMatch) {
                            const apt = aptMatch[0];
                            const account = await apiService.fetchAccountStatusByApartment(currentConjuntoId, apt);
                            if (account) {
                                return `El saldo pendiente del Apto ${apt} es de $${account.outstandingBalance.toLocaleString()}. Último pago: ${account.lastPaymentDate}.`;
                            }
                            return `No encontré información para el Apto ${apt}.`;
                        }
                    }
                    return "No pude procesar la consulta específica. Intenta preguntar de una forma más sencilla.";
                }
                default:
                    return "No pude reconocer la acción solicitada. ¿Puedes intentarlo de otra manera?";
            }
        }
        return response;
    } catch (e) {
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
  runChat: async (prompt: string, conjuntoId: string | undefined): Promise<string> => {
    try {
        await getAiClient();
    } catch (error: any) {
        console.error("AI Client Initialization failed:", error);
        return `Error de configuración: ${error.message || 'No se pudo inicializar el servicio de IA'}. Por favor, asegúrate de que la clave de API de Gemini esté configurada en el entorno.`;
    }

    if (!conjuntoId) {
        return "No se ha podido identificar el conjunto residencial. No puedo procesar tu solicitud.";
    }
      
    if (!chat || currentConjuntoId !== conjuntoId) {
      await initializeChat(conjuntoId);
    }
    
    if (!chat) {
        return "No se pudo inicializar el chat. Verifica la configuración de la API y que la clave sea correcta."
    }

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
