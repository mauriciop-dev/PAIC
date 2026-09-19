export class DocumentProcessor {
  chunkText(text: string, chunkSize: number = 800, overlap: number = 150): string[] {
    if (!text) return [];
    
    const cleaned = text.replace(/\r\n/g, '\n').trim();
    if (cleaned.length <= chunkSize) {
      return [cleaned];
    }

    const chunks: string[] = [];
    let index = 0;
    
    while (index < cleaned.length) {
      const end = Math.min(index + chunkSize, cleaned.length);
      let chunk = cleaned.slice(index, end);
      
      // Intentar cortar en un salto de línea o espacio para no romper palabras
      if (end < cleaned.length) {
        const lastSpace = chunk.lastIndexOf('\n');
        if (lastSpace > chunkSize * 0.5) {
          chunk = chunk.slice(0, lastSpace);
          index += lastSpace + 1;
        } else {
          const lastBlank = chunk.lastIndexOf(' ');
          if (lastBlank > chunkSize * 0.5) {
            chunk = chunk.slice(0, lastBlank);
            index += lastBlank + 1;
          } else {
            index = end;
          }
        }
      } else {
        index = end;
      }
      
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }
}
