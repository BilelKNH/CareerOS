import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

const DIM = 384;

/**
 * Embeddings provider.
 *
 * Default ('local'): a dependency-free feature-hashing embedding — the text is
 * tokenized (unigrams + bigrams) and hashed into a fixed 384-dim vector, then
 * L2-normalized. It captures LEXICAL similarity (shared terms), runs instantly,
 * needs no model, no native binary, no disk, no API key. Cosine distance in
 * pgvector then ranks memories by term overlap.
 *
 * Optional ('openai'): true semantic embeddings via OpenAI (set the DB vector
 * dimension to match, e.g. 1536).
 *
 * Any failure returns null so memory still works (stored without a vector).
 */
@Injectable()
export class EmbeddingService {
  private readonly logger = new Logger(EmbeddingService.name);

  constructor(private readonly config: ConfigService) {}

  private get provider(): 'local' | 'openai' {
    return this.config.get<'local' | 'openai'>('EMBEDDING_PROVIDER', 'local');
  }

  async embed(text: string): Promise<number[] | null> {
    if (this.provider === 'openai') return this.embedOpenAi(text);
    return this.embedLocal(text);
  }

  private tokenize(text: string): string[] {
    const words = (text || '')
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/)
      .filter((w) => w.length > 1);
    const tokens = [...words];
    for (let i = 0; i < words.length - 1; i++) tokens.push(`${words[i]}_${words[i + 1]}`);
    return tokens;
  }

  /** FNV-1a 32-bit hash. */
  private hash(str: string): number {
    let h = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return h >>> 0;
  }

  private embedLocal(text: string): number[] {
    const vec = new Array<number>(DIM).fill(0);
    for (const token of this.tokenize(text)) {
      const h = this.hash(token);
      const idx = h % DIM;
      const sign = (h & 1) === 0 ? 1 : -1; // sign hashing reduces collisions
      vec[idx] += sign;
    }
    const norm = Math.sqrt(vec.reduce((s, x) => s + x * x, 0)) || 1;
    return vec.map((x) => x / norm);
  }

  private async embedOpenAi(text: string): Promise<number[] | null> {
    const apiKey = this.config.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('EMBEDDING_PROVIDER=openai but OPENAI_API_KEY not set.');
      return null;
    }
    const model = this.config.get<string>('EMBEDDING_MODEL', 'text-embedding-3-small');
    const res = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ model, input: text }),
    });
    if (!res.ok) {
      this.logger.error(`OpenAI embedding failed: ${res.status}`);
      return null;
    }
    const json = (await res.json()) as { data: { embedding: number[] }[] };
    return json.data[0]?.embedding ?? null;
  }

  /** pgvector literal, e.g. "[0.1,0.2,0.3]". */
  toVectorLiteral(vec: number[]): string {
    return `[${vec.join(',')}]`;
  }
}
