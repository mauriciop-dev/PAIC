import React, { useState, useEffect, useRef } from 'react';
import { ConjuntoInfo, UserProfile, StoredFile } from '../../types';
import { apiService } from '../../services/apiService';
import { Icon } from '../ui/Icon';

interface ArchivosViewProps {
  userProfile: UserProfile;
  conjuntoInfo: ConjuntoInfo;
}

const ArchivosView: React.FC<ArchivosViewProps> = ({ userProfile, conjuntoInfo }) => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    if (!userProfile.conjuntoId) return;
    setIsLoading(true);
    try {
      const data = await apiService.listFilesForConjunto(userProfile.conjuntoId);
      setFiles(data);
    } catch (error) {
      console.error("Failed to fetch files:", error);
      setFeedback({ type: 'error', text: 'No se pudieron cargar los archivos.' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [userProfile.conjuntoId]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelected = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !userProfile.conjuntoId) return;

    setIsUploading(true);
    setFeedback(null);
    try {
      await apiService.uploadFileForConjunto(userProfile.conjuntoId, file);
      setFeedback({ type: 'success', text: `Archivo "${file.name}" subido exitosamente.` });
      fetchFiles(); // Refresh the list
    } catch (error: any) {
      setFeedback({ type: 'error', text: `Error al subir: ${error.message}` });
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar "${fileName}"? Esta acción no se puede deshacer.`) && userProfile.conjuntoId) {
      try {
        await apiService.deleteFileForConjunto(userProfile.conjuntoId, fileName);
        setFeedback({ type: 'success', text: 'Archivo eliminado exitosamente.' });
        fetchFiles(); // Refresh the list
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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <p className="text-gray-600">
          Gestiona los documentos importantes de tu conjunto, como reglamentos, actas y más.
        </p>
        <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} />
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
        <div className={`p-3 rounded-md text-sm ${feedback.type === 'error' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
          {feedback.text}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-6 text-center text-gray-500">Cargando archivos...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-gray-500">
              <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                <tr>
                  <th scope="col" className="px-6 py-3">Nombre del Archivo</th>
                  <th scope="col" className="px-6 py-3">Tamaño</th>
                  <th scope="col" className="px-6 py-3">Fecha de Carga</th>
                  <th scope="col" className="px-6 py-3 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {files.length > 0 ? files.map(file => (
                  <tr key={file.id} className="bg-white border-b hover:bg-gray-50">
                    <td className="px-6 py-4 font-medium text-gray-900">{file.name}</td>
                    <td className="px-6 py-4">{bytesToSize(file.size)}</td>
                    <td className="px-6 py-4">{new Date(file.createdAt).toLocaleDateString('es-CO')}</td>
                    <td className="px-6 py-4 text-right space-x-4">
                      <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-medium text-blue-600 hover:underline">
                        Descargar
                      </a>
                      <button onClick={() => handleDeleteFile(file.name)} className="font-medium text-red-600 hover:underline">
                        Eliminar
                      </button>
                    </td>
                  </tr>
                )) : (
                    <tr>
                        <td colSpan={4} className="text-center p-10 text-gray-500">
                            No hay archivos. ¡Sube tu primer documento!
                        </td>
                    </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ArchivosView;
