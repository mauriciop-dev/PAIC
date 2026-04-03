import { GoogleGenAI, Chat, GenerateContentResponse, FunctionCall } from "@google/genai";
import { apiService } from './apiService';
// FIX: Added missing types to ensure proper casting and type safety.
import { UserProfile, ConjuntoInfo, Income, Expense, VisitorLog, Resident, Provider, PackageLog, InternalStaff } from "../types";
import { geminiTools } from './geminiTools';

let aiPromise: Promise<GoogleGenAI> | null = null;
let chat: Chat | null = null;
let currentConjuntoId: string | null = null;
let systemPromptTemplate: string | null = null;

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
            console.log("Gemini requested function calls:", functionCalls);
            return await processFunctionCalls(functionCalls);
        }
        
        if (!response.text) {
            console.warn("Gemini returned an empty response.");
            return "Recibí una respuesta vacía del asistente. Por favor, intenta de nuevo.";
        }

        return response.text;
    } catch (error: any) {
        console.error("Error during chat execution:", error);
        if (error.message?.includes('API_KEY_INVALID')) {
            return "La API Key de Gemini parece ser inválida. Por favor, revísala en la configuración.";
        }
        return `Lo siento, tuve un problema al procesar tu solicitud: ${error.message || 'Error desconocido'}`;
    }
};

const processFunctionCalls = async (functionCalls: FunctionCall[]): Promise<string> => {
    if (!functionCalls || functionCalls.length === 0) {
        return "No se recibieron instrucciones claras del asistente.";
    }

    const call = functionCalls[0];
    const { name, args } = call;
    console.log(`Executing function call: ${name}`, args);

    const userProfile = (chat as any)?.userProfile as UserProfile;
    const conjuntoInfo = (chat as any)?.conjuntoInfo as ConjuntoInfo;

    if (!currentConjuntoId) {
        console.error("Context error: currentConjuntoId is missing in processFunctionCalls");
        return "Error de contexto: no se pudo determinar el conjunto actual.";
    }
    
    try {
        apiService.logChatbotInteraction(currentConjuntoId).catch(e => console.warn("Failed to log interaction:", e));

        switch (name) {
            // --- Resident Management ---
            case 'addResident': {
                const residentArgs = args as unknown as Resident;
                if (!residentArgs || !residentArgs.apartment) throw new Error("Faltan datos del residente (apartamento).");
                await apiService.addResident(currentConjuntoId, residentArgs);
                return `¡Confirmado! Residente para el apto **${residentArgs.apartment}** agregado exitosamente.`;
            }
            case 'updateResident': {
                const { apartment, data } = args as unknown as { apartment: string, data: Partial<Resident> };
                if (!apartment) throw new Error("Falta el número de apartamento.");
                const existingResident = await apiService.fetchResidentByApartment(currentConjuntoId, apartment);
                if (!existingResident) throw new Error(`No se encontró un residente en el apartamento ${apartment}.`);
                await apiService.updateResident(currentConjuntoId, { ...existingResident, ...data });
                return `¡Confirmado! La información del residente del apto **${apartment}** ha sido actualizada.`;
            }
            case 'deleteResident': {
                const { apartment } = args as unknown as { apartment: string };
                if (!apartment) throw new Error("Falta el número de apartamento.");
                await apiService.deleteResident(currentConjuntoId, apartment);
                return `¡Confirmado! El residente del apto **${apartment}** ha sido eliminado.`;
            }

            // --- Provider Management ---
            case 'addProvider': {
                const providerArgs = args as unknown as Omit<Provider, 'id'>;
                if (!providerArgs || !providerArgs.company) throw new Error("Faltan datos del proveedor (empresa).");
                await apiService.addProvider(currentConjuntoId, providerArgs);
                return `¡Confirmado! Proveedor **${providerArgs.company}** agregado exitosamente.`;
            }
            case 'updateProvider': {
                const { company, data } = args as unknown as { company: string, data: Partial<Provider> };
                if (!company) throw new Error("Falta el nombre de la empresa.");
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
                if (!company) throw new Error("Falta el nombre de la empresa.");
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
                const staffArgs = args as unknown as InternalStaff;
                if (!staffArgs || !staffArgs.name) throw new Error("Faltan datos del personal (nombre).");
                await apiService.addInternalStaff(currentConjuntoId, staffArgs);
                return `¡Confirmado! Miembro del personal **${staffArgs.name}** agregado exitosamente.`;
            }
            case 'updateInternalStaff': {
                const { name, data } = args as unknown as { name: string, data: Partial<InternalStaff> };
                if (!name) throw new Error("Falta el nombre de la persona.");
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
                if (!name) throw new Error("Falta el nombre de la persona.");
                const staffList = await apiService.fetchInternalStaff(currentConjuntoId);
                const matchingStaff = staffList.filter(s => s.name.toLowerCase() === name.toLowerCase());
                if (matchingStaff.length === 0) throw new Error(`No se encontró un miembro del personal llamado "${name}".`);
                if (matchingStaff.length > 1) return `Encontré varias personas llamadas "${name}". Por favor, proporciona más detalles para identificar a la persona correcta.`;
                await apiService.deleteInternalStaff(currentConjuntoId, name);
                return `¡Confirmado! El miembro del personal **${name}** ha sido eliminado.`;
            }

            case 'createReservation': {
                const reservationArgs = args as unknown as { commonAreaName: string; apartment: string; date: string; startTime: string; endTime: string; };
                if (!reservationArgs.commonAreaName || !reservationArgs.apartment || !reservationArgs.date) {
                    throw new Error("Faltan datos para crear la reserva (área, apartamento o fecha).");
                }
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
                if (!group || !subject || !body) throw new Error("Faltan datos para enviar el correo masivo.");
                const result = await apiService.sendMassEmail(currentConjuntoId, group, subject, body);
                return result.message;
            }

            case 'addIncome': {
                const incomeArgs = args as unknown as Omit<Income, 'id'>;
                if (!incomeArgs.amount || !incomeArgs.description) throw new Error("Faltan datos del ingreso (monto o descripción).");
                await apiService.addIncome(currentConjuntoId, incomeArgs);
                return `Ingreso de $${incomeArgs.amount.toLocaleString()} por "${incomeArgs.description}" agregado. ¿Necesitas algo más?`;
            }
            
            case 'addExpense': {
                const expenseArgs = args as unknown as Omit<Expense, 'id'>;
                if (!expenseArgs.amount || !expenseArgs.description) throw new Error("Faltan datos del gasto (monto o descripción).");
                await apiService.addExpense(currentConjuntoId, expenseArgs);
                 return `Gasto de $${expenseArgs.amount.toLocaleString()} por "${expenseArgs.description}" agregado. ¿Necesitas algo más?`;
            }
            
            case 'authorizeVisitor': {
                const visitorArgs = args as unknown as { visitorName: string, apartment: string, date: string };
                if (!visitorArgs.visitorName || !visitorArgs.apartment) throw new Error("Faltan datos del visitante.");
                await apiService.addVisitorLog(currentConjuntoId, {...visitorArgs, status: 'Autorizado'});
                return `Visitante "${visitorArgs.visitorName}" autorizado para el Apto ${visitorArgs.apartment}.`;
            }
            
            case 'registerPackage': {
                const packageArgs = args as unknown as Partial<PackageLog>;
                if (!packageArgs.apartment || !packageArgs.courier) throw new Error("Faltan datos del paquete.");
                await apiService.addPackageLog(currentConjuntoId, packageArgs);
                return `Paquete de "${packageArgs.courier}" para el Apto ${packageArgs.apartment} registrado.`;
            }
           
            case 'updateVisitorStatus': {
                const { logId, status } = args as unknown as { logId: number, status: string };
                if (!logId || !status) throw new Error("Faltan datos para actualizar el estado del visitante.");
                const newStatus = status as VisitorLog['status'];
                if (!['Autorizado', 'Ingresó', 'Salió'].includes(newStatus)) {
                    return `El estado "${newStatus}" no es válido. Los estados permitidos son: Autorizado, Ingresó, Salió.`;
                }
                await apiService.updateVisitorLog(currentConjuntoId, logId, { status: newStatus });
                return `Estado del visitante actualizado a "${status}".`;
            }

            default:
                 return `No entendí la acción: ${name}.`;
        }
    } catch (error: any) {
        console.error(`Error executing function ${name}:`, error);
        return `Lo siento, no pude completar la operación. Motivo: ${error.message || 'Error desconocido'}`;
    } finally {
        if (userProfile && conjuntoInfo) {
            await initializeChat(userProfile, conjuntoInfo);
        }
    }
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

export const geminiService = {
    runChat,
    generateSubject,
    improveWriting,
};
