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

let pickerApiLoaded = false;

export const loadGooglePickerApi = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (pickerApiLoaded && window.google?.picker) {
      return resolve();
    }

    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.gapi) {
        window.gapi.load('picker', () => {
          pickerApiLoaded = true;
          resolve();
        });
      } else {
        resolve();
      }
    };
    script.onerror = () => reject(new Error('No se pudo cargar la librería de Google Picker.'));
    document.body.appendChild(script);
  });
};

export const openGoogleDrivePicker = async (options?: {
  folderId?: string;
  onSelect: (file: GooglePickerResult) => void;
  onCancel?: () => void;
}): Promise<void> => {
  await loadGooglePickerApi();

  const apiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_DRIVE_API_KEY) ||
    (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_DRIVE_API_KEY) ||
    '';

  const clientId =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GOOGLE_CLIENT_ID) ||
    (typeof process !== 'undefined' && process.env?.VITE_GOOGLE_CLIENT_ID) ||
    '';

  if (!window.google?.picker) {
    throw new Error('Google Picker no está disponible.');
  }

  const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
    .setIncludeFolders(true)
    .setSelectFolderEnabled(true);

  if (options?.folderId) {
    view.setParent(options.folderId);
  }

  const pickerBuilder = new window.google.picker.PickerBuilder()
    .addView(view)
    .setLocale('es')
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
