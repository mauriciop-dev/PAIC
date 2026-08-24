import { FunctionDeclaration, Type } from "@google/genai";

// --- Resident Management ---
const addResident: FunctionDeclaration = {
    name: 'addResident',
    description: "Agrega un nuevo residente a la base de datos.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            apartment: { type: Type.STRING, description: "Número del apartamento. Ej: 101, 202A" },
            name: { type: Type.STRING },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
        },
        required: ["apartment", "name", "email", "phone"]
    }
};

const updateResident: FunctionDeclaration = {
    name: 'updateResident',
    description: "Actualiza la información de un residente existente, identificado por su número de apartamento.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            apartment: { type: Type.STRING, description: "Número del apartamento a modificar." },
            data: {
                type: Type.OBJECT,
                properties: {
                    name: { type: Type.STRING },
                    email: { type: Type.STRING },
                    phone: { type: Type.STRING },
                },
                description: "Objeto con los campos a actualizar."
            }
        },
        required: ["apartment", "data"]
    }
};

const deleteResident: FunctionDeclaration = {
    name: 'deleteResident',
    description: "Elimina un residente de la base de datos, identificado por su número de apartamento.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            apartment: { type: Type.STRING, description: "Número del apartamento del residente a eliminar." },
        },
        required: ["apartment"]
    }
};

// --- Provider Management ---
const addProvider: FunctionDeclaration = {
    name: 'addProvider',
    description: "Agrega un nuevo proveedor de servicios a la base de datos.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            company: { type: Type.STRING, description: "Nombre de la empresa o del proveedor." },
            specialty: { type: Type.STRING, description: "Especialidad del proveedor. Ej: Plomería, Electricista" },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
        },
        required: ["company", "specialty", "email", "phone"]
    }
};

const updateProvider: FunctionDeclaration = {
    name: 'updateProvider',
    description: "Actualiza la información de un proveedor, identificado por el nombre de la empresa.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            company: { type: Type.STRING, description: "Nombre de la empresa del proveedor a modificar." },
            data: {
                type: Type.OBJECT,
                properties: {
                    specialty: { type: Type.STRING },
                    email: { type: Type.STRING },
                    phone: { type: Type.STRING },
                },
                description: "Objeto con los campos a actualizar."
            }
        },
        required: ["company", "data"]
    }
};

const deleteProvider: FunctionDeclaration = {
    name: 'deleteProvider',
    description: "Elimina un proveedor de la base de datos, identificado por el nombre de la empresa.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            company: { type: Type.STRING, description: "Nombre de la empresa del proveedor a eliminar." },
        },
        required: ["company"]
    }
};

// --- Internal Staff Management ---
const addInternalStaff: FunctionDeclaration = {
    name: 'addInternalStaff',
    description: "Agrega un nuevo miembro del personal interno (ej: todero, jardinero).",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING },
            position: { type: Type.STRING, description: "Cargo del miembro del personal." },
            email: { type: Type.STRING },
            phone: { type: Type.STRING },
        },
        required: ["name", "position", "email", "phone"]
    }
};

const updateInternalStaff: FunctionDeclaration = {
    name: 'updateInternalStaff',
    description: "Actualiza la información de un miembro del personal, identificado por su nombre.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Nombre del miembro del personal a modificar." },
            data: {
                type: Type.OBJECT,
                properties: {
                    position: { type: Type.STRING },
                    email: { type: Type.STRING },
                    phone: { type: Type.STRING },
                },
                description: "Objeto con los campos a actualizar."
            }
        },
        required: ["name", "data"]
    }
};

const deleteInternalStaff: FunctionDeclaration = {
    name: 'deleteInternalStaff',
    description: "Elimina un miembro del personal de la base de datos, identificado por su nombre.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            name: { type: Type.STRING, description: "Nombre del miembro del personal a eliminar." },
        },
        required: ["name"]
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
        // Database Management
        addResident,
        updateResident,
        deleteResident,
        addProvider,
        updateProvider,
        deleteProvider,
        addInternalStaff,
        updateInternalStaff,
        deleteInternalStaff,
        // Other functionalities
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
