export interface GooglePickerResult {
  id: string;
  name: string;
  url: string;
  mimeType: string;
  sizeBytes?: number;
}

declare global {
  interface Window {
    gapi?: any;
    google?: any;
  }
}

let gapiLoaded = false;
let gisLoaded = false;
let tokenClient: any = null;

// Carga las librerías oficiales de Google (GAPI y GIS)
export const loadGooglePickerLibraries = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (gapiLoaded && gisLoaded) {
      return resolve();
    }

    // 1. Cargar GAPI (Google API Library) para el Picker
    const gapiScript = document.createElement('script');
    gapiScript.src = 'https://apis.google.com/js/api.js';
    gapiScript.async = true;
    gapiScript.defer = true;
    gapiScript.onload = () => {
      if (window.gapi) {
        window.gapi.load('picker', () => {
          gapiLoaded = true;
          if (gisLoaded) resolve();
        });
      }
    };
    gapiScript.onerror = () => reject(new Error('No se pudo cargar GAPI para el Picker.'));
    document.body.appendChild(gapiScript);

    // 2. Cargar GIS (Google Identity Services) para el Token de Acceso
    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.async = true;
    gisScript.defer = true;
    gisScript.onload = () => {
      gisLoaded = true;
      if (gapiLoaded) resolve();
    };
    gisScript.onerror = () => reject(new Error('No se pudo cargar GIS para la autenticación.'));
    document.body.appendChild(gisScript);
  });
};

// Solicita un token de acceso OAuth 2.0 de forma dinámica al usuario
const getOAuthToken = (clientId: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      return reject(new Error('Google Identity Services no está disponible.'));
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: 'https://www.googleapis.com/auth/drive.readonly',
      callback: (response: any) => {
        if (response.error !== undefined) {
          reject(response);
        } else if (response.access_token) {
          resolve(response.access_token);
        } else {
          reject(new Error('No se obtuvo un token de acceso válido.'));
        }
      },
    });

    // Solicitar el token de manera interactiva/fluida
    tokenClient.requestAccessToken({ prompt: '' });
  });
};

export const openGoogleDrivePicker = async (options?: {
  folderId?: string;
  onSelect: (file: GooglePickerResult) => void;
  onCancel?: () => void;
}): Promise<void> => {
  await loadGooglePickerLibraries();

  const apiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_DRIVE_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_DRIVE_API_KEY) ||
    '';

  const clientId =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_CLIENT_ID) ||
    '';

  if (!clientId) {
    throw new Error('Google Client ID no configurado.');
  }

  // 1. Obtener Token de Acceso OAuth 2.0 requerido para evitar el 403
  let oauthToken = '';
  try {
    oauthToken = await getOAuthToken(clientId);
  } catch (error) {
    console.error('Error al obtener token de Google:', error);
    throw new Error('Autenticación de Google cancelada o fallida.');
  }

  if (!window.google?.picker) {
    throw new Error('Google Picker no está disponible.');
  }

  // 2. Construir Vista de Archivos
  const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true);

  if (options?.folderId) {
    view.setParent(options.folderId);
  }

  // 3. Crear el Picker con el Token de Acceso vinculado
  const pickerBuilder = new window.google.picker.PickerBuilder()
    .addView(view)
    .setLocale('es')
    .setOAuthToken(oauthToken) // El Token elimina el 403
    .setCallback((data: any) => {
      if (data.action === window.google.picker.Action.PICKED) {
        const doc = data.docs?.[0];
        if (doc) {
          options?.onSelect({
            id: doc.id,
            name: doc.name,
            url: doc.url || `https://drive.google.com/file/d/${doc.id}/view?usp=sharing`,
            mimeType: doc.mimeType,
            sizeBytes: doc.sizeBytes,
          });
        }
      } else if (data.action === window.google.picker.Action.CANCEL) {
        options?.onCancel?.();
      }
    });

  if (apiKey) {
    pickerBuilder.setDeveloperKey(apiKey);
  }
  if (clientId) {
    pickerBuilder.setAppId(clientId);
  }

  const picker = pickerBuilder.build();
  picker.setVisible(true);
};
