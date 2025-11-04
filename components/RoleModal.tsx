import React, { useState, useEffect } from 'react';
import { UserRoleDefinition, Tab } from '../types';
import { Icon } from './ui/Icon';

interface RoleModalProps {
  isOpen: boolean;
  roleToEdit: UserRoleDefinition | null;
  onClose: () => void;
  onSave: (role: UserRoleDefinition) => void;
}

const allPermissions = Object.values(Tab);

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, roleToEdit, onClose, onSave }) => {
  const [formData, setFormData] = useState<Partial<UserRoleDefinition>>({});
  const isNew = !roleToEdit;

  useEffect(() => {
    if (roleToEdit) {
      setFormData(roleToEdit);
    } else {
      setFormData({
        id: '',
        name: '',
        permissions: [],
      });
    }
  }, [roleToEdit, isOpen]);

  if (!isOpen) return null;

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handlePermissionChange = (permission: Tab) => {
      const currentPermissions = formData.permissions || [];
      const newPermissions = currentPermissions.includes(permission)
        ? currentPermissions.filter(p => p !== permission)
        : [...currentPermissions, permission];
      setFormData(prev => ({ ...prev, permissions: newPermissions }));
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if(!formData.name) return;
    const finalData = {
        ...formData,
        id: isNew ? formData.name!.toLowerCase().replace(' ', '-') : roleToEdit.id,
    }
    onSave(finalData as UserRoleDefinition);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{isNew ? 'Agregar Permisos' : 'Editar Permisos'}</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Nombre del Rol</label>
                <input type="text" id="name" name="name" value={formData.name || ''} onChange={handleTextChange} className="mt-1 w-full p-2 border border-gray-300 rounded-md" required />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700">Permisos</label>
                <div className="mt-2 grid grid-cols-2 gap-2 border border-gray-200 p-2 rounded-md max-h-48 overflow-y-auto">
                    {allPermissions.map(perm => (
                        <div key={perm} className="flex items-center">
                            <input
                                id={`perm-${perm}`}
                                type="checkbox"
                                checked={formData.permissions?.includes(perm) || false}
                                onChange={() => handlePermissionChange(perm)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                            />
                            <label htmlFor={`perm-${perm}`} className="ml-2 block text-sm text-gray-900">{perm}</label>
                        </div>
                    ))}
                </div>
            </div>
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">Guardar</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;