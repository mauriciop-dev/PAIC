
import { GoogleGenAI, Chat, GenerateContentResponse } from "@google/genai";
import { apiService } from './apiService';

// Per instructions, API key must be from process.env.API_KEY
const apiKey = process.env.API_KEY;

if (!apiKey) {
    console.error("API_KEY environment variable not set. Chatbot will not function.");
}

// FIX: Use a placeholder AI and chat if API key is not available to prevent crashes.
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
const model = 'gemini-2.5-flash';

let chat: Chat | null = null;

const getSystemPrompt = async (): Promise<string> => {
    // Fetching fresh data each time can be slow. For a real app, consider caching.
    const [residents, accounts, providers, internalStaff, commonAreas, dueDates, tasks] = await Promise.all([
        apiService.fetchResidents(),
        apiService.fetchAccountStatus(),
        apiService.fetchProviders(),
        apiService.fetchInternalStaff(),
        apiService.fetchCommonAreas(),
        apiService.fetchDueDates(),
        apiService.fetchTasks()
    ]);

    // This prompt engineering is crucial for the chatbot's performance.
    const context = `
You are PAIC, an intelligent assistant for managing residential complexes. Your goal is to help the administrator manage their tasks efficiently.
You are friendly, helpful, and concise.

Here is a summary of the current data of the residential complex. Use this information to answer user questions and perform actions.

- **Total Residents:** ${residents.length}
- **Residents in Debt:** ${accounts.filter(a => a.outstandingBalance > 0).length}
- **Available Common Areas:** ${commonAreas.map(a => a.name).join(', ')}
- **Pending Due Dates:** ${dueDates.filter(d => d.status === 'Pendiente').length}
- **Overdue Dates:** ${dueDates.filter(d => d.status === 'Vencido').length}
- **Pending Tasks:** ${tasks.filter(t => !t.completed).length}

You can perform actions. When the user asks to do something like add a task, book an area, or update a payment, you MUST respond ONLY with a JSON object describing the function call. Do not add any other text or explanation.

Here are the available functions and their JSON formats:

1.  **Add a new task:**
    - User says: "recuérdame llamar al plomero mañana"
    - You respond: \`{"function": "addTask", "payload": {"text": "Llamar al plomero", "dueDate": "YYYY-MM-DD"}}\` (replace with tomorrow's date)

2.  **Book a common area:**
    - User says: "reserva el BBQ para el apto 101 el 15 de este mes de 2 a 4 pm"
    - You respond: \`{"function": "addBooking", "payload": {"day": 15, "time": "2pm-4pm", "event": "BBQ", "user": "Apt 101"}}\`

3.  **Mark a due date as paid:**
    - User says: "ya pagué el servicio de vigilancia"
    - (Assuming 'Servicio de Vigilancia' has id: 1)
    - You respond: \`{"function": "updateDueDateStatus", "payload": {"id": 1, "status": "Pagado"}}\`

For any other query, provide a helpful text response based on the provided data summary.
    `.trim();

    return context;
}

const initializeChat = async () => {
    if (!ai) return;
    try {
        const systemInstruction = await getSystemPrompt();
        chat = ai.chats.create({
            model: model,
            config: {
                systemInstruction,
            },
        });
    } catch (error) {
        console.error("Failed to initialize chat:", error);
        chat = null;
    }
};

const processApiResponse = async (response: string): Promise<string> => {
    try {
        // The model might wrap JSON in markdown ```json ... ```
        const cleanResponse = response.replace(/```json/g, '').replace(/```/g, '').trim();
        const action = JSON.parse(cleanResponse);
        if (action.function && action.payload) {
            switch (action.function) {
                case 'addTask':
                    await apiService.addTask(action.payload);
                    await initializeChat(); 
                    return "Tarea agregada exitosamente. ¿Necesitas algo más?";
                case 'addBooking':
                    await apiService.addBooking(action.payload);
                    await initializeChat();
                    return `¡Listo! He agendado "${action.payload.event}" para ${action.payload.user}. ¿Algo más?`;
                case 'updateDueDateStatus':
                    await apiService.updateDueDateStatus(action.payload.id, 'Pagado');
                    await initializeChat();
                    return "El estado del pago ha sido actualizado a 'Pagado'. ¿Te ayudo con otra cosa?";
                default:
                    return "No pude reconocer la acción solicitada. ¿Puedes intentarlo de otra manera?";
            }
        }
        return response; // Not a valid function call structure
    } catch (e) {
        // Not a JSON or not a function call, return original text
        return response;
    }
};

const runStandaloneQuery = async (systemInstruction: string, prompt: string): Promise<string> => {
    if (!apiKey || !ai) {
        return "El servicio de IA no está configurado. Por favor, asegúrate de que la clave de API de Gemini esté configurada.";
    }
    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: model,
            contents: prompt,
            config: { systemInstruction },
        });
        return response.text;
    } catch (error) {
        console.error("Error in standalone query:", error);
        throw new Error("No se pudo obtener una respuesta de la IA.");
    }
}

export const geminiService = {
  runChat: async (prompt: string): Promise<string> => {
    if (!apiKey || !ai) {
        return "El servicio de IA no está configurado. Por favor, asegúrate de que la clave de API de Gemini esté configurada en las variables de entorno.";
    }
      
    if (!chat) {
      await initializeChat();
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
    return runStandaloneQuery(systemInstruction, `Crea un asunto para este mensaje: "${messageBody}"`);
  },

  improveWriting: async (messageBody: string): Promise<string> => {
    const systemInstruction = "Eres un asistente de redacción profesional. Tu tarea es mejorar el siguiente texto para que sea más claro, profesional y amigable, manteniendo el mensaje central. No agregues saludos ni despedidas, solo mejora el cuerpo del mensaje. Responde únicamente con el texto mejorado.";
    return runStandaloneQuery(systemInstruction, `Mejora la redacción de este mensaje: "${messageBody}"`);
  },
};