
// This is a mock service to simulate Gemini API responses.
// In a real application, this would make network requests to a backend.
import { GoogleGenAI } from "@google/genai";

// Note: API_KEY is handled by the environment and should not be managed in the UI.
// This is a placeholder for the logic that would run on a backend server.
// const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const getChatResponse = async (prompt: string): Promise<string> => {
    console.log("Sending to mock Gemini:", prompt);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lowerCasePrompt = prompt.toLowerCase();

    if (lowerCasePrompt.includes('estado de cuenta')) {
        return `Claro, puedo ayudarte con el estado de cuenta.
        
¿Deseas consultarlo para un residente y enviárselo (opción 1) o verlo tú como administrador (opción 2)?`;
    }

    if (lowerCasePrompt.includes('mantenimiento')) {
        return `Entendido, necesitas una solicitud de mantenimiento.
        
Por favor, dime la especialidad requerida (ej. Plomero, Electricista, Carpintero, etc.).`;
    }

    if (lowerCasePrompt.includes('zonas comunes') || lowerCasePrompt.includes('reservar')) {
        return `Perfecto, gestionemos la reserva de una zona común.
        
Primero, por favor, indícame el número de apartamento que realiza la solicitud.`;
    }

    if (lowerCasePrompt.includes('enviar comunicación') || lowerCasePrompt.includes('comunicado')) {
        return `Puedo ayudarte a enviar una comunicación.
        
¿A quién deseas enviarla? (ej. a todos los residentes, a los proveedores, a los trabajadores internos, o a alguien en particular).`;
    }

    if (lowerCasePrompt.includes('documentación') || lowerCasePrompt.includes('revisar documento')) {
        return `Aquí están los documentos disponibles en la base de datos:
        
1. Reglamento de Propiedad Horizontal.pdf
2. Acta de Asamblea General 2023.pdf
3. Manual de Convivencia.pdf

¿Cuál de ellos quieres revisar?`;
    }
    
    if (lowerCasePrompt.includes('actualizar base de datos')) {
        return `¡Atención! Estás a punto de modificar la base de datos central. Los cambios son importantes y afectarán la información de la plataforma.
        
Por favor, confirma si deseas continuar:
1. Proceder con la modificación.
2. Detener y ver el tutorial.`;
    }
    
    if (lowerCasePrompt.includes('hola') || lowerCasePrompt.includes('ayuda')) {
        return `¡Hola! Soy PAIC. Puedo ayudarte con las siguientes tareas:

1. Revisar el estado de cuenta.
2. Enviar solicitudes de mantenimiento.
3. Programar el uso de áreas comunes.
4. Enviar comunicaciones a residentes.
5. Revisar documentación interna.
6. Actualizar información de la base de datos.

¿En qué te puedo ayudar?`;
    }

    return "Lo siento, no entendí tu solicitud. Por favor, intenta de nuevo o elige una de las opciones principales como 'revisar estado de cuenta' o 'enviar comunicación'.";
};
