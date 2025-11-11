import React, { useState, useEffect, useRef } from 'react';
import { ConjuntoInfo, StoredFile } from '../types';
import { apiService } from '../services/apiService';
import { Icon } from './ui/Icon';

interface FileManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  conjunto: ConjuntoInfo;
}

const FileManagerModal: React.FC<FileManagerModalProps> = ({ isOpen, onClose, conjunto }) => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    if (!conjunto.id) return;
    setIsLoading(true);
    try {
      const data = await apiService.listFilesForConjunto(conjunto.id);
      setFiles(data);
    } catch (error) {
      console.error("Failed to fetch files for conjunto", error);
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

  if (!isOpen) return null;

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !conjunto.id) return;

    setIsUploading(true);
    setFeedback(null);
    try {
      await apiService.uploadFileForConjunto(conjunto.id, file);
      setFeedback({ type: 'success', text: `Archivo "${file.name}" subido exitosamente.` });
      fetchFiles();
    } catch (error: any) {
      setFeedback({ type: 'error', text: `Error al subir: ${error.message}` });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${fileName}"?`) && conjunto.id) {
      try {
        await apiService.deleteFileForConjunto(conjunto.id, fileName);
        setFeedback({ type: 'success', text: 'Archivo eliminado.' });
        fetchFiles();
      } catch (error: any) {
        setFeedback({ type: 'error', text: `Error al eliminar: ${error.message}` });
      }
    }
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
          <h2 className="text-2xl font-bold text-gray-800">Archivos de {conjunto.name}</h2>
          <p className="text-sm text-gray-600">Gestiona los documentos y archivos de este conjunto.</p>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="text-center text-gray-500">Cargando archivos...</div>
          ) : files.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Nombre</th>
                  <th scope="col" className="px-6 py-3">Tamaño</th>
                  <th scope="col" className="px-6 py-3">Subido el</th>
                  <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => (
                  <tr key={file.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{file.name}</td>
                    <td className="px-6 py-4">{bytesToSize(file.size)}</td>
                    <td className="px-6 py-4">{new Date(file.createdAt).toLocaleDateString('es-CO')}</td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">Ver</a>
                      <button onClick={() => handleDeleteFile(file.name)} className="font-medium text-red-600 hover:underline">Eliminar</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-center text-gray-500 p-10">Este conjunto no tiene archivos.</p>
          )}
        </div>

        <footer className="p-6 border-t border-gray-200 bg-gray-50 flex justify-between items-center">
            {feedback && (
                <p className={`text-sm ${feedback.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
                    {feedback.text}
                </p>
            )}
           <div className="flex-grow flex justify-end">
                <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />
                <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={isUploading}
                    className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:bg-blue-300"
                >
                    <Icon name="upload-cloud" className="w-5 h-5" />
                    {isUploading ? 'Subiendo...' : 'Subir Archivo'}
                </button>
           </div>
        </footer>
      </div>
    </div>
  );
};

export default FileManagerModal;
