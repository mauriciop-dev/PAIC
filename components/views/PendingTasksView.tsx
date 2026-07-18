import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/apiService';
import { Task, UserProfile } from '../../types';
import ConfirmModal from '../ConfirmModal';
import { Icon } from '../ui/Icon';

interface PendingTasksViewProps {
    userProfile: UserProfile;
}

const PendingTasksView: React.FC<PendingTasksViewProps> = ({ userProfile }) => {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [newTaskText, setNewTaskText] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const [deleteTarget, setDeleteTarget] = useState<number | null>(null);

    const fetchData = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        try {
            // FIX: Pass conjuntoId to fetchTasks.
            const fetchedTasks = await apiService.fetchTasks(userProfile.conjuntoId);
            setTasks(fetchedTasks);
        } catch(error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile.conjuntoId]);
    
    const handleRefresh = async () => {
        setIsRefreshing(true);
        await fetchData();
        setIsRefreshing(false);
    };

    const handleAddTask = async () => {
        if (!newTaskText.trim() || !userProfile.conjuntoId) return;
        const newTask: Omit<Task, 'id'> = {
            text: newTaskText,
            dueDate: newTaskDate,
            completed: false,
        };
        // FIX: Pass conjuntoId to addTask.
        await apiService.addTask(userProfile.conjuntoId, newTask);
        setNewTaskText('');
        setNewTaskDate('');
        fetchData();
    };
    
    const handleUpdateTask = async () => {
        if (!editingTask || !editingTask.text.trim() || !userProfile.conjuntoId) return;
        // FIX: Pass conjuntoId to updateTask.
        await apiService.updateTask(userProfile.conjuntoId, editingTask);
        setEditingTask(null);
        fetchData();
    }

    const handleToggleComplete = async (task: Task) => {
        if (!userProfile.conjuntoId) return;
        // FIX: Pass conjuntoId to updateTask.
        await apiService.updateTask(userProfile.conjuntoId, { ...task, completed: !task.completed });
        fetchData();
    };

    const handleDelete = async (id: number) => {
        if (!userProfile.conjuntoId) return;
        await apiService.deleteTask(userProfile.conjuntoId, id);
        fetchData();
        setDeleteTarget(null);
    };
    
    const startEditing = (task: Task) => {
        setEditingTask({ ...task });
    };
    
    const handleEditingChange = (field: 'text' | 'dueDate', value: string) => {
        if(editingTask) {
            setEditingTask({...editingTask, [field]: value});
        }
    }

    const sortedTasks = [...tasks].sort((a, b) => {
        if (a.completed === b.completed) {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        return a.completed ? 1 : -1;
    });

  return (
    <div className="space-y-6">
        <div className="flex justify-between items-start">
            <p className="text-gray-600 max-w-2xl">
                Agrega y gestiona tus tareas. También puedes usar el asistente de IA para añadir recordatorios.
            </p>
            <button onClick={handleRefresh} className="p-2 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100" aria-label="Refrescar tareas">
                <Icon name="refresh-cw" className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-md">
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
      
        <div id="panel-tareas" className="space-y-3">
        {isLoading ? (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm">Cargando tareas...</div>
        ) : sortedTasks.length > 0 ? (
            sortedTasks.map(task => (
                <div key={task.id} className={`p-4 rounded-lg flex items-start gap-4 transition-colors ${task.completed ? 'bg-gray-50' : 'bg-white shadow-sm'}`}>
                    <input 
                        type="checkbox" 
                        checked={task.completed} 
                        onChange={() => handleToggleComplete(task)}
                        className="h-5 w-5 mt-1 rounded text-blue-600 focus:ring-blue-500 border-gray-300 cursor-pointer flex-shrink-0"
                    />
                    <div className="flex-1">
                        {editingTask?.id === task.id ? (
                            <div className="space-y-2">
                                <input
                                    type="text"
                                    value={editingTask.text}
                                    onChange={(e) => handleEditingChange('text', e.target.value)}
                                    onBlur={handleUpdateTask}
                                    onKeyPress={(e) => e.key === 'Enter' && handleUpdateTask()}
                                    className="font-medium text-gray-800 bg-yellow-100 p-1 rounded-md w-full focus:outline-none"
                                    autoFocus
                                />
                                 <input
                                    type="date"
                                    value={editingTask.dueDate}
                                    onChange={(e) => handleEditingChange('dueDate', e.target.value)}
                                    onBlur={handleUpdateTask}
                                    className="text-sm text-gray-500 bg-yellow-100 p-1 rounded-md w-full sm:w-auto focus:outline-none"
                                />
                            </div>
                        ) : (
                            <div onClick={() => !task.completed && startEditing(task)} className="cursor-pointer">
                                <p className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-800'}`}>
                                    {task.text}
                                </p>
                                <p className={`text-sm ${task.completed ? 'text-gray-400' : 'text-gray-500'}`}>{task.dueDate ? `Vence: ${task.dueDate}` : 'Sin fecha'}</p>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setDeleteTarget(task.id)}
                            className="text-sm text-gray-400 hover:text-red-600"
                            aria-label="Eliminar tarea"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            ))
        ) : (
            <div className="text-center py-10 text-gray-500 bg-white rounded-lg shadow-sm">
                <p>¡No hay tareas pendientes! Agrega una nueva para empezar.</p>
            </div>
        )}
      </div>
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar Tarea"
        message="¿Estás seguro de que quieres eliminar esta tarea?"
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget !== null && handleDelete(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default PendingTasksView;