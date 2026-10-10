import React, { useState, useEffect, useRef } from 'react';
import { ConjuntoInfo, UserProfile, StoredFile } from '../../types';
import { apiService } from '../../services/apiService';
import ConfirmModal from '../ConfirmModal';
import { Icon } from '@paic/ui';
import { notifyPwaResidents } from '../../utils/notifications';

interface ArchivosViewProps {
  userProfile: UserProfile;
  conjuntoInfo: ConjuntoInfo;
}

const ArchivosView: React.FC<ArchivosViewProps> = ({ userProfile, conjuntoInfo }) => {
  const [files, setFiles] = useState<StoredFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
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

    setFeedback(null);

    // Frontend validation for file type and size
    const MAX_FILE_SIZE_MB = 5;
    const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

    if (file.type !== 'application/pdf') {
      setFeedback({ type: 'error', text: 'Error: Solo se permiten archivos PDF.' });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      setFeedback({ type: 'error', text: `Error: El archivo no debe superar los ${MAX_FILE_SIZE_MB}MB.` });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    try {
      await apiService.uploadFileForConjunto(userProfile.conjuntoId, file);
      setFeedback({ type: 'success', text: `Archivo "${file.name}" subido exitosamente.` });
      fetchFiles(); // Refresh the list
    } catch (error: any) {
      let errorMessage = `Error al subir: ${error.message}`;
      if (error.message.includes('JSON.parse')) {
          errorMessage = 'Error del servidor al subir. Asegúrate que el archivo sea un PDF válido y no supere el límite de tamaño.';
      }
      setFeedback({ type: 'error', text: errorMessage });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!userProfile.conjuntoId) return;
    try {
      await apiService.deleteFileForConjunto(userProfile.conjuntoId, fileName);
      setFeedback({ type: 'success', text: 'Archivo eliminado exitosamente.' });
      fetchFiles();
    } catch (error: any) {
      setFeedback({ type: 'error', text: `Error al eliminar: ${error.message}` });
    }
    setDeleteTarget(null);
  };

  const bytesToSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Byte';
    const i = parseInt(String(Math.floor(Math.log(bytes) / Math.log(1024))));
    return Math.round(bytes / Math.pow(1024, i)) + ' ' + sizes[i];
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-800">Repositorio de Documentos</h2>
          <p className="text-sm text-slate-500 mt-0.5">Administra los archivos y documentos importantes del conjunto. (Solo PDF, máx. 5 MB)</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" ref={fileInputRef} onChange={handleFileSelected} style={{ display: 'none' }} accept="application/pdf" />
          <button
            onClick={handleUploadClick}
            disabled={isUploading}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm rounded-xl shadow-md shadow-blue-500/20 flex items-center gap-2 disabled:bg-blue-300 transition-all"
          >
            <Icon name="upload-cloud" className="w-4 h-4" />
            {isUploading ? 'Subiendo…' : 'Subir Archivo PDF'}
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`p-3.5 rounded-xl text-xs font-semibold flex items-center gap-2 ${feedback.type === 'error' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          <Icon name={feedback.type === 'error' ? 'alert-triangle' : 'check'} className="w-4 h-4 flex-shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      <div id="repo-archivos" className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-10 text-center text-gray-400">
            <Icon name="refresh-cw" className="w-7 h-7 animate-spin mx-auto mb-2 text-blue-500" />
            <p className="text-xs font-medium">Cargando archivos…</p>
          </div>
        ) : (
          <>
            {/* Mobile: Card view */}
            <div className="md:hidden space-y-3 p-4">
              {files.length > 0 ? files.map(file => (
                <div key={file.id} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                      <Icon name="file-text" className="w-5 h-5 text-red-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-gray-900 text-sm truncate">{file.name}</p>
                      <p className="text-xs text-gray-400 truncate">{bytesToSize(file.size)} · {new Date(file.createdAt).toLocaleDateString('es-CO')}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 border-t border-gray-100 pt-3">
                    <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex-1 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-xl py-2 px-3 text-center transition-colors">
                      Descargar
                    </a>
                    <button onClick={() => setDeleteTarget(file.name)} className="flex-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-xl py-2 px-3 text-center transition-colors">
                      Eliminar
                    </button>
                  </div>
                </div>
              )) : (
                <div className="text-center py-14">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                    <Icon name="file-text" className="w-8 h-8 text-gray-300" />
                  </div>
                  <p className="text-sm font-medium text-gray-500">Sin documentos aún</p>
                  <p className="text-xs text-gray-400 mt-1">Sube tu primer archivo PDF.</p>
                </div>
              )}
            </div>

            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-xs text-left text-gray-600">
                <thead className="text-[11px] text-gray-700 uppercase bg-gray-50 font-bold border-b border-gray-200">
                  <tr>
                    <th className="px-5 py-3">Nombre del Archivo</th>
                    <th className="px-5 py-3">Tamaño</th>
                    <th className="px-5 py-3">Fecha de Carga</th>
                    <th className="px-5 py-3 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {files.length > 0 ? files.map(file => (
                    <tr key={file.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-gray-900 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0">
                          <Icon name="file-text" className="w-4 h-4 text-red-500" />
                        </div>
                        <span className="truncate max-w-xs">{file.name}</span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500 font-mono">{bytesToSize(file.size)}</td>
                      <td className="px-5 py-3.5 text-gray-500">{new Date(file.createdAt).toLocaleDateString('es-CO')}</td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="inline-flex items-center gap-2">
                          <a href={file.url} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors">
                            Descargar
                          </a>
                          <button onClick={() => setDeleteTarget(file.name)} className="px-3 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={4} className="text-center py-14">
                        <div className="w-14 h-14 rounded-2xl bg-gray-50 flex items-center justify-center mx-auto mb-3">
                          <Icon name="file-text" className="w-7 h-7 text-gray-300" />
                        </div>
                        <p className="text-sm font-medium text-gray-500">Sin documentos aún</p>
                        <p className="text-xs text-gray-400 mt-1">Sube tu primer archivo PDF.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <ConfirmModal
        isOpen={deleteTarget !== null}
        title="Eliminar Archivo"
        message={deleteTarget ? `¿Estás seguro de que quieres eliminar "${deleteTarget}"? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        onConfirm={() => deleteTarget !== null && handleDeleteFile(deleteTarget)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
};

export default ArchivosView;
