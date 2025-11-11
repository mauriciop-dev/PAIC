import React, { useState, useEffect, useRef } from 'react';
import { apiService } from '../../services/apiService';
import { UserProfile, ConjuntoInfo, StoredFile } from '../../types';
import { Icon } from '../ui/Icon';

interface ArchivosViewProps {
    userProfile: UserProfile;
    conjuntoInfo: ConjuntoInfo;
}

const ArchivosView: React.FC<ArchivosViewProps> = ({ userProfile, conjuntoInfo }) => {
    const [files, setFiles] = useState<StoredFile[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadFeedback, setUploadFeedback] = useState<{ type: 'success' | 'error', text: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fetchData = async () => {
        if (!userProfile.conjuntoId) return;
        setIsLoading(true);
        try {
            const fetchedFiles = await apiService.listFilesForConjunto(userProfile.conjuntoId);
            setFiles(fetchedFiles);
        } catch (error) {
            console.error("Failed to fetch files", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [userProfile.conjuntoId]);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !userProfile.conjuntoId) return;

        setIsUploading(true);
        setUploadFeedback(null);

        try {
            await apiService.uploadFileForConjunto(userProfile.conjuntoId, file);
            setUploadFeedback({ type: 'success', text: `Archivo "${file.name}" subido exitosamente.` });
            fetchData(); // Refresh file list
        } catch (error: any) {
            console.error("File upload failed", error);
            setUploadFeedback({ type: 'error', text: `Error al subir el archivo: ${error.message}` });
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
            setTimeout(() => setUploadFeedback(null), 5000);
        }
    };

    const handleDeleteFile = async (fileName: string) => {
        if (window.confirm(`¿Estás seguro de que quieres eliminar "${fileName}"? Esta acción no se puede deshacer.`) && userProfile.conjuntoId) {
            try {
                await apiService.deleteFileForConjunto(userProfile.conjuntoId, fileName);
                fetchData();
            } catch (error) {
                console.error("Failed to delete file", error);
                alert("No se pudo eliminar el archivo.");
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
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                <p className="text-gray-600">
                    Administra los archivos y documentos importantes de tu conjunto.
                </p>
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

            {uploadFeedback && (
                <div className={`p-3 rounded-md text-sm ${uploadFeedback.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {uploadFeedback.text}
                </div>
            )}

            <div className="bg-white rounded-lg shadow-md overflow-hidden">
                {isLoading ? (
                    <div className="p-6 text-center text-gray-500">Cargando archivos...</div>
                ) : (
                    <ul className="divide-y divide-gray-200">
                        {files.length > 0 ? files.map(file => (
                            <li key={file.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-gray-50">
                                <div className="flex-1 flex items-center gap-3">
                                    <Icon name="file-text" className="w-6 h-6 text-gray-400" />
                                    <div>
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-600 hover:underline">{file.name}</a>
                                        <p className="text-sm text-gray-500">{bytesToSize(file.size)} - Subido el {new Date(file.createdAt).toLocaleDateString('es-CO')}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button onClick={() => handleDeleteFile(file.name)} className="font-medium text-red-600 hover:underline text-sm p-1">Eliminar</button>
                                </div>
                            </li>
                        )) : (
                            <li className="p-6 text-center text-gray-500">
                                No hay archivos subidos. ¡Sube el primer documento!
                            </li>
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ArchivosView;
