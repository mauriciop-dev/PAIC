import { GoogleGenAI } from "@google/genai";
import { UserProfile, ConjuntoInfo } from '../types';

// Per guidelines, initialize with API_KEY from environment variables.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Using a recommended model for complex text tasks.
const model = 'gemini-2.5-pro';

// The system prompt is now embedded directly to avoid fetch errors that cause a blank screen.
const systemPromptTemplate = `Eres PAIC, un asistente IA experto en la administración de conjuntos residenciales en Colombia.
Tu propósito es ayudar al administrador, {{userName}}, a gestionar el conjunto "{{conjuntoName}}".
Responde en español, de forma concisa y profesional. Utiliza la información de contexto que se te proporciona.
NO inventes información. Si no sabes la respuesta o no tienes la información, indícalo claramente.

Aquí está el menú de opciones que le presentaste al usuario:
{{initialAiMessage}}`;

/**
 * Constructs the system prompt with dynamic data.
 * @param userName The name of the administrator.
 * @param conjuntoName The name of the residential complex.
 * @param initialAiMessage The initial welcome message shown to the user.
 * @returns The fully constructed system prompt.
 */
const getSystemPrompt = (userName: string, conjuntoName: string, initialAiMessage: string): string => {
    // Replace placeholders with dynamic data
    return systemPromptTemplate
        .replace('{{userName}}', userName)
        .replace('{{conjuntoName}}', conjuntoName)
        .replace('{{initialAiMessage}}', initialAiMessage);
};


const runChat = async (
    currentInput: string,
    userProfile: UserProfile | null,
    conjuntoInfo: ConjuntoInfo | null,
    initialAiMessage?: string
): Promise<string> => {
    if (!userProfile || !conjuntoInfo) {
        return "No tengo suficiente información para responder. Por favor, asegúrate de haber iniciado sesión.";
    }

    try {
        const systemInstruction = getSystemPrompt(userProfile.name, conjuntoInfo.name, initialAiMessage || '');
        
        const response = await ai.models.generateContent({
            model: model,
            contents: currentInput,
            config: {
                systemInstruction,
            },
        });
        return response.text;

    } catch (error) {
        console.error("Error in Gemini API call (runChat):", error);
        return "Lo siento, tuve un problema para conectarme con mis servidores. Por favor, intenta de nuevo más tarde.";
    }
};

const generateSubject = async (body: string): Promise<string> => {
    const prompt = `Basado en el siguiente cuerpo de un correo electrónico, genera un asunto (subject) corto, profesional y descriptivo en español. El asunto no debe exceder los 70 caracteres.

    CUERPO DEL CORREO:
    "${body}"

    ASUNTO SUGERIDO:`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        // Remove quotes and extra whitespace
        return response.text.replace(/"/g, '').trim();
    } catch (error) {
        console.error("Error in Gemini API call (generateSubject):", error);
        return "Asunto no pudo ser generado";
    }
};

const improveWriting = async (body: string): Promise<string> => {
    const prompt = `Actúa como un asistente de redacción profesional. Revisa y mejora el siguiente texto para un comunicado oficial en un conjunto residencial en Colombia.
    Corrige errores gramaticales, mejora la claridad, el tono y la estructura. Mantén el mensaje original, pero hazlo más profesional y conciso.
    El resultado debe ser solo el texto mejorado, sin introducciones ni comentarios adicionales.

    TEXTO ORIGINAL:
    "${body}"

    TEXTO MEJORADO:`;

    try {
        const response = await ai.models.generateContent({
            model,
            contents: prompt,
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error in Gemini API call (improveWriting):", error);
        return body; // Return original text on error
    }
};


export const geminiService = {
    runChat,
    generateSubject,
    improveWriting,
};