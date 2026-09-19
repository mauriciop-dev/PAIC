export class EmbeddingService {
  private apiKey?: string;

  constructor(apiKey?: string) {
    let key = apiKey;
    if (!key && typeof import.meta !== 'undefined' && import.meta.env) {
      key = import.meta.env.VITE_OPENAI_API_KEY || import.meta.env.OPENAI_API_KEY;
    }
    if (!key && typeof process !== 'undefined' && process.env) {
      key = process.env.VITE_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    }
    this.apiKey = key;
  }

  // Genera un embedding simulado de 1536 dimensiones (determinista basado en texto) o real si hay API key
  async generateEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      // Simulación determinista de 1536 dimensiones para pruebas sin coste de API
      const vector = new Array(1536).fill(0);
      let hash = 0;
      for (let i = 0; i < text.length; i++) {
        hash = (hash << 5) - hash + text.charCodeAt(i);
        hash |= 0;
      }
      for (let i = 0; i < 1536; i++) {
        vector[i] = Math.sin(hash + i) * 0.1;
      }
      return vector;
    }

    try {
      const res = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'text-embedding-3-small',
          input: text
        })
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Error en OpenAI Embeddings: ${res.status} - ${err}`);
      }

      const data = await res.json();
      return data.data[0].embedding;
    } catch (e) {
      console.warn('Fallo llamada real a OpenAI embeddings, usando fallback simulado:', e);
      return new Array(1536).fill(0.01);
    }
  }

  async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const results: number[][] = [];
    for (const t of texts) {
      results.push(await this.generateEmbedding(t));
    }
    return results;
  }
}
