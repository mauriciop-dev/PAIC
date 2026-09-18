export const GOOGLE_DRIVE_FILE_PATTERN = /^https:\/\/drive\.google\.com\/file\/d\/[-a-zA-Z0-9_]+(?:\/|$)/;
export const GOOGLE_DRIVE_FOLDER_PATTERN = /^https:\/\/drive\.google\.com\/folders\/[-a-zA-Z0-9_]+(?:\/|$)/;

export function isGoogleDriveFileUrl(url: string): boolean {
  return GOOGLE_DRIVE_FILE_PATTERN.test(url.trim());
}

export function isGoogleDriveFolderUrl(url: string): boolean {
  return GOOGLE_DRIVE_FOLDER_PATTERN.test(url.trim());
}

export function isValidGoogleDriveLink(url: string): boolean {
  const trimmed = url.trim();
  if (!trimmed) return false;
  return isGoogleDriveFileUrl(trimmed) || isGoogleDriveFolderUrl(trimmed);
}

export function getGoogleDrivePreviewUrl(url: string): string {
  const trimmed = url.trim();
  const match = trimmed.match(/https:\/\/drive\.google\.com\/file\/d\/([-a-zA-Z0-9_]+)/);
  if (!match) return '';
  return `https://drive.google.com/file/d/${match[1]}/preview`;
}
