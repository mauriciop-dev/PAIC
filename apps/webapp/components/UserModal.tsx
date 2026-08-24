import React, { useState, useEffect } from 'react';
import { PlatformUser, UserRole, UserRoleDefinition } from '../types';
import { Icon } from './ui/Icon';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: PlatformUser) => void;
  userToEdit: PlatformUser | null;
  availableRoles: UserRoleDefinition[];
  error?: string | null;
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, userToEdit, availableRoles, error }) => {
  const [formData, setFormData] = useState<Partial<PlatformUser>>({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'Guard',
    password: '',
  });

  const isNewUser = !userToEdit || !userToEdit.id;

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        id: userToEdit.id,
        name: userToEdit.name,
        email: userToEdit.email,
        phoneNumber: userToEdit.phoneNumber || '',
        role: userToEdit.role,
        password: '', // Password field is for changing, not displaying
      });
    } else {
      // Reset for new user
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        role: 'Guard',
        password: '',
      });
    }
  }, [userToEdit, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isNewUser && (!formData.password || formData.password.trim().length === 0)) {
        alert("La contraseña es obligatoria para usuarios nuevos.");
        return;
    }
    if (formData.password && formData.password.length > 0 && formData.password.length < 6) {
        alert("La contraseña debe tener al menos 6 caracteres.");
        return;
    }
    onSave(formData as PlatformUser);
  };
  
  // Filter out custom roles that are just for permissions to not clutter the dropdown
  const predefinedRoles = availableRoles.filter(r => !r.name.startsWith('Personalizado para'));

  const allRoleOptions = [
      { name: 'Guard' },
      { name: 'Contador' },
      ...predefinedRoles,
  ];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {isNewUser ? 'Agregar Nuevo Usuario' : 'Editar Usuario'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre Completo</label>
              <input type="text" id="name" name="name" value={formData.name} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Correo Electrónico</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber || ''} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white" required>
                {allRoleOptions.map(role => (
                    <option key={role.name} value={role.name}>{role.name}</option>
                ))}
              </select>
               <p className="text-xs text-gray-500 mt-1">Para asignar permisos personalizados, hazlo desde la pestaña 'Permisos de usuario'.</p>
            </div>
             <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                value={formData.password} 
                onChange={handleChange} 
                className="mt-1 w-full p-2 border border-gray-300 rounded-md" 
                placeholder={isNewUser ? "Contraseña (obligatoria)" : "Dejar en blanco para no cambiar"}
              />
            </div>
             {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
          </div>
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;