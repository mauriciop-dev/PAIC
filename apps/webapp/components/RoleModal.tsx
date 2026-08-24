import React, { useState, useEffect } from 'react';
import { UserRoleDefinition, Tab, PlatformUser, UserRole } from '../types';
import { Icon } from './ui/Icon';

interface RoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (role: UserRoleDefinition, userIdToAssign?: number) => Promise<void>;
  userToEdit: PlatformUser;
  allRoles: UserRoleDefinition[];
  error?: string | null;
}

const allPermissions = Object.values(Tab);

const getBasePermissions = (roleName: UserRole | string): Tab[] => {
    switch (roleName) {
        case 'Guard': return [Tab.Seguridad];
        case 'Contador': return [Tab.Finanzas];
        default: return [];
    }
};

const RoleModal: React.FC<RoleModalProps> = ({ isOpen, onClose, onSave, userToEdit, allRoles, error }) => {
  const [permissions, setPermissions] = useState<Tab[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  
  useEffect(() => {
    if (userToEdit) {
        const customRole = allRoles.find(r => r.name === userToEdit.role);
        if (customRole) {
            setPermissions(customRole.permissions);
        } else {
            setPermissions(getBasePermissions(userToEdit.role));
        }
    }
  }, [userToEdit, allRoles, isOpen]);

  if (!isOpen || !userToEdit) return null;

  const handlePermissionChange = (permission: Tab) => {
      setPermissions(prev => 
        prev.includes(permission)
          ? prev.filter(p => p !== permission)
          : [...prev, permission]
      );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
        const customRoleName = `Personalizado para ${userToEdit.name}`;
        const existingRole = allRoles.find(r => r.name === userToEdit.role && r.name.startsWith('Personalizado para'));

        const finalData: UserRoleDefinition = {
            id: existingRole?.id || '',
            name: customRoleName,
            permissions: permissions
        };
        await onSave(finalData, userToEdit.id);
        // On success, the parent component will close the modal.
    } catch (e) {
        // Error is handled by parent component and passed back via props
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl p-8 w-11/12 md:w-1/2 lg:w-1/3 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
          <Icon name="x" className="w-6 h-6"/>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Permisos para {userToEdit.name}</h2>
        <p className="text-sm text-gray-500 mb-6">Selecciona los módulos a los que este usuario tendrá acceso.</p>
        
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <div className="mt-2 grid grid-cols-2 gap-3 border border-gray-200 p-4 rounded-md max-h-60 overflow-y-auto">
                    {allPermissions.map(perm => (
                        <label key={perm} htmlFor={`perm-${perm}`} className="flex items-center p-2 rounded-md hover:bg-gray-50 cursor-pointer">
                            <input
                                id={`perm-${perm}`}
                                type="checkbox"
                                checked={permissions.includes(perm)}
                                onChange={() => handlePermissionChange(perm)}
                                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                            />
                            <span className="ml-3 block text-sm font-medium text-gray-800">{perm}</span>
                        </label>
                    ))}
                </div>
            </div>
            {error && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-md border border-red-200">{error}</p>}
          <div className="mt-8 flex justify-end gap-4">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">Cancelar</button>
            <button type="submit" disabled={isSaving} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:bg-blue-300">
                {isSaving ? 'Guardando...' : 'Guardar Permisos'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RoleModal;