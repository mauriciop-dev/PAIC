
import React from 'react';

const tasks = [
    { id: 1, task: 'Contactar a plomero para cotización de arreglo en torre 2', dueDate: '2024-06-25', completed: false },
    { id: 2, task: 'Preparar informe de cartera para la asamblea', dueDate: '2024-07-01', completed: false },
    { id: 3, task: 'Comprar bombillos para pasillos', dueDate: '2024-06-22', completed: true },
    { id: 4, task: 'Revisar contrato de vigilancia', dueDate: '2024-06-28', completed: false },
    { id: 5, task: 'Enviar comunicado sobre uso de piscina', dueDate: '2024-06-20', completed: true },
];

const PendingTasksView: React.FC = () => {
  return (
    <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tareas Pendientes</h2>
        <p className="text-gray-600 mb-6">
            Agrega tareas pendientes y deja que el asistente de IA te recuerde y te ayude a completarlas.
        </p>
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Agregar Nueva Tarea</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <input type="text" placeholder="Describe la tarea..." className="flex-1 w-full p-2 border border-gray-300 rounded-md" />
                <input type="date" className="w-full sm:w-auto p-2 border border-gray-300 rounded-md" />
                <button className="px-4 py-2 w-full sm:w-auto bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors">
                    Agregar
                </button>
            </div>
        </div>
      
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className={`p-4 rounded-lg flex items-center gap-4 ${task.completed ? 'bg-green-50' : 'bg-white shadow-sm'}`}>
            <input type="checkbox" checked={task.completed} readOnly className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300"/>
            <div className="flex-1">
              <p className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{task.task}</p>
              <p className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-500'}`}>Vence: {task.dueDate}</p>
            </div>
            {!task.completed && (
                <button className="text-sm text-blue-600 hover:underline">Marcar como completada</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingTasksView;
