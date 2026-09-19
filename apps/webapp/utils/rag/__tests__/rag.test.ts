import { describe, it, expect } from 'vitest';
import { DocumentProcessor } from '../documentProcessor';
import { DriveConnector } from '../driveConnector';
import { EmbeddingService } from '../embeddingService';

describe('RAG Utilities & Services', () => {
  it('DocumentProcessor should chunk text correctly', () => {
    const processor = new DocumentProcessor();
    const longText = 'Hola esto es una prueba de chunking de texto. '.repeat(50);
    const chunks = processor.chunkText(longText, 100, 20);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0].length).toBeLessThanOrEqual(100);
  });

  it('DriveConnector should extract folder ID', () => {
    const connector = new DriveConnector();
    const folderUrl = 'https://drive.google.com/drive/folders/1hKdWqw9CN2gCzR8cl_51YaiH6HLMMr7r?usp=sharing';
    const folderId = connector.extractFolderId(folderUrl);
    expect(folderId).toBe('1hKdWqw9CN2gCzR8cl_51YaiH6HLMMr7r');
  });

  it('EmbeddingService should generate vector of 1536 dimensions', async () => {
    const service = new EmbeddingService();
    const vector = await service.generateEmbedding('prueba de embedding');
    expect(vector).toHaveLength(1536);
  });
});
