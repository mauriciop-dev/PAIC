
import React, { useState } from 'react';

const initialTasks = [
    { id: 1, task: 'Contactar a plomero para cotización de arreglo en torre 2', dueDate: '2024-06-25', completed: false },
    { id: 2, task: 'Preparar informe de cartera para la asamblea', dueDate: '2024-07-01', completed: false },
    { id: 3, task: 'Comprar bombillos para pasillos', dueDate: '2024-06-22', completed: true },
    { id: 4, task: 'Revisar contrato de vigilancia', dueDate: '2024-06-28', completed: false },
    { id: 5, task: 'Enviar comunicado sobre uso de piscina', dueDate: '2024-06-20', completed: true },
];

interface Task {
    id: number;
    task: string;
    dueDate: string;
    completed: boolean;
}

const PendingTasksView: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        const newTask: Task = {
            id: Date.now(),
            task: newTaskText,
            dueDate: newTaskDate,
            completed: false,
        };
        setTasks(prevTasks => [newTask, ...prevTasks]);
        setNewTaskText('');
        setNewTaskDate('');
    };

    const handleToggleComplete = (taskId: number) => {
        setTasks(tasks.map(task =>
            task.id === taskId ? { ...task, completed: !task.completed } : task
        ));
    };

  return (
    <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Tareas Pendientes</h2>
        <p className="text-gray-600 mb-6">
            Agrega tareas pendientes y deja que el asistente de IA te recuerde y te ayude a completarlas.
        </p>
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Agregar Nueva Tarea</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <input 
                    type="text" 
                    placeholder="Describe la tarea..." 
                    className="flex-1 w-full p-2 border border-gray-300 rounded-md"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                />
                <input 
                    type="date" 
                    className="w-full sm:w-auto p-2 border border-gray-300 rounded-md"
                    value={newTaskDate}
                    onChange={(e) => setNewTaskDate(e.target.value)}
                />
                <button 
                    onClick={handleAddTask}
                    className="px-4 py-2 w-full sm:w-auto bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                    Agregar
                </button>
            </div>
        </div>
      
      <div className="space-y-4">
        {tasks.map(task => (
          <div key={task.id} className={`p-4 rounded-lg flex items-center gap-4 ${task.completed ? 'bg-green-50' : 'bg-white shadow-sm'}`}>
            <input 
                type="checkbox" 
                checked={task.completed} 
                onChange={() => handleToggleComplete(task.id)}
                className="h-5 w-5 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer"
            />
            <div className="flex-1">
              <p className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>{task.task}</p>
              <p className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-500'}`}>{task.dueDate ? `Vence: ${task.dueDate}` : 'Sin fecha'}</p>
            </div>
            {!task.completed && (
                <button 
                    onClick={() => handleToggleComplete(task.id)}
                    className="text-sm text-blue-600 hover:underline"
                >
                    Marcar como completada
                </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PendingTasksView;