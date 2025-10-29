import { Message } from "../types";

// This is a mock service to simulate a stateful Gemini API response based on the new, detailed rules.

const initialGreeting = `¡Hola! Soy PAIC, tu asistente virtual. Puedo ayudarte con las siguientes tareas:

1. Revisar el estado de cuenta.
2. Enviar solicitudes de mantenimiento.
3. Programar el uso de áreas comunes.
4. Enviar comunicaciones a residentes.
5. Revisar documentación interna.
6. Actualizar información de la base de datos.

¿En qué te puedo ayudar?`;

// Helper to simulate a formatted email body for the chat response
const formatEmailResponse = (subject: string, body: string): string => {
    return `He preparado el siguiente correo electrónico para ser enviado:
---
**Asunto:** ${subject}

**Cuerpo:**
${body}
---
El correo ha sido enviado exitosamente. ¿Hay algo más en lo que pueda ayudar?`;
};


export const getChatResponse = async (prompt: string, messages: Message[]): Promise<string> => {
    console.log("Sending to mock Gemini with updated prompt logic:", prompt);
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const lowerCasePrompt = prompt.toLowerCase().trim();
    // Getting the last AI message (in lowercase) is key for context
    const lastAiMessage = messages.filter(m => m.sender === 'ai').pop()?.text.toLowerCase() || '';

    // --- GENERAL CANCELLATION & HELP ---
    if (['cancelar', 'detener', 'volver al menú'].includes(lowerCasePrompt)) {
        return `Proceso cancelado. ¿En qué más puedo ayudarte?\n\n${initialGreeting.split('\n\n')[1]}`;
    }
    
    // --- CONTEXT-AWARE RESPONSES ---
    // By checking the last AI message, we can create conversational flows.
    // All checks are now case-insensitive and target key phrases.

    // --- FLOW 1: ESTADO DE CUENTA ---
    if (lastAiMessage.includes('1. residente o 2. quiere verlo el como administrador')) {
        if (lowerCasePrompt === '1' || lowerCasePrompt.includes('residente')) {
            return "Entendido, se enviará al residente. Por favor, indique el número de apartamento.";
        }
        if (lowerCasePrompt === '2' || lowerCasePrompt.includes('administrador')) {
            return "Entendido, se mostrará en el chat. Por favor, indique el número de apartamento.";
        }
        return "Respuesta no válida. Por favor, indique '1' para enviar al residente o '2' para verlo en el chat.";
    }
    if (lastAiMessage.includes('indique el número de apartamento')) {
        const prevAiMessage = messages.filter(m => m.sender === 'ai').slice(-2)[0]?.text.toLowerCase() || '';
        
        // Context: Estado de cuenta
        if (prevAiMessage.includes('1. residente o 2. quiere verlo el como administrador')) {
            const userChoiceForDestination = messages.filter(m => m.sender === 'user').slice(-1)[0]?.text.toLowerCase();
            
            if (userChoiceForDestination.includes('1') || userChoiceForDestination.includes('residente')) { // Send to resident
                const emailBody = `Señor **Juan Perez**

De acuerdo a su solicitud a continuación presentamos la información relacionada al estado de cuenta de pago de administración para el apartamento **${prompt}**.

- Apartamento: **${prompt}**
- Nombre: **Juan Perez**
- Ultimo pago: **2024-06-05**
- Estado: **Al día**
- Saldo: **$0**

Como ya es costumbre, agradecemos su pago oportuno y recordamos que este pago se ve reflejado en bienestar para todos quienes residimos en el conjunto.`;
                return formatEmailResponse(`Estado de cuenta Administración - Apto ${prompt}`, emailBody);
            }
            if (userChoiceForDestination.includes('2') || userChoiceForDestination.includes('administrador')) { // Show to admin
                return `Aquí está el estado de cuenta del apartamento **${prompt}**:
- Saldo pendiente: $150.000
- Cuotas en mora: 3
- Fecha último pago: 2024-03-05

¿Desea que también le envíe esta información a su correo electrónico?`;
            }
        }
        // Context: Zonas Comunes
        if (prevAiMessage.includes('número de apartamento que realiza la solicitud')){
             return `Entendido, apartamento **${prompt}**. ¿Qué espacio van a requerir? (Ej. BBQ, Gimnasio, Salón Comunal, etc.)`;
        }
        // Context: DB Update
        if (prevAiMessage.includes('cuál base de datos quiere modificar')) {
             return `La información actual para el apartamento **${prompt}** es:
- Propietario: Juan Perez
- Teléfono: 3001234567
- Correo: juan.perez@email.com

¿Iniciamos la actualización? 1. si 2. no`;
        }
    }
    if (lastAiMessage.includes('envíe esta información a su correo electrónico')) {
        if (lowerCasePrompt.includes('sí') || lowerCasePrompt.includes('si')) {
            return "Entendido. Le he enviado el resumen a su correo. ¿Puedo ayudarle en algo más?";
        }
        return "De acuerdo. ¿Hay algo más en lo que pueda ayudarle?";
    }

    // --- FLOW 2: MANTENIMIENTO ---
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

    // --- FLOW 3: ZONAS COMUNES ---
    if (lastAiMessage.includes('qué espacio van a requerir')) {
        return `Perfecto, **${prompt}**. Ahora, por favor, indique el día, la hora de inicio y la hora de finalización.`;
    }
    if (lastAiMessage.includes('indique el día, la hora de inicio y la hora de finalización')) {
        return `He verificado la disponibilidad y el espacio está libre. He creado el evento en el calendario con los detalles proporcionados. Se ha enviado una confirmación por correo al residente y al administrador. ¿Necesita algo más?`;
    }

    // --- FLOW 4: COMUNICACIONES ---
    if (lastAiMessage.includes('a quién quiere enviar la comunicación')) {
        if (lowerCasePrompt.includes('residentes')) {
            return `¿Desea enviar a todos los residentes o aplicar una **Segmentación Inteligente** (ej. 'los que están al día' o 'los que deben 2 cuotas')?`;
        }
        return `Entendido. Ahora, por favor, ¿Cuál es la comunicación que desea enviar? (Escriba el texto completo del mensaje).`;
    }
    if (lastAiMessage.includes('segmentación inteligente')) {
        return `Aplicando filtro para: **${prompt}**. Ahora, por favor, ¿Cuál es la comunicación que desea enviar? (Escriba el texto completo del mensaje).`;
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

    // --- FLOW 5: REVISAR DOCUMENTACION ---
    if (lastAiMessage.includes('listado de los archivos que hay dentro de la carpeta')) {
        return `Entendido. He encontrado que el "Reglamento de Propiedad Horizontal.pdf" trata sobre las normas de convivencia, el uso de áreas comunes y las responsabilidades de los propietarios. ¿Desea un resumen de alguna sección en particular o el enlace para abrir el documento?`;
    }
    if (lastAiMessage.includes('resumen de alguna sección en particular o el enlace')) {
        return `Claro, aquí tienes el enlace para que puedas revisarlo en detalle: [link_al_documento.pdf]. ¿Hay algo más que necesites?`;
    }

    // --- FLOW 6: ACTUALIZAR BASE DE DATOS ---
    if (lastAiMessage.includes('1. proceder 2. detener')) {
        if (lowerCasePrompt === '1' || lowerCasePrompt.includes('proceder')) {
            return "¿Cuál base de datos quiere modificar? 1. Residentes, 2. Proveedores, o 3. Internos.";
        }
        if (lowerCasePrompt === '2' || lowerCasePrompt.includes('detener')) {
            return "Proceso detenido. Si necesita ayuda, puedo mostrarle un video tutorial sobre cómo realizar este procedimiento. ¿Desea ver el video? (https://www.youtube.com/watch?v=aQ9mIPAAjjU&t=2s)";
        }
        return "Opción no válida. Por favor, indique '1' para proceder o '2' para detener."
    }
   
    if (lastAiMessage.includes('iniciamos la actualización? 1. si 2. no')) {
        if (lowerCasePrompt === '1' || lowerCasePrompt.includes('si')) {
            return "Perfecto. Por favor, indíqueme únicamente el nombre del nuevo propietario.";
        }
        return "Actualización cancelada. Aquí tiene un video tutorial por si lo necesita más adelante: https://www.youtube.com/watch?v=aQ9mIPAAjjU&t=2s";
    }
    if (lastAiMessage.includes('nombre del nuevo propietario')) {
        return "Nombre actualizado. Ahora, el número de teléfono.";
    }
    if (lastAiMessage.includes('ahora, el número de teléfono')) {
        return "Teléfono actualizado. Finalmente, el correo electrónico.";
    }
    if (lastAiMessage.includes('finalmente, el correo electrónico')) {
        return `Correo actualizado. La información del apartamento ha sido modificada exitosamente. ¿Puedo ayudarle en algo más?`;
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
