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
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchData = async () => {
    if (!conjunto.id) return;
    setIsLoading(true);
    try {
      const fetchedFiles = await apiService.listFilesForConjunto(conjunto.id);
      setFiles(fetchedFiles);
    } catch (error) {
      console.error("Failed to fetch files", error);
      setFeedback({ type: 'error', text: 'No se pudieron cargar los archivos.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchData();
    }
  }, [isOpen, conjunto.id]);

  if (!isOpen) return null;

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
      setFeedback({ type: 'success', text: `Archivo "${file.name}" subido.` });
      fetchData();
    } catch (error: any) {
      setFeedback({ type: 'error', text: `Error: ${error.message}` });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      setTimeout(() => setFeedback(null), 5000);
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (window.confirm(`¿Seguro que quieres eliminar "${fileName}"?`)) {
      try {
        await apiService.deleteFileForConjunto(conjunto.id, fileName);
        fetchData();
      } catch (error) {
        setFeedback({ type: 'error', text: 'No se pudo eliminar el archivo.' });
      }
    }
  };
  
  const bytesToSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex justify-center items-center" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-2xl w-11/12 md:w-2/3 lg:w-1/2 relative flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        <header className="p-6 border-b border-gray-200">
          <button onClick={onClose} className="absolute top-4 right-4 text-gray-500 hover:text-gray-800">
            <Icon name="x" className="w-6 h-6" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800">Gestionar Archivos</h2>
          <p className="text-sm text-gray-600">Archivos para: <span className="font-semibold">{conjunto.name}</span></p>
        </header>

        <div className="p-6 flex-1 overflow-y-auto">
          <div className="flex justify-end mb-4">
             <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                onClick={handleUploadClick}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-sm flex items-center gap-2 disabled:bg-blue-300"
              >
                <Icon name="upload-cloud" className="w-5 h-5" />
                {isUploading ? 'Subiendo...' : 'Subir Archivo'}
              </button>
          </div>
           {feedback && (
                <div className={`p-3 mb-4 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {feedback.text}
                </div>
            )}
            {isLoading ? (
                <div className="text-center text-gray-500">Cargando...</div>
            ) : files.length > 0 ? (
                 <ul className="divide-y divide-gray-200">
                    {files.map(file => (
                        <li key={file.id} className="py-3 flex justify-between items-center gap-4">
                            <div className="flex items-center gap-3 min-w-0">
                                <Icon name="file-text" className="w-6 h-6 text-gray-400 flex-shrink-0" />
                                <div className="min-w-0">
                                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline truncate block">{file.name}</a>
                                    <p className="text-xs text-gray-500">{bytesToSize(file.size)}</p>
                                </div>
                            </div>
                            <button onClick={() => handleDeleteFile(file.name)} className="font-medium text-red-600 hover:underline text-sm p-1 flex-shrink-0">Eliminar</button>
                        </li>
                    ))}
                 </ul>
            ) : (
                <p className="text-center text-gray-500 p-10">Este conjunto no tiene archivos.</p>
            )}
        </div>

        <footer className="p-6 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300">
            Cerrar
          </button>
        </footer>
      </div>
    </div>
  );
};

export default FileManagerModal;
