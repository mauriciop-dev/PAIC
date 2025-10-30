import { Message, Resident, AccountStatus, Booking, UserProfile } from "../types";
import { dataStore } from '../data/dataStore';
import { GoogleGenAI } from "@google/genai";

// FIX: This logic makes the app work seamlessly in both Vercel (using import.meta.env for build-time secrets)
// and the AI Studio dev environment (using process.env for runtime secrets).
// It prevents crashes by safely checking for the existence of each environment's secret variable.
// @ts-ignore - `process` is a global available in the AI Studio environment, but not in standard browser types.
const apiKey = import.meta.env?.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' && process.env?.API_KEY);

if (!apiKey) {
  console.error("Gemini API key is not configured for the current environment. Please set VITE_GEMINI_API_KEY in Vercel or ensure API_KEY is available in AI Studio.");
}
// Initialize with the found key, or an empty string to prevent crashes if the key is missing.
const ai = new GoogleGenAI({ apiKey: apiKey || "" });

// This is a mock service to simulate a stateful Gemini API response based on the new, detailed rules.
const getInitialGreeting = (userName?: string) => {
    const name = userName ? `, ${userName.split(' ')[0]}` : '';
    return `¡Hola${name}! Soy PAIC, tu asistente virtual. Puedo ayudarte con las siguientes tareas:

1. Revisar el estado de cuenta.
2. Enviar solicitudes de mantenimiento.
3. Programar el uso de áreas comunes.
4. Enviar comunicaciones a residentes.
5. Revisar documentación interna.
6. Actualizar información de la base de datos.

¿En qué te puedo ayudar?`;
};


const createMailtoLink = (to: string, subject: string, body: string): string => {
    // Replace markdown bold with plain text for email body
    const plainBody = body.replace(/\*\*(.*?)\*\*/g, '$1');
    return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(plainBody)}`;
};

// Helper to simulate a formatted email body for the chat response
const formatEmailResponse = (subject: string, body: string, recipientEmail: string): string => {
    const mailtoLink = createMailtoLink(recipientEmail, subject, body);
    
    const intro = `He preparado el siguiente correo electrónico para ser enviado a **${recipientEmail}**:`;

    return `${intro}
---
**Asunto:** ${subject}

**Cuerpo:**
${body}
---
[Haz clic aquí para abrir y enviar el correo desde tu aplicación de email.](${mailtoLink})

¿Hay algo más en lo que pueda ayudar?`;
};

const findDataByApartment = (aptNumber: string): { resident: Resident | undefined, account: AccountStatus | undefined } => {
    const residents = dataStore.getResidents();
    const accounts = dataStore.getAccountStatus();
    const resident = residents.find(r => r.apartment === aptNumber);
    const account = accounts.find(a => a.apartment === aptNumber);
    return { resident, account };
};

const extractApartmentNumber = (text: string): string | null => {
    const match = text.match(/\d{3,}/); // Find 3 or more digits
    return match ? match[0] : null;
};


export const getChatResponse = async (prompt: string, messages: Message[], userName?: string): Promise<string> => {
    if (!apiKey) {
        return "Error de configuración: La clave de la API no está disponible. Por favor, contacte al administrador.";
    }
    const lowerCasePrompt = prompt.toLowerCase().trim();
    const lastAiMessage = messages.filter(m => m.sender === 'ai').pop()?.text.toLowerCase() || '';
    const initialGreeting = getInitialGreeting(userName);

    // --- NEW: CONTEXT-AWARE QUERY ENGINE ---
    const queryKeywords = ['cuándo', 'quien', 'quién', 'muéstrame', 'mostrar', 'ver las reservas', 'está ocupado', 'reservas de'];
    const isQuery = queryKeywords.some(k => lowerCasePrompt.includes(k)) && !lastAiMessage.includes('reservar');

    if (isQuery) {
        console.log("AI is in QUERY mode.");
        const bookings = dataStore.getBookings();

        if (bookings.length === 0) {
            return "Actualmente no hay ninguna reserva en el calendario de áreas comunes.";
        }

        const systemInstruction = `Eres PAIC, un asistente de administración de conjuntos residenciales. Tu tarea es responder la pregunta del usuario basándote ESTRICTAMENTE en los datos de las reservas actuales que te proporciono en formato JSON. No inventes información. Si la pregunta no se puede responder con los datos, indica que no tienes esa información. Los datos son: ${JSON.stringify(bookings)}`;
        
        try {
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: {
                    systemInstruction: systemInstruction,
                }
            });
            return response.text;
        } catch (error) {
            console.error("Error calling Gemini API for query:", error);
            return "Lo siento, tuve un problema al consultar la información. Por favor, inténtalo de nuevo.";
        }
    }

    console.log("AI is in COMMAND mode.");
    // Simulate network delay for command flows
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // --- GENERAL CANCELLATION & HELP ---
    if (['cancelar', 'detener', 'volver al menú'].includes(lowerCasePrompt)) {
        return `Proceso cancelado. ¿En qué más puedo ayudarte?\n\n${initialGreeting.split('\n\n')[1]}`;
    }
    
    // --- CONTEXT-AWARE COMMAND RESPONSES (PRIORITY) ---
    
    // --- FLOW 1: ESTADO DE CUENTA (REFACTORED & FIXED) ---
    // Step 3: User chose to email or view in chat
    if (lastAiMessage.includes('por correo al residente o verla aquí en el chat')) {
        const aptMatch = lastAiMessage.match(/apto \*\*(\d+)\*\*/);
        const aptNumber = aptMatch ? aptMatch[1] : null;

        if (!aptNumber) {
            return "Parece que hubo un error y perdí el número de apartamento. ¿Podría indicármelo de nuevo, por favor?";
        }

        const { resident, account } = findDataByApartment(aptNumber);
        if (!resident || !account) return `No encontré información para el apartamento **${aptNumber}**. Por favor, verifique el número.`;

        if (lowerCasePrompt.includes('1') || lowerCasePrompt.includes('correo')) {
            const emailBody = `Señor(a) **${resident.name}**,

De acuerdo a su solicitud a continuación presentamos la información relacionada al estado de cuenta de pago de administración para el apartamento **${aptNumber}**.

- Apartamento: **${aptNumber}**
- Nombre: **${resident.name}**
- Ultimo pago: **${account.lastPaymentDate}**
- Estado: **${resident.status}**
- Saldo: **$${account.outstandingBalance.toLocaleString()}**

Como ya es costumbre, agradecemos su pago oportuno y recordamos que este pago se ve reflejado en bienestar para todos quienes residimos en el conjunto.`;
            return formatEmailResponse(`Estado de cuenta Administración - Apto ${aptNumber}`, emailBody, resident.email);
        }
        if (lowerCasePrompt.includes('2') || lowerCasePrompt.includes('ver aquí') || lowerCasePrompt.includes('chat')) {
             return `Aquí está el estado de cuenta del apartamento **${aptNumber}**:
- Saldo pendiente: $${account.outstandingBalance.toLocaleString()}
- Cuotas en mora: ${account.pendingInstallments}
- Fecha último pago: ${account.lastPaymentDate}

¿Hay algo más en lo que pueda ayudar?`;
        }
        return "Opción no válida. Por favor, elija '1' para enviar correo o '2' para ver en el chat.";
    }

    // Step 2: User provided an apartment number
    if (lastAiMessage.includes('indíqueme el número de apartamento')) {
        const aptNumber = extractApartmentNumber(prompt);
        if (!aptNumber) return "No pude identificar un número de apartamento. Por favor, inténtelo de nuevo.";
        
        const { resident, account } = findDataByApartment(aptNumber);
        if (!resident || !account) return `No encontré información para el apartamento **${aptNumber}**. Por favor, verifique el número.`;
        
        return `Encontré la información para el apto **${aptNumber}**. ¿Desea que se la envíe por correo al residente o verla aquí en el chat?\n1. Enviar correo\n2. Ver aquí`;
    }

    // Step 1: User chose between "residente" or "administrador"
    if (lastAiMessage.includes('residente o 2. quiere verlo el como administrador')) {
        if (lowerCasePrompt.includes('1') || lowerCasePrompt.includes('residente')) {
            return "Entendido. Para enviarle la información al residente, por favor, indíqueme el número de apartamento que desea consultar.";
        }
        if (lowerCasePrompt.includes('2') || lowerCasePrompt.includes('administrador')) {
            return "Entendido. Para mostrarle la información, por favor, indíqueme el número de apartamento que desea consultar.";
        }
        return "Opción no válida. Por favor, responde '1' para residente o '2' para administrador.";
    }

    if (lastAiMessage.includes('envíe esta información al correo del administrador')) {
        if (lowerCasePrompt.includes('sí') || lowerCasePrompt.includes('si')) {
            return "Entendido. Le he enviado el resumen a su correo. ¿Puedo ayudarle en algo más?";
        }
        return "De acuerdo. ¿Hay algo más en lo que pueda ayudarle?";
    }

    // --- FLOW 2: MANTENIMIENTO (No changes, as it doesn't depend on resident data yet) ---
    if (lastAiMessage.includes('especialidad quieres enviar el correo')) {
        return `Gracias. Ahora, por favor, describa brevemente la situación (Ej. 'arreglo eléctrico en el 305' o 'presentarse en administración').`;
    }
    if (lastAiMessage.includes('describa brevemente la situación')) {
        return `Recibido. He encontrado los siguientes proveedores para la especialidad solicitada: 
1. Maestro Plomero SAS
2. Plomería Express 24/7
Por favor, seleccione el proveedor al que desea enviar la solicitud.`;
    }
    if (lastAiMessage.includes('seleccione el proveedor al que desea enviar')) {
        if (lowerCasePrompt.includes('1') || lowerCasePrompt.includes('maestro')) {
           return `¿Confirma que desea enviar la solicitud a 'Maestro Plomero SAS'?`;
        }
        if (lowerCasePrompt.includes('2') || lowerCasePrompt.includes('express')) {
            return `¿Confirma que desea enviar la solicitud a 'Plomería Express 24/7'?`;
        }
        return `No he podido identificar al proveedor. Por favor, seleccione '1' o '2'.`
    }
     if (lastAiMessage.includes('confirma que desea enviar la solicitud a')) {
        if (lowerCasePrompt.includes('sí') || lowerCasePrompt.includes('si') || lowerCasePrompt.includes('confirmo')) {
            const providerNameMatch = lastAiMessage.match(/'([^']+)'/);
            const providerName = providerNameMatch ? providerNameMatch[1] : 'el proveedor seleccionado';
            return `Solicitud enviada a '${providerName}' con copia al Administrador y a la Contadora. El proveedor se pondrá en contacto pronto. ¿Algo más?`;
        }
        return "Proceso cancelado. Puede iniciar una nueva solicitud de mantenimiento cuando lo desee.";
    }

    // --- FLOW 3: ZONAS COMUNES (NOW FUNCTIONAL) ---
     if (lastAiMessage.includes('número de apartamento que realiza la solicitud')){
         const aptNumber = extractApartmentNumber(prompt);
         if (!aptNumber) return "No pude identificar un número de apartamento. Por favor, inténtelo de nuevo.";
         const { resident } = findDataByApartment(aptNumber);
         if (!resident) return `El apartamento **${aptNumber}** no parece existir en la base de datos. Por favor verifique.`;
         return `Entendido, apartamento **${aptNumber}**. ¿Qué espacio van a requerir? (Ej. BBQ, Gimnasio, Salón Comunal, etc.)`;
    }
    if (lastAiMessage.includes('qué espacio van a requerir')) {
        return `Perfecto, **${prompt}**. Ahora, por favor, indique el día (solo el número), la hora de inicio y la hora de finalización. (Ej: 25, 2pm a 6pm)`;
    }
    if (lastAiMessage.includes('indique el día (solo el número), la hora de inicio y la hora de finalización')) {
        const aptMatch = lastAiMessage.match(/apartamento \*\*(\d+)\*\*/);
        const aptNumber = aptMatch ? aptMatch[1] : 'N/A';
        
        const spaceMatch = lastAiMessage.match(/perfecto, \*\*(.*?)\*\*/);
        const space = spaceMatch ? spaceMatch[1] : 'Área Común';

        const parts = prompt.split(',');
        const day = parseInt(parts[0]?.trim(), 10);
        const time = parts[1]?.trim() || 'hora no especificada';

        if (isNaN(day)) {
            return "No pude entender el día. Por favor, indique solo el número del día. (Ej: 25, 2pm a 6pm)";
        }
        
        const newBooking: Booking = {
            day: day,
            time: time,
            event: space.charAt(0).toUpperCase() + space.slice(1),
            user: `Apt ${aptNumber}`
        };

        dataStore.addBooking(newBooking);

        return `He verificado la disponibilidad y el espacio está libre. He creado el evento en el calendario con los detalles proporcionados. El cambio se reflejará en la pestaña 'Áreas comunes'. ¿Necesita algo más?`;
    }

    // --- FLOW 4: COMUNICACIONES ---
    if (lastAiMessage.includes('indíqueme el número de apartamento al que desea enviar la comunicación')) {
        const aptNumber = extractApartmentNumber(prompt);
        if (!aptNumber) return "No pude identificar un número de apartamento. Por favor, inténtelo de nuevo.";
        const { resident } = findDataByApartment(aptNumber);
        if (!resident) return `No encontré información para el apartamento **${aptNumber}**. Por favor, verifique el número.`;
        return `Perfecto, se enviará la comunicación al apartamento **${aptNumber}**. Ahora, por favor, ¿Cuál es la comunicación que desea enviar? (Escriba el texto completo del mensaje).`;
    }
    if (lastAiMessage.includes('a quién quiere enviar la comunicación')) {
        if (lowerCasePrompt.includes('residentes')) {
            return `¿Desea enviar a todos los residentes o aplicar una **Segmentación Inteligente** (ej. 'los que están al día' o 'los que deben 2 cuotas')?`;
        }
        if (lowerCasePrompt.includes('alguien en particular') || lowerCasePrompt.includes('un apartamento') || lowerCasePrompt.includes('apartamento específico')) {
            return "Entendido. Por favor, indíqueme el número de apartamento al que desea enviar la comunicación.";
        }
        return `Entendido. Ahora, por favor, ¿Cuál es la comunicación que desea enviar? (Escriba el texto completo del mensaje).`;
    }
    if (lastAiMessage.includes('segmentación inteligente')) {
        let filteredResidents: Resident[] = [];
        const allResidents = dataStore.getResidents();
        if (lowerCasePrompt.includes('al día')) {
            filteredResidents = allResidents.filter(r => r.status === 'Al día');
        } else if (lowerCasePrompt.includes('en mora') || lowerCasePrompt.includes('deben')) {
            const match = lowerCasePrompt.match(/(\d+)\s*cuota/);
            if (match) {
                const numCuotas = parseInt(match[1], 10);
                filteredResidents = allResidents.filter(r => r.overdue_installments >= numCuotas);
            } else {
                filteredResidents = allResidents.filter(r => r.status === 'En mora');
            }
        }
        
        if (filteredResidents.length > 0) {
            return `Aplicando filtro para: **${prompt}**. Se enviará a **${filteredResidents.length}** residentes. Ahora, por favor, ¿Cuál es la comunicación que desea enviar? (Escriba el texto completo del mensaje).`;
        } else {
             return `No encontré residentes que coincidan con el filtro: **${prompt}**. Por favor, intente con otro criterio o escriba 'todos' para enviar a todos los residentes.`;
        }
    }
    if (lastAiMessage.includes('cuál es la comunicación que desea enviar')) {
        return `Este es el mensaje que redactó:\n\n_"${prompt}"_\n\n¿Desea enviarlo tal cual lo escribió o prefiere que le haga unos ajustes de redacción?`;
    }
    if (lastAiMessage.includes('ajustes de redacción')) {
        if (lowerCasePrompt.includes('tal cual')) {
            return `Mensaje enviado a la lista de destinatarios seleccionada. He copiado al administrador. ¿Algo más en lo que pueda ayudar?`;
        }
        return `Aquí tiene una versión ajustada: "Estimados residentes, les recordamos amablemente que...". ¿Aprueba el envío de esta versión?`;
    }
    if (lastAiMessage.includes('aprueba el envío de esta versión')) {
        return `Mensaje enviado con la versión ajustada. He copiado al administrador. ¿Algo más en lo que pueda ayudar?`;
    }

    // --- FLOW 5: REVISAR DOCUMENTACION (No changes) ---
    if (lastAiMessage.includes('listado de los archivos que hay dentro de la carpeta')) {
        return `Entendido. He encontrado que el "Reglamento de Propiedad Horizontal.pdf" trata sobre las normas de convivencia, el uso de áreas comunes y las responsabilidades de los propietarios. ¿Desea un resumen de alguna sección en particular o el enlace para abrir el documento?`;
    }
    if (lastAiMessage.includes('resumen de alguna sección en particular o el enlace')) {
        return `Claro, aquí tienes el enlace para que puedas revisarlo en detalle: [link_al_documento.pdf]. ¿Hay algo más que necesites?`;
    }

    // --- FLOW 6: ACTUALIZAR BASE DE DATOS (NOW FUNCTIONAL) ---
    if (lastAiMessage.includes('confirma si deseas continuar')) {
        if (lowerCasePrompt === '1' || lowerCasePrompt.includes('proceder')) {
            return "¿Cuál base de datos quiere modificar? 1. Residentes, 2. Proveedores, o 3. Internos.";
        }
        if (lowerCasePrompt === '2' || lowerCasePrompt.includes('detener')) {
            return "Proceso detenido. Si necesita ayuda, puedo mostrarle un video tutorial sobre cómo realizar este procedimiento. ¿Desea ver el video? (https://www.youtube.com/watch?v=aQ9mIPAAjjU&t=2s)";
        }
        return "Opción no válida. Por favor, indique '1' para proceder o '2' para detener."
    }
     if (lastAiMessage.includes('cuál base de datos quiere modificar')) {
         if (lowerCasePrompt.includes('1') || lowerCasePrompt.includes('residentes')) {
             return "Entendido. ¿Para qué número de apartamento desea actualizar la información?";
         }
        return "Esa funcionalidad aún está en desarrollo. Por ahora solo puedo actualizar la base de datos de Residentes.";
    }
    if (lastAiMessage.includes('qué número de apartamento desea actualizar la información')) {
         const aptNumber = extractApartmentNumber(prompt);
         if (!aptNumber) return "No pude identificar un número de apartamento. Por favor, inténtelo de nuevo.";
         const { resident } = findDataByApartment(aptNumber);
         if (!resident) return `No encontré información para el apartamento **${aptNumber}**. Por favor, verifique el número.`;
         
         return `La información actual para el apartamento **${aptNumber}** es:
- Propietario: **${resident.name}**
- Teléfono: **${resident.phone}**
- Correo: **${resident.email}**

¿Iniciamos la actualización? 1. si 2. no`;
    }
    if (lastAiMessage.includes('iniciamos la actualización? 1. si 2. no')) {
        const aptMatch = lastAiMessage.match(/apartamento \*\*(\d+)\*\*/);
        const aptNumber = aptMatch ? aptMatch[1] : null;

        if (!aptNumber) {
            return "Hubo un error, no pude identificar el apartamento. Por favor, reinicie el proceso de actualización.";
        }

        if (lowerCasePrompt === '1' || lowerCasePrompt.includes('si')) {
            return `Perfecto. Actualizando apartamento **${aptNumber}**. Por favor, indíqueme el nuevo nombre, teléfono y correo electrónico, separados por comas. (Ej: Ana García, 3001112233, ana.g@email.com)`;
        }
        return "Actualización cancelada. Aquí tiene un video tutorial por si lo necesita más adelante: https://www.youtube.com/watch?v=aQ9mIPAAjjU&t=2s";
    }
    if (lastAiMessage.includes('indíqueme el nuevo nombre, teléfono y correo electrónico, separados por comas')) {
        const aptMatch = lastAiMessage.match(/apartamento \*\*(\d+)\*\*/);
        const aptNumber = aptMatch ? aptMatch[1] : null;

        if (!aptNumber) {
            return "Hubo un error. No pude recordar el número de apartamento. Por favor, empecemos de nuevo el proceso de actualización.";
        }

        const parts = prompt.split(',').map(p => p.trim());
        if (parts.length !== 3) {
            return "La información no parece estar en el formato correcto. Por favor, asegúrese de proveer nombre, teléfono y correo, separados por comas.";
        }
        
        const [name, phone, email] = parts;
        
        const residentToUpdate = dataStore.getResidents().find(r => r.apartment === aptNumber);
        if (residentToUpdate) {
            const updatedResident = { ...residentToUpdate, name, phone, email };
            dataStore.updateResident(updatedResident);
            return `¡Perfecto! La información del apartamento **${aptNumber}** ha sido actualizada en la base de datos. Puede verificarlo en la pestaña 'Base de datos'. ¿Puedo ayudarle en algo más?`;
        } else {
            return `No pude encontrar el residente del apartamento **${aptNumber}** para actualizar. Por favor, verifique el número.`;
        }
    }

    // --- KEYWORD-BASED TRIGGERS TO START FLOWS ---
    const option1Keywords = ['estado de cuenta', 'mi saldo', 'cuánto debo', 'estado de pago', 'opción 1', /^1$/];
    const option2Keywords = ['mantenimiento', 'plomero', 'electricista', 'carpintero', 'vidrios', 'problema en el 305', 'reportar una falla', 'solicitud de proveedor', 'opción 2', /^2$/];
    const option3Keywords = ['gimnasio', 'reservar', 'salón social', 'agendar el bbq', 'hacer una reserva', 'alquiler de zonas comunes', 'opción 3', /^3$/];
    const option4Keywords = ['comunicado', 'comunicación a residentes', 'enviar un correo', 'segmentación inteligente', 'mandar un aviso', 'opción 4', /^4$/];
    const option5Keywords = ['documentación', 'reglamento', 'buscar en los archivos', 'documentación del conjunto', 'manual', 'opción 5', /^5$/];
    const option6Keywords = ['actualizar la base de datos', 'cambiar un residente', 'modificar proveedor', 'actualizar datos', 'modificar un registro', 'opción 6', /^6$/];

    const matchesKeyword = (keywords: (string | RegExp)[]) => keywords.some(keyword => 
        typeof keyword === 'string' ? lowerCasePrompt.includes(keyword) : keyword.test(lowerCasePrompt)
    );

    if (matchesKeyword(option1Keywords)) {
        const aptNumber = extractApartmentNumber(lowerCasePrompt);
        if (aptNumber) {
            const { resident, account } = findDataByApartment(aptNumber);
            if (!resident || !account) return `No encontré información para el apartamento **${aptNumber}**. Por favor, verifique el número.`;
            return `Encontré la información para el apto **${aptNumber}**. ¿Desea que se la envíe por correo al residente o verla aquí en el chat?\n1. Enviar correo\n2. Ver aquí`;
        }
        return `Claro, puedo ayudarte con el estado de cuenta. ¿Desea que la información se la envíe al 1. residente o 2. quiere verlo el como administrador?`;
    }
    if (matchesKeyword(option2Keywords)) {
        const specialties = ['plomero', 'electricista', 'carpintero', 'vidrios'];
        const foundSpecialty = specialties.find(s => lowerCasePrompt.includes(s));
        if (foundSpecialty) {
            return `Entendido, necesita una solicitud de mantenimiento para **${foundSpecialty}**. Ahora, por favor, describa brevemente la situación (Ej. 'arreglo eléctrico en el 305' o 'presentarse en administración').`;
        }
        return `Entendido, necesita una solicitud de mantenimiento. ¿Para qué especialidad quieres enviar el correo? (Ej: Carpintero, Vidrios, Plomero, Electricista, etc.)`;
    }
    if (matchesKeyword(option3Keywords)) {
        return `Perfecto, gestionemos la reserva de una zona común. ¿Cuál es el número de apartamento que realiza la solicitud?`;
    }
    if (matchesKeyword(option4Keywords)) {
        return `Puedo ayudarte a enviar una comunicación. ¿A quién quiere enviar la comunicación? (Opciones: trabajadores internos, proveedores, residentes o alguien en particular).`;
    }
    if (matchesKeyword(option5Keywords)) {
        return `Aquí está el listado de los archivos que hay dentro de la carpeta de documentación:
1. Reglamento de Propiedad Horizontal.pdf
2. Acta de Asamblea General 2023.pdf
3. Manual de Convivencia.pdf

¿Cuál de ellos quiere revisar?`;
    }
    if (matchesKeyword(option6Keywords)) {
        return `¡Atención! Estás a punto de modificar la base de datos central. Los cambios son importantes y afectarán la información de la plataforma.
Por favor, confirma si deseas continuar:
1. proceder 
2. detener`;
    }

    if (lowerCasePrompt.includes('hola') || lowerCasePrompt.includes('ayuda')) {
        return initialGreeting;
    }

    // Fallback if no context or keyword matches
    return "Lo siento, no entendí tu solicitud. Por favor, intenta de nuevo o escribe 'ayuda' para ver las opciones principales.";
};