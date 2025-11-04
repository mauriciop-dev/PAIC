import React, { useState, useEffect, useRef } from 'react';
import { ConjuntoInfo, StoredFile } from '../types';
import { apiService } from '../services/apiService';
import { Icon } from './ui/Icon';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjunto: ConjuntoInfo;
}

const bytesToSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
}

const FileManagerModal: React.FC<FileManagerModalProps> = ({ isOpen, onClose, conjunto }) => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    setIsLoading(true);
    try {
      const fetchedFiles = await apiService.listFilesForConjunto(conjunto.id);
      setFiles(fetchedFiles);
    } catch (error) {
      console.error("Error fetching files:", error);
      setFeedback({ type: 'error', text: 'No se pudieron cargar los archivos.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen, conjunto.id]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setFeedback(null);

    try {
      await apiService.uploadFileForConjunto(conjunto.id, file);
      setFeedback({ type: 'success', text: '¡Archivo subido exitosamente!' });
      fetchFiles(); // Refresh the list
    } catch (error: any) {
      setFeedback({ type: 'error', text: `Error al subir: ${error.message}` });
    } finally {
      setIsUploading(false);
       if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setFeedback(null), 5000);
    }
  };
  
  const handleDelete = async (fileName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${fileName}"? Esta acción no se puede deshacer.`)) {
        try {
            await apiService.deleteFileForConjunto(conjunto.id, fileName);
            setFeedback({ type: 'success', text: 'Archivo eliminado.'});
            fetchFiles(); // Refresh
        } catch (error: any) {
            setFeedback({ type: 'error', text: `Error al eliminar: ${error.message}` });
        }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-11/12 md:w-2/3 lg:w-1/2 relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b border-gray-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
            <Icon name="x" className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Archivos</h2>
          <p className="text-sm text-gray-600">Conjunto: {conjunto.name}</p>
        </header>
        
        <div className="p-6 flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
                <button
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-blue-300 flex items-center gap-2 text-sm"
                >
                    <Icon name="package" className="w-4 h-4" />
                    {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                </button>
                <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" />
                 {feedback && (
                    <p className={`text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                        {feedback.text}
                    </p>
                )}
            </div>

            <div className="border rounded-lg overflow-hidden">
                {isLoading ? (
                    <div className="p-10 text-center text-gray-500">Cargando archivos...</div>
                ) : (
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Nombre del Archivo</th>
                                <th scope="col" className="px-6 py-3">Tamaño</th>
                                <th scope="col" className="px-6 py-3">Fecha de Subida</th>
                                <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {files.length > 0 ? files.map(file => (
                                <tr key={file.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 truncate max-w-xs">{file.name}</td>
                                    <td className="px-6 py-4">{bytesToSize(file.size)}</td>
                                    <td className="px-6 py-4">{new Date(file.createdAt).toLocaleDateString('es-CO')}</td>
                                    <td className="px-6 py-4 text-right space-x-4">
                                        <a href={file.url} download={file.name} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">Descargar</a>
                                        <button onClick={() => handleDelete(file.name)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center p-10 text-gray-500">No hay archivos para este conjunto.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};

export default FileManagerModal;