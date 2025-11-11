
import React, { useState, useEffect } from 'react';
import { StoredFile } from '../types';
import { apiService } from '../services/apiService';
import { Icon } from './ui/Icon';

interface FileSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjuntoId: string;
  onSelectFiles: (selectedFiles: StoredFile[]) => void;
  currentSelection: StoredFile[];
}

const FileSelectorModal: React.FC<FileSelectorModalProps> = ({ isOpen, onClose, conjuntoId, onSelectFiles, currentSelection }) => {
  const [allFiles, setAllFiles] = useState<StoredFile[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<StoredFile[]>(currentSelection);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!conjuntoId) return;
      setIsLoading(true);
      try {
        const data = await apiService.listFilesForConjunto(conjuntoId);
        setAllFiles(data);
      } catch (error) {
        console.error("Failed to fetch files for selection", error);
      } finally {
        setIsLoading(false);
      }
    };
    if (isOpen) {
      fetchFiles();
      setSelectedFiles(currentSelection);
    }
  }, [isOpen, conjuntoId, currentSelection]);

  if (!isOpen) return null;
  
  const handleToggleSelection = (file: StoredFile) => {
    setSelectedFiles(prev => 
        prev.some(f => f.id === file.id)
            ? prev.filter(f => f.id !== file.id)
            : [...prev, file]
    );
  };

  const handleSubmit = () => {
    onSelectFiles(selectedFiles);
    onClose();
  };
  
  const bytesToSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-11/12 md:w-2/3 lg:w-1/2 relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b border-gray-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
            <Icon name="x" className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Seleccionar Archivos</h2>
          <p className="text-sm text-gray-600">Elige los documentos que deseas adjuntar al comunicado.</p>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-500">Cargando archivos...</div>
          ) : allFiles.length > 0 ? (
            <div className="space-y-2">
              {allFiles.map(file => (
                <label key={file.id} htmlFor={`file-${file.id}`} className="flex items-center p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    id={`file-${file.id}`}
                    checked={selectedFiles.some(f => f.id === file.id)}
                    onChange={() => handleToggleSelection(file)}
                    className="h-5 w-5 rounded text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="ml-4 flex-1">
                    <p className="font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-500">{bytesToSize(file.size)} - {new Date(file.createdAt).toLocaleDateString('es-CO')}</p>
                  </div>
                </label>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 p-10">No hay archivos en el repositorio. Ve a la sección "Archivos" para subirlos.</p>
          )}
        </div>

        <footer className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end gap-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
            Cancelar
          </button>
          <button type="button" onClick={handleSubmit} className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700">
            Adjuntar ({selectedFiles.length}) Archivo(s)
          </button>
        </footer>
      </div>
    </div>
  );
};

export default FileSelectorModal;