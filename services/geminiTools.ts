import { FunctionDeclaration, Type } from "@google/genai";

const manageDatabase: FunctionDeclaration = {
    name: 'manageDatabase',
    description: "Gestiona registros en la base de datos (residentes, proveedores, etc.). Para cambios de propietario, usa 'edit'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            table: { type: Type.STRING, enum: ["residents", "account_status", "providers", "internal_staff"] },
            operation: { type: Type.STRING, enum: ["add", "edit", "delete"] },
            identifier: {
                type: Type.OBJECT,
                properties: {
                    apartment: { type: Type.STRING },
                    id: { type: Type.INTEGER },
                    name: { type: Type.STRING },
                }
            },
            data: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    email: { type: Type.STRING },
                    phone: { type: Type.STRING },
                    company: { type: Type.STRING },
                    specialty: { type: Type.STRING },
                    position: { type: Type.STRING },
                }
            }
        },
        required: ["table", "operation"]
    }
};

const createReservation: FunctionDeclaration = {
    name: 'createReservation',
    description: "Crea una nueva reserva para un área común. Requiere el nombre del área, apartamento, fecha y horas.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            commonAreaName: { type: Type.STRING },
            apartment: { type: Type.STRING },
            date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
            startTime: { type: Type.STRING, description: "Formato HH:mm (24h)" },
            endTime: { type: Type.STRING, description: "Formato HH:mm (24h)" },
        },
        required: ["commonAreaName", "apartment", "date", "startTime", "endTime"]
    }
};

const queryDatabase: FunctionDeclaration = {
    name: 'queryDatabase',
    description: "Consulta información específica de un registro, como el estado de cuenta de un apartamento.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            table: { type: Type.STRING, enum: ["residents", "account_status"] },
            query_description: { type: Type.STRING, description: "Descripción en lenguaje natural de la consulta." },
        },
        required: ["table", "query_description"]
    }
};

const queryProviders: FunctionDeclaration = {
    name: 'queryProviders',
    description: "Busca y lista proveedores, opcionalmente filtrados por especialidad.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            specialty: { type: Type.STRING },
        }
    }
};

const sendMassEmail: FunctionDeclaration = {
    name: 'sendMassEmail',
    description: "Envía un correo masivo a un grupo de destinatarios.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            group: { type: Type.STRING, enum: ["all", "debtors", "providers", "internal"] },
            subject: { type: Type.STRING },
            body: { type: Type.STRING },
        },
        required: ["group", "subject", "body"]
    }
};

const addIncome: FunctionDeclaration = {
    name: 'addIncome',
    description: "Registra un nuevo ingreso en las finanzas.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING, enum: ["Cuota de Administración", "Multas", "Alquiler de Áreas", "Otros"] },
            date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
        },
        required: ["description", "amount", "category", "date"]
    }
};

const addExpense: FunctionDeclaration = {
    name: 'addExpense',
    description: "Registra un nuevo gasto/egreso en las finanzas.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            description: { type: Type.STRING },
            amount: { type: Type.NUMBER },
            category: { type: Type.STRING, enum: ["Servicios", "Mantenimiento", "Nómina", "Administrativos", "Otros"] },
            date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
            providerId: { type: Type.INTEGER },
        },
        required: ["description", "amount", "category", "date"]
    }
};

const authorizeVisitor: FunctionDeclaration = {
    name: 'authorizeVisitor',
    description: "Autoriza el ingreso de un visitante para un apartamento en una fecha específica.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            visitorName: { type: Type.STRING },
            apartment: { type: Type.STRING },
            date: { type: Type.STRING, description: "Formato YYYY-MM-DD" },
        },
        required: ["visitorName", "apartment", "date"]
    }
};

const registerPackage: FunctionDeclaration = {
    name: 'registerPackage',
    description: "Registra la recepción de un paquete para un apartamento.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            apartment: { type: Type.STRING },
            courier: { type: Type.STRING },
            trackingNumber: { type: Type.STRING },
        },
        required: ["apartment", "courier"]
    }
};

const updateVisitorStatus: FunctionDeclaration = {
    name: 'updateVisitorStatus',
    description: "Actualiza el estado de un visitante a 'Ingresó' o 'Salió'.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            logId: { type: Type.INTEGER },
            status: { type: Type.STRING, enum: ["Ingresó", "Salió"] },
        },
        required: ["logId", "status"]
    }
};

const queryDebtors: FunctionDeclaration = {
    name: 'queryDebtors',
    description: "Obtiene una lista completa de todos los residentes que tienen saldo pendiente.",
    parameters: { type: Type.OBJECT, properties: {} }
};


export const geminiTools = [{
    functionDeclarations: [
        manageDatabase,
        createReservation,
        queryDatabase,
        queryProviders,
        sendMassEmail,
        addIncome,
        addExpense,
        authorizeVisitor,
        registerPackage,
        updateVisitorStatus,
        queryDebtors
    ]
}];
