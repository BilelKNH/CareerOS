import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DataSource, MemoryKind, SnapshotTrigger } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryAgentService } from '../ai-analysis/memory-agent.service';
import { ExperienceExtractorService } from '../ai-analysis/experience-extractor.service';
import { SkillsService } from '../skills/skills.service';
import { ExperiencesService } from '../experiences/experiences.service';
import { UserService } from '../user/user.service';
import { CareerMemoryService } from '../career-memory/career-memory.service';
import { normalizeSkill } from '../../common/utils/text.util';
import { extractCvText, UploadedCv } from './cv-parser';
import { computeCvScore } from './cv-scoring';
import { rankCareers } from './career-scoring';
import { experienceKey, COMPANY_FALLBACK } from './experience-dedupe';

export interface ExperiencePreview {
  title: string;
  company: string;
  startYear: number | null;
  endYear: number | null;
  isCurrent: boolean;
}

@Injectable()
export class CvImportService {
  private readonly logger = new Logger(CvImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryAgent: MemoryAgentService,
    private readonly experienceExtractor: ExperienceExtractorService,
    private readonly skills: SkillsService,
    private readonly experiences: ExperiencesService,
    private readonly users: UserService,
    private readonly memory: CareerMemoryService,
  ) {}

  /** Create experiences found in the CV, skipping ones already on the profile.
   *  Non-blocking: any failure here must never break the whole CV import.
   *  Returns a diagnostic (found vs added, and any error) so the UI can explain
   *  why nothing appeared (parsing miss vs already-present vs failure). */
  private async importExperiences(
    userId: string,
    text: string,
  ): Promise<{ added: number; found: number; items: ExperiencePreview[]; error?: string }> {
    try {
      return await this.doImportExperiences(userId, text);
    } catch (err) {
      this.logger.error(`Experience import failed: ${(err as Error).message}`, (err as Error).stack);
      return { added: 0, found: 0, items: [], error: (err as Error).message };
    }
  }

  private async doImportExperiences(
    userId: string,
    text: string,
  ): Promise<{ added: number; found: number; items: ExperiencePreview[] }> {
    const extracted = await this.experienceExtractor.extract(text);
    this.logger.log(`CV import: ${extracted.length} experience(s) detected in the document.`);
    const items: ExperiencePreview[] = extracted.map((e) => ({
      title: e.title,
      company: e.company || COMPANY_FALLBACK,
      startYear: e.startDate ? e.startDate.getFullYear() : null,
      endYear: e.isCurrent ? null : (e.endDate ? e.endDate.getFullYear() : null),
      isCurrent: e.isCurrent,
    }));
    if (!extracted.length) return { added: 0, found: 0, items };

    // Dedupe against experiences already on the profile (so a re-import never
    // duplicates), but re-add anything that was deleted since the last import.
    const existing = await this.prisma.experience.findMany({
      where: { userId },
      select: { title: true, company: true },
    });
    const seen = new Set(existing.map((e) => experienceKey(e.title, e.company)));

    let added = 0;
    for (const exp of extracted) {
      const key = experienceKey(exp.title, exp.company);
      if (seen.has(key)) continue;
      seen.add(key);
      await this.prisma.experience.create({
        data: {
          userId,
          title: exp.title,
          company: exp.company || COMPANY_FALLBACK,
          startDate: exp.startDate ?? new Date(),
          endDate: exp.endDate,
          isCurrent: exp.isCurrent,
          description: exp.description || null,
          technologies: exp.technologies,
          source: 'ai_inferred',
          confidence: 0.6,
        },
      });
      added += 1;
    }

    if (added > 0) await this.experiences.recomputeYearsExperience(userId);
    return { added, found: extracted.length, items };
  }

  /**
   * Parse a CV file, extract skills/technologies via the Memory Agent, fuse
   * them into the profile (dedup), and recompute the employability score.
   */
  async importCv(userId: string, file: UploadedCv) {
    const text = await extractCvText(file);
    if (!text || text.trim().length < 30) {
      throw new BadRequestException('CV illisible ou vide — vérifie le fichier (PDF/DOCX).');
    }

    const extraction = await this.memoryAgent.extract(text);

    const addedSkills: string[] = [];
    for (const skill of extraction.skills) {
      await this.skills.upsert(
        userId,
        { name: skill.name, category: skill.category as never },
        skill.inferred ? DataSource.ai_inferred : DataSource.user,
      );
      addedSkills.push(skill.name);
    }

    await this.prisma.careerJournal.create({
      data: {
        userId,
        rawText: text.slice(0, 20000),
        extractedSkills: extraction.skills.map((s) => s.name),
        extractedTechnologies: extraction.technologies,
        extractedResponsibilities: extraction.responsibilities,
        extractedResults: extraction.results,
        applied: true,
      },
    });

    await this.memory.addMemory(userId, MemoryKind.experience, extraction.summary || 'CV importé', {
      source: 'cv_import',
      technologies: extraction.technologies,
    });

    // Auto-enrich the profile with the experiences found in the CV.
    const experiences = await this.importExperiences(userId, text);

    // Score the CV document itself across weighted criteria.
    const cvScore = computeCvScore(text, extraction);
    await this.prisma.user.update({ where: { id: userId }, data: { cvScore: cvScore.global } });

    // Métiers matching THIS CV specifically (distinct from the profile explorer).
    const careerMatches = rankCareers(
      new Set(extraction.skills.map((s) => normalizeSkill(s.name))),
    ).slice(0, 8);

    // Recompute after experiences so years-of-experience feeds the score.
    const employabilityScore = await this.users.recomputeEmployabilityScore(userId);
    await this.memory.createSnapshot(userId, 'CV importé', SnapshotTrigger.manual);

    return {
      fileName: file.originalname,
      extraction,
      addedSkills,
      experiencesAdded: experiences.added,
      experiencesFound: experiences.found,
      experiencesError: experiences.error,
      experiencesDetail: experiences.items,
      employabilityScore,
      cvScore,
      careerMatches,
    };
  }
}
