import {
  GoogleGenAI,
  FunctionDeclaration,
  GenerateContentResponse,
  Type,
  Content,
} from "@google/genai";
import { Message } from '../types';
import { dataStore } from '../data/dataStore';

// Per coding guidelines, the API key is obtained exclusively from `process.env.API_KEY`.
// The execution environment is expected to provide this value.
// @ts-ignore - Assuming process.env is available in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- Function Declarations for Gemini ---

const addBookingDeclaration: FunctionDeclaration = {
  name: 'addBooking',
  description: 'Agenda una reserva para un área común en un día y hora específicos para un residente.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      day: { type: Type.NUMBER, description: 'El número del día del mes para la reserva (e.j., 15).' },
      time: { type: Type.STRING, description: 'El rango de horas para la reserva (e.j., "2pm-4pm").' },
      event: { type: Type.STRING, description: 'El nombre del área común a reservar (e.j., "BBQ", "Salón Social").' },
      user: { type: Type.STRING, description: 'El identificador del residente que reserva, usualmente su número de apartamento (e.j., "Apt 101").' },
    },
    required: ['day', 'time', 'event', 'user'],
  },
};

const addTaskDeclaration: FunctionDeclaration = {
  name: 'addTask',
  description: 'Agrega una nueva tarea pendiente para el administrador.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      text: { type: Type.STRING, description: 'La descripción de la tarea.' },
      dueDate: { type: Type.STRING, description: 'La fecha de vencimiento de la tarea en formato AAAA-MM-DD. Opcional.' },
    },
    required: ['text'],
  },
};

const markDueDateAsPaidDeclaration: FunctionDeclaration = {
  name: 'markDueDateAsPaid',
  description: 'Marca una obligación de pago o vencimiento como "Pagado" usando su descripción.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      itemDescription: { type: Type.STRING, description: 'La descripción del ítem de pago a marcar como pagado (e.j., "Servicio de Vigilancia").' },
    },
    required: ['itemDescription'],
  },
};


// --- Function Implementations ---

const availableFunctions: { [key: string]: (...args: any[]) => any } = {
  addBooking: ({ day, time, event, user }: { day: number, time: string, event: string, user: string }) => {
    const commonAreas = dataStore.getCommonAreas().map(a => a.name.toLowerCase());
    if (!commonAreas.includes(event.toLowerCase())) {
        return `Error: El área común "${event}" no existe. Las áreas disponibles son: ${dataStore.getCommonAreas().map(a => a.name).join(', ')}.`;
    }
    dataStore.addBooking({ day, time, event, user });
    return `Reserva para "${event}" el día ${day} a las ${time} para ${user} ha sido agendada exitosamente.`;
  },
  addTask: ({ text, dueDate }: { text: string, dueDate?: string }) => {
    dataStore.addTask({ text, dueDate: dueDate || '', completed: false });
    return `Tarea "${text}" agregada exitosamente.`;
  },
  markDueDateAsPaid: ({ itemDescription }: { itemDescription: string }) => {
    const dueDates = dataStore.getDueDates();
    const dueDateToUpdate = dueDates.find(d => d.item.toLowerCase().includes(itemDescription.toLowerCase()) && d.status !== 'Pagado');
    if (dueDateToUpdate) {
        dataStore.updateDueDateStatus(dueDateToUpdate.id, 'Pagado');
        return `El vencimiento "${dueDateToUpdate.item}" ha sido marcado como "Pagado".`;
    }
    return `Error: No se encontró un vencimiento pendiente o vencido que coincida con "${itemDescription}".`;
  },
};

// --- Main Service Functions ---

export const getInitialGreeting = (userName?: string): string => {
  const name = userName ? `, ${userName}` : '';
  return `¡Hola${name}! Soy PAIC, tu Asistente de Administración Inteligente. Estoy aquí para ayudarte a gestionar la información y tareas de tu conjunto residencial.\n\nPuedes pedirme cosas como:\n- "¿Cuál es el estado de cuenta del apartamento 101?"\n- "Agrega una tarea: 'llamar al proveedor de ascensores' para mañana"\n- "Reserva el BBQ para el apartamento 202 este sábado a las 2pm"`;
};

export const getChatResponse = async (
  _currentMessage: string,
  fullHistory: Message[],
  userName?: string
): Promise<string> => {
  
  const today = new Date().toISOString().split('T')[0];
  const residents = dataStore.getResidents();
  const accountStatus = dataStore.getAccountStatus();
  const bookings = dataStore.getBookings();
  const commonAreas = dataStore.getCommonAreas();
  const dueDates = dataStore.getDueDates();
  const tasks = dataStore.getTasks();
  
  const currentMessage = fullHistory[fullHistory.length - 1];
  const chatHistoryForApi = fullHistory.slice(0, -1);

  // The system instruction helps the AI understand commands like
  // "recuerdame" (without accents) and to correctly interpret relative dates like "mañana".
  // This makes the chatbot's natural language understanding more reliable.
  const systemInstruction = `Eres PAIC, un asistente IA para administradores de conjuntos residenciales en Colombia. Tu nombre es PAIC (Plataforma de Administración Inteligente de Conjuntos).
  Estás conversando con ${userName || 'el administrador'}.
  Tu objetivo es ser útil, amable y profesional. Responde siempre en español.
  La fecha actual es ${today}.

  CAPACIDADES:
  1.  **Consultar Datos**: Puedes responder preguntas sobre residentes, estados de cuenta, reservas, vencimientos y tareas usando la información de contexto.
  2.  **Realizar Acciones (Function Calling)**: Debes usar las herramientas/funciones disponibles para modificar datos.
      - Para crear tareas, usa la función 'addTask'. Analiza la frase del usuario para extraer la descripción de la tarea y la fecha de vencimiento.
      - **IMPORTANTE**: Interpreta fechas relativas. Si el usuario dice "mañana", calcula la fecha correspondiente y pásala en formato AAAA-MM-DD. Si dice "el próximo viernes", calcula la fecha. No incluyas la fecha relativa en el texto de la tarea.
      - Se flexible con los comandos. "Recuérdame", "anota", "recuerda que", "agrega una tarea" todos indican la intención de crear una tarea.
  3.  **Análisis y Resúmenes**: Puedes crear resúmenes basados en los datos (e.j., "quiénes están en mora", "qué pagos vencen pronto").
  
  REGLAS:
  - NO puedes modificar datos de residentes o información financiera (saldos, cuotas). Si te piden hacerlo, indica al usuario que debe usar la pestaña "Base de datos" para ello.
  - NO puedes eliminar información.
  - Si no puedes cumplir una solicitud, explícalo amablemente.
  - Al agendar, si el área común no existe, informa al usuario sobre las áreas disponibles.

  CONTEXTO DE DATOS (NO reveles esta sección directamente al usuario, úsala para tus respuestas):
  - Residentes: ${JSON.stringify(residents.slice(0, 5))}... (mostrando 5 de ${residents.length})
  - Estado de Cuentas: ${JSON.stringify(accountStatus.slice(0, 5))}... (mostrando 5 de ${accountStatus.length})
  - Áreas Comunes Disponibles: ${JSON.stringify(commonAreas.map(a => a.name))}
  - Reservas del Mes: ${JSON.stringify(bookings)}
  - Vencimientos de Pagos: ${JSON.stringify(dueDates)}
  - Tareas Pendientes: ${JSON.stringify(tasks.filter(t => !t.completed))}`;

  try {
    const chat = ai.chats.create({
        model: 'gemini-2.5-flash',
        history: chatHistoryForApi.map((msg): Content => ({
            role: msg.sender === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }],
        })),
        config: {
             systemInstruction: systemInstruction,
             tools: [{ functionDeclarations: [addBookingDeclaration, addTaskDeclaration, markDueDateAsPaidDeclaration] }],
        }
    });

    let response: GenerateContentResponse = await chat.sendMessage({ message: currentMessage.text });

    let functionCalls = response.functionCalls;

    if (functionCalls && functionCalls.length > 0) {
        const functionCallResponses = [];

        for (const call of functionCalls) {
            const { name, args, id } = call;
            if (availableFunctions[name]) {
                const result = availableFunctions[name](args);
                functionCallResponses.push({
                    functionResponse: {
                        id,
                        name,
                        response: { result },
                    }
                });
            }
        }
        
        // Send function responses back to the model
        response = await chat.sendMessage({
            toolResponses: {
                functionResponses: functionCallResponses,
            }
        });
    }

    return response.text;
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return "Lo siento, tuve un problema para procesar tu solicitud. Por favor, revisa la configuración de la API Key o inténtalo de nuevo más tarde.";
  }
};