import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Provider-agnostic LLM wrapper. Uses Anthropic Messages API by default.
 * If no API key is configured, `available` is false and callers fall back to
 * deterministic heuristics — the app never crashes for lack of a key.
 */
@Injectable()
export class LlmService {
  private readonly logger = new Logger(LlmService.name);

  constructor(private readonly config: ConfigService) {}

  get available(): boolean {
    return Boolean(this.config.get<string>('ANTHROPIC_API_KEY'));
  }

  /** Send a system + user prompt and return raw text. */
  async complete(system: string, user: string, maxTokens = 1024): Promise<string | null> {
    const apiKey = this.config.get<string>('ANTHROPIC_API_KEY');
    if (!apiKey) return null;
    const model = this.config.get<string>('LLM_MODEL', 'claude-sonnet-4-5');

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      }),
    });

    if (!res.ok) {
      this.logger.error(`LLM request failed: ${res.status} ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as { content: { type: string; text: string }[] };
    return json.content?.map((c) => c.text).join('') ?? null;
  }

  /** Ask for JSON and parse it defensively (strips code fences / prose). */
  async completeJson<T>(system: string, user: string, maxTokens = 1024): Promise<T | null> {
    const text = await this.complete(system, user, maxTokens);
    if (!text) return null;
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]) as T;
    } catch {
      this.logger.warn('Failed to parse LLM JSON output.');
      return null;
    }
  }
}
