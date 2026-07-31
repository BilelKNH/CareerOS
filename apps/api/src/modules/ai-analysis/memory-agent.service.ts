import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';
import { MEMORY_AGENT_SYSTEM, buildMemoryUserPrompt } from './prompts/memory-agent.prompt';
import { ExtractedSkill, ExtractionResult, SkillCategoryValue } from './extraction.types';
import { KNOWLEDGE_BASE } from './knowledge-base';

interface LlmExtraction {
  skills: { name: string; category: SkillCategoryValue; inferred?: boolean }[];
  technologies: string[];
  responsibilities: string[];
  results: string[];
  summary: string;
}

@Injectable()
export class MemoryAgentService {
  constructor(private readonly llm: LlmService) {}

  /**
   * Extract a normalized structure from free text.
   * Uses the LLM when available, otherwise a deterministic knowledge-base pass.
   */
  async extract(rawText: string): Promise<ExtractionResult> {
    if (this.llm.available) {
      const parsed = await this.llm.completeJson<LlmExtraction>(
        MEMORY_AGENT_SYSTEM,
        buildMemoryUserPrompt(rawText),
        1200,
      );
      if (parsed) {
        return {
          skills: (parsed.skills ?? []).map((s) => ({
            name: s.name,
            category: s.category ?? 'tool',
            inferred: Boolean(s.inferred),
          })),
          technologies: parsed.technologies ?? [],
          responsibilities: parsed.responsibilities ?? [],
          results: parsed.results ?? [],
          summary: parsed.summary ?? '',
          method: 'llm',
        };
      }
    }
    return this.heuristicExtract(rawText);
  }

  /** Deterministic fallback — matches the KB and expands implied concepts. */
  private heuristicExtract(rawText: string): ExtractionResult {
    const haystack = ` ${rawText.toLowerCase()} `;
    const skills = new Map<string, ExtractedSkill>();

    for (const entry of KNOWLEDGE_BASE) {
      const hit = entry.patterns.some((p) => haystack.includes(p));
      if (!hit) continue;
      skills.set(entry.name.toLowerCase(), {
        name: entry.name,
        category: entry.category,
        inferred: false,
      });
      for (const rel of entry.related ?? []) {
        if (!skills.has(rel.name.toLowerCase())) {
          skills.set(rel.name.toLowerCase(), {
            name: rel.name,
            category: rel.category,
            inferred: true,
          });
        }
      }
    }

    const skillList = [...skills.values()];
    const technologies = skillList
      .filter((s) => ['framework', 'tool', 'language', 'cloud'].includes(s.category))
      .map((s) => s.name);

    return {
      skills: skillList,
      technologies,
      responsibilities: [],
      results: [],
      summary: rawText.slice(0, 140),
      method: 'heuristic',
    };
  }
}
