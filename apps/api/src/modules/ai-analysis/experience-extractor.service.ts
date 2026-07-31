import { Injectable } from '@nestjs/common';
import { LlmService } from './llm.service';
import { detectTech } from '../scraping/tech-keywords';
import {
  EXPERIENCE_AGENT_SYSTEM,
  buildExperiencePrompt,
} from './prompts/experience-agent.prompt';

export interface ExtractedExperience {
  title: string;
  company: string;
  startDate: Date | null;
  endDate: Date | null;
  isCurrent: boolean;
  description: string;
  technologies: string[];
}

const CURRENT = /pr[ée]sent|present|aujourd|actuel|en cours|now|actuellement|à ce jour|ce jour|maintenant/i;

// Date building blocks — tolerant to real-world CV formats:
//   "2022", "09/2022", "Sept. 2022", "septembre 2022".
const YEAR = '(?:19|20)\\d{2}';
// Longest forms first so "janvier" isn't half-matched by "janv".
const MONTHS =
  '(?:janvier|janv|jan|f[ée]vrier|f[ée]vr|f[ée]v|mars|avril|avr|mai|juin|juillet|juil|jui|ao[uû]t|septembre|sept|sep|octobre|octo|oct|novembre|nov|d[ée]cembre|d[ée]c|dec)\\.?';
const DATE = `(?:${MONTHS}\\s*)?(?:\\d{1,2}[\\/.]\\s?)?${YEAR}`;
const PRESENT = 'pr[ée]sent|present|aujourd[\\w’\'-]*|actuel[\\w]*|en cours|now|maintenant|à ce jour|ce jour';
// Range separators: dashes/slash, or the words "à / au / aux / to".
const SEP = '(?:\\s*[-–—/]{1,3}\\s*|\\s+(?:[àa]u?x?|to)\\s+)';

// A date range anywhere on a line: "<date> - <date>" or "<date> - présent".
const RANGE = new RegExp(`(${DATE})${SEP}(${PRESENT}|${DATE})`, 'i');
// Open-ended current role: "depuis 2021", "depuis sept. 2021".
const SINCE = new RegExp(`\\bdepuis\\s+(?:${MONTHS}\\s*)?(${YEAR})`, 'i');
const yearOf = (s: string): number | null => {
  const m = s.match(/(?:19|20)\d{2}/);
  return m ? Number(m[0]) : null;
};

// Section headers (line starts with these).
const EXP_HEADER = /^(exp[ée]riences?|exp[ée]rience professionnelle|parcours professionnel|work experience|professional experience|emplois?)\b/i;
const EDU_HEADER = /^(formations?|[ée]ducation|dipl[ôo]mes?|scolarit[ée]|education|cursus|academic|[ée]tudes)\b/i;
const OTHER_HEADER = /^(comp[ée]tences|skills|langues|languages|centres?\s*d.int[ée]r[êe]ts?|hobbies|loisirs|projets?|projects|certifications?|contact|profil|à propos|about|r[ée]f[ée]rences)\b/i;

// Signals that a dated block is education, not a job.
const EDU_KEYWORDS = /\b(epsi|universit|iut\b|[ée]cole|master|licence|bts\b|but\b|dut\b|bachelor|mba\b|dipl[ôo]m|formation|baccalaur[ée]at|\bbac\b|pr[ée]pa|ing[ée]nieur dipl|scolarit|campus|lyc[ée]e)\b/i;

const BULLET = /^[-–—•·▪◦*▸●○»]+/;
const letters = (s: string) => s.replace(/[^a-zA-ZÀ-ÿ]/g, '').length;
const isHeader = (l: string) => EXP_HEADER.test(l) || EDU_HEADER.test(l) || OTHER_HEADER.test(l);

interface LlmExp {
  title?: string;
  company?: string;
  startDate?: string;
  endDate?: string;
  description?: string;
  technologies?: string[];
}

@Injectable()
export class ExperienceExtractorService {
  constructor(private readonly llm: LlmService) {}

  async extract(text: string): Promise<ExtractedExperience[]> {
    if (this.llm.available) {
      const parsed = await this.llm.completeJson<{ experiences: LlmExp[] }>(
        EXPERIENCE_AGENT_SYSTEM,
        buildExperiencePrompt(text),
        2000,
      );
      if (parsed?.experiences?.length) return parsed.experiences.map((e) => this.fromLlm(e));
    }
    return this.heuristic(text);
  }

  private parseYearMonth(v?: string): Date | null {
    if (!v) return null;
    const m = v.match(/(\d{4})(?:-(\d{1,2}))?/);
    if (!m) return null;
    return new Date(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, 1);
  }

  private fromLlm(e: LlmExp): ExtractedExperience {
    const isCurrent = !!e.endDate && CURRENT.test(e.endDate);
    return {
      title: (e.title ?? 'Expérience').trim(),
      company: (e.company ?? '').trim(),
      startDate: this.parseYearMonth(e.startDate),
      endDate: isCurrent ? null : this.parseYearMonth(e.endDate),
      isCurrent,
      description: (e.description ?? '').slice(0, 500),
      technologies: e.technologies?.length ? e.technologies : [],
    };
  }

  /** Trim leading/trailing separators, bullets and stray punctuation. */
  private clean(s: string): string {
    return s.replace(/^[\s\-–—·|,*•]+/, '').replace(/[\s\-–—·|,*•]+$/, '').trim();
  }

  /** Split a "Poste - Entreprise" style label into title + company. */
  private splitTitleCompany(label: string): [string, string] {
    for (const sep of [' @ ', ' chez ', ' — ', ' – ', ' - ', ' | ', ' · ', ', ']) {
      const idx = label.toLowerCase().indexOf(sep.toLowerCase());
      if (idx > 1) return [this.clean(label.slice(0, idx)), this.clean(label.slice(idx + sep.length))];
    }
    return [this.clean(label), ''];
  }

  /** Find the best "Poste / Entreprise" header line for a dated entry. */
  private headerFor(lines: string[], i: number): string {
    // 1) Text on the date line itself (minus every date fragment).
    const inline = lines[i]
      .replace(RANGE, ' ')
      .replace(SINCE, ' ')
      .replace(/\bdepuis\b/gi, ' ')
      .replace(new RegExp(`\\b${MONTHS}`, 'gi'), ' ')
      .replace(/\b(0?[1-9]|1[0-2])[\/.]\d{4}\b/g, ' ')
      .replace(/\b(?:19|20)\d{2}\b/g, ' ')
      .replace(BULLET, ' ')
      .replace(/\s{2,}/g, ' ')
      .trim();
    if (letters(inline) >= 3) return inline;

    // 2) Nearest preceding non-bullet, non-date, non-header line.
    for (let k = i - 1; k >= Math.max(0, i - 3); k--) {
      const l = lines[k];
      if (!l || BULLET.test(l) || RANGE.test(l) || isHeader(l) || letters(l) < 3) continue;
      // Skip real contact lines (email / url / phone) — but NOT "Poste @ Société".
      if (/[\w.+-]+@[\w-]+\.[\w.-]+|\bhttps?:\/\/|\+?\d[\d .()-]{8,}/.test(l)) continue;
      return l;
    }
    // 3) Or the following line.
    const next = lines[i + 1];
    return next && !BULLET.test(next) && letters(next) >= 3 ? next : '';
  }

  /**
   * Deterministic fallback: section-aware date-range parsing. Only reads the
   * Experience section (or an unlabelled CV) and drops education/diploma blocks.
   */
  private heuristic(text: string): ExtractedExperience[] {
    const lines = text
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);

    const out: ExtractedExperience[] = [];
    const seen = new Set<string>();
    let section: 'experience' | 'education' | 'other' | 'unknown' = 'unknown';

    for (let i = 0; i < lines.length && out.length < 15; i++) {
      const line = lines[i];

      // Track the current CV section.
      if (EXP_HEADER.test(line)) { section = 'experience'; continue; }
      if (EDU_HEADER.test(line)) { section = 'education'; continue; }
      if (OTHER_HEADER.test(line)) { section = 'other'; continue; }

      const m = line.match(RANGE);
      const since = m ? null : line.match(SINCE);
      if (!m && !since) continue;

      // Never extract jobs from education / skills / hobbies sections.
      if (section === 'education' || section === 'other') continue;

      const startYear = m ? yearOf(m[1]) : yearOf(since![1]);
      const endTok = m ? m[2] : 'présent';
      const isCurrent = CURRENT.test(endTok);
      const endYear = isCurrent ? null : yearOf(endTok);
      if (startYear == null || startYear < 1970 || startYear > new Date().getFullYear() + 1) continue;

      // Description block = following non-range, non-header lines (up to 3).
      const block: string[] = [];
      for (let j = i + 1; j < lines.length && block.length < 3 && !RANGE.test(lines[j]) && !isHeader(lines[j]); j++) {
        block.push(lines[j]);
      }

      const header = this.headerFor(lines, i);
      const blockText = `${header} ${line} ${block.join(' ')}`;

      // Drop diploma/school entries even when the CV has no clear sections.
      if (EDU_KEYWORDS.test(blockText)) continue;

      const [title, company] = this.splitTitleCompany(header);
      if (letters(title) < 2) continue; // skip noise (dates/locations only)

      const key = `${title.toLowerCase()}|${company.toLowerCase()}`;
      if (seen.has(key)) continue;
      seen.add(key);

      out.push({
        title,
        company,
        startDate: new Date(startYear, 0, 1),
        endDate: endYear ? new Date(endYear, 11, 31) : null,
        isCurrent,
        description: block.filter((b) => !BULLET.test(b) || b.length > 8).join(' ').slice(0, 500),
        technologies: detectTech(blockText),
      });
    }
    return out;
  }
}
