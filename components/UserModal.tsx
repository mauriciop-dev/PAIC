import React, { useState, useEffect } from 'react';
import { PlatformUser, UserRole, UserRoleDefinition } from '../types';
import { Icon } from './ui/Icon';

interface UserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (user: PlatformUser) => void;
  userToEdit: PlatformUser | null;
  availableRoles: UserRoleDefinition[];
}

const UserModal: React.FC<UserModalProps> = ({ isOpen, onClose, onSave, userToEdit, availableRoles }) => {
  const [formData, setFormData] = useState<Partial<PlatformUser>>({
    name: '',
    email: '',
    phone: '',
    role: UserRole.Guard,
    password: '',
  });

  const isNewUser = !userToEdit;

  useEffect(() => {
    if (userToEdit) {
      setFormData({
        id: userToEdit.id,
        name: userToEdit.name,
        email: userToEdit.email,
        phone: userToEdit.phone || '',
        role: userToEdit.role,
        password: '', // Password field is for changing, not displaying
      });
    } else {
      // Reset for new user
      setFormData({
        name: '',
        email: '',
        phone: '',
        role: UserRole.Guard,
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
    if(isNewUser && formData.role === UserRole.Guard && !formData.password){
        alert("La contraseña es obligatoria para nuevos usuarios 'Portero'.");
        return;
    }
    onSave(formData as PlatformUser);
  };

  const allRoles = [
      { id: UserRole.Admin, name: UserRole.Admin },
      { id: UserRole.Guard, name: UserRole.Guard },
      ...availableRoles,
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
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">Teléfono</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" />
            </div>
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Rol</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md bg-white" required>
                {allRoles.map(role => (
                    <option key={role.id} value={role.name}>{role.name}</option>
                ))}
              </select>
               <p className="text-xs text-gray-500 mt-1">El rol 'Administrador' solo puede iniciar sesión con Google.</p>
            </div>
             <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">Contraseña</label>
              <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" placeholder={isNewUser ? "Obligatorio para rol 'Portero'" : "Dejar en blanco para no cambiar"} />
            </div>
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
