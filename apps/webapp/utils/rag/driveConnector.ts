export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
}

export class DriveConnector {
  private apiKey?: string;

  constructor(apiKey?: string) {
    let key = apiKey;
    if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
      key = import.meta.env.VITE_GOOGLE_DRIVE_API_KEY || import.meta.env.GOOGLE_DRIVE_API_KEY;
    }
    if (!key && typeof process !== 'undefined' && process.env) {
      key = process.env.VITE_GOOGLE_DRIVE_API_KEY || process.env.GOOGLE_DRIVE_API_KEY;
    }
    this.apiKey = key;
  }

  // Extraer ID de carpeta de un enlace de Google Drive
  extractFolderId(folderUrlOrId: string): string {
    if (!folderUrlOrId) return '';
    if (!folderUrlOrId.includes('http')) return folderUrlOrId;
    
    const match = folderUrlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
    if (match && match[1]) return match[1];
    
    const idParam = new URL(folderUrlOrId).searchParams.get('id');
    if (idParam) return idParam;
    
    return folderUrlOrId;
  }

  async listFolderFiles(folderUrlOrId: string): Promise<DriveFile[]> {
    const folderId = this.extractFolderId(folderUrlOrId);
    if (!folderId) throw new Error('ID o enlace de carpeta de Google Drive inválido');

    if (!this.apiKey) {
      // Modo simulación / stub si no hay API key de Drive configurada
      console.warn('Google Drive API Key no configurada. Retornando archivos simulados para la carpeta:', folderId);
      return [
        {
          id: 'sim_file_1',
          name: 'Reglamento_Propiedad_Horizontal.pdf',
          mimeType: 'application/pdf',
          webViewLink: `https://drive.google.com/file/d/sim_file_1/view?usp=sharing`
        },
        {
          id: 'sim_file_2',
          name: 'Manual_Convivencia_2026.docx',
          mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          webViewLink: `https://drive.google.com/file/d/sim_file_2/view?usp=sharing`
        }
      ];
    }

    const query = encodeURIComponent(`'${folderId}' in parents and trashed = false`);
    const url = `https://www.googleapis.com/drive/v3/files?q=${query}&key=${this.apiKey}&fields=files(id,name,mimeType,webViewLink)`;

    const res = await fetch(url);
    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Error al listar archivos de Google Drive: ${res.status} - ${errText}`);
    }

    const data = await res.json();
    return data.files || [];
  }

  async downloadFileText(fileId: string): Promise<string> {
    if (!this.apiKey || fileId.startsWith('sim_file')) {
      return `Contenido simulado extraído del documento ${fileId} de Google Drive. Normas generales de convivencia, uso de zonas comunes, horarios de piscina de 6am a 9pm, multas por ruido y gestión de residuos.`;
    }

    const url = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${this.apiKey}`;
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Error al descargar archivo ${fileId} desde Google Drive: ${res.statusText}`);
    }

    return await res.text();
  }
}
