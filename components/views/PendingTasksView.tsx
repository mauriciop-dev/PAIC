import React, { useState, useEffect } from 'react';
import { dataStore } from '../../data/dataStore';
import { Task } from '../../types';

const PendingTasksView: React.FC = () => {
    const [tasks, setTasks] = useState<Task[]>(dataStore.getTasks());
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [editingTask, setEditingTask] = useState<Task | null>(null);

    useEffect(() => {
        const handleStoreChange = () => {
            setTasks(dataStore.getTasks());
        };
        const unsubscribe = dataStore.subscribe(handleStoreChange);
        return () => unsubscribe();
    }, []);

    const handleAddTask = () => {
        if (!newTaskText.trim()) return;
        const newTask: Omit<Task, 'id'> = {
            text: newTaskText,
            dueDate: newTaskDate,
            completed: false,
        };
        dataStore.addTask(newTask);
        setNewTaskText('');
        setNewTaskDate('');
    };
    
    const handleUpdateTask = () => {
        if (!editingTask || !editingTask.text.trim()) return;
        dataStore.updateTask(editingTask);
        setEditingTask(null);
    }

    const handleToggleComplete = (task: Task) => {
        dataStore.updateTask({ ...task, completed: !task.completed });
    };

    const handleDelete = (id: number) => {
        if (window.confirm('¿Estás seguro de que quieres eliminar esta tarea?')) {
            dataStore.deleteTask(id);
        }
    };
    
    const startEditing = (task: Task) => {
        setEditingTask({ ...task });
    };

    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed === b.completed) {
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return a.completed ? 1 : -1;
    });

  return (
    <div>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestión de Tareas</h2>
        <p className="text-gray-600 mb-6">
            Agrega y gestiona tus tareas. También puedes usar el asistente de IA para añadir recordatorios.
        </p>
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Agregar Nueva Tarea</h3>
            <div className="flex flex-col sm:flex-row items-center gap-4">
                <input 
                    type="text" 
                    placeholder="Describe la tarea..." 
                    className="flex-1 w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    value={newTaskText}
                    onChange={(e) => setNewTaskText(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
                />
                <input 
                    type="date" 
                    className="w-full sm:w-auto p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:outline-none"
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
      
      <div className="space-y-3">
        {sortedTasks.map(task => (
            <div key={task.id} className={`p-4 rounded-lg flex items-start gap-4 transition-colors ${task.completed ? 'bg-gray-50' : 'bg-white shadow-sm'}`}>
                <input 
                    type="checkbox" 
                    checked={task.completed} 
                    onChange={() => handleToggleComplete(task)}
                    className="h-5 w-5 mt-1 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer flex-shrink-0"
                />
                <div className="flex-1">
                    {editingTask?.id === task.id ? (
                        <input
                            type="text"
                            value={editingTask.text}
                            onChange={(e) => setEditingTask({...editingTask, text: e.target.value})}
                            onBlur={handleUpdateTask}
                            onKeyPress={(e) => e.key === 'Enter' && handleUpdateTask()}
                            className="font-medium text-gray-800 bg-yellow-100 p-1 rounded-md w-full focus:outline-none"
                            autoFocus
                        />
                    ) : (
                        <p 
                            className={`font-medium cursor-pointer ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}
                            onClick={() => !task.completed && startEditing(task)}
                        >
                            {task.text}
                        </p>
                    )}
                    <p className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-500'}`}>{task.dueDate ? `Vence: ${task.dueDate}` : 'Sin fecha'}</p>
                </div>
                <div className="flex gap-2">
                    <button 
                        onClick={() => handleDelete(task.id)}
                        className="text-sm text-gray-400 hover:text-red-600"
                        aria-label="Eliminar tarea"
                    >
                        Eliminar
                    </button>
                </div>
            </div>
        ))}
        {sortedTasks.length === 0 && (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm">
                <p>¡No hay tareas pendientes! Agrega una nueva para empezar.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default PendingTasksView;