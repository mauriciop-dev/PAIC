import { describe, expect, it } from 'vitest';
import {
  getGoogleDrivePreviewUrl,
  isGoogleDriveFileUrl,
  isGoogleDriveFolderUrl,
  isValidGoogleDriveLink,
} from '../googleDriveLinks';

describe('googleDriveLinks', () => {
  it('accepts a public Google Drive file link', () => {
    expect(isValidGoogleDriveLink('https://drive.google.com/file/d/ABC123/view')).toBe(true);
  });

  it('accepts a public Google Drive folder link', () => {
    expect(isValidGoogleDriveLink('https://drive.google.com/folders/ABC123')).toBe(true);
  });

  it('rejects a non-Google Drive URL', () => {
    expect(isValidGoogleDriveLink('https://example.com/file.pdf')).toBe(false);
  });

  it('detects file URLs correctly', () => {
    expect(isGoogleDriveFileUrl('https://drive.google.com/file/d/ABC123/view')).toBe(true);
    expect(isGoogleDriveFolderUrl('https://drive.google.com/file/d/ABC123/view')).toBe(false);
  });

  it('builds preview URLs for Drive files', () => {
    expect(getGoogleDrivePreviewUrl('https://drive.google.com/file/d/ABC123/view')).toBe(
      'https://drive.google.com/file/d/ABC123/preview',
    );
    expect(getGoogleDrivePreviewUrl('https://drive.google.com/folders/ABC123')).toBe('');
  });
});
