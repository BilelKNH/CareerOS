import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { DataSource, MemoryKind, SnapshotTrigger } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { MemoryAgentService } from '../ai-analysis/memory-agent.service';
import { ExtractionResult } from '../ai-analysis/extraction.types';
import { SkillsService } from '../skills/skills.service';
import { UserService } from '../user/user.service';
import { CareerMemoryService } from '../career-memory/career-memory.service';

@Injectable()
export class CareerJournalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly memoryAgent: MemoryAgentService,
    private readonly skills: SkillsService,
    private readonly users: UserService,
    private readonly memory: CareerMemoryService,
  ) {}

  list(userId: string) {
    return this.prisma.careerJournal.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Create an entry. Always stores the raw text + extraction. If `apply`,
   * fuses the extraction into the profile (dedup, memory, snapshot, rescore).
   */
  async create(userId: string, rawText: string, apply = false) {
    const extraction = await this.memoryAgent.extract(rawText);

    const entry = await this.prisma.careerJournal.create({
      data: {
        userId,
        rawText,
        extractedSkills: extraction.skills.map((s) => s.name),
        extractedTechnologies: extraction.technologies,
        extractedResponsibilities: extraction.responsibilities,
        extractedResults: extraction.results,
        applied: false,
      },
    });

    if (apply) {
      const result = await this.applyExtraction(userId, entry.id, extraction);
      return { entry: { ...entry, applied: true }, extraction, ...result };
    }
    return { entry, extraction, preview: true };
  }

  /** Re-run extraction on a stored entry and fuse it into the profile. */
  async apply(userId: string, entryId: string) {
    const entry = await this.prisma.careerJournal.findUnique({ where: { id: entryId } });
    if (!entry) throw new NotFoundException('Journal entry not found');
    if (entry.userId !== userId) throw new ForbiddenException();

    const extraction = await this.memoryAgent.extract(entry.rawText);
    const result = await this.applyExtraction(userId, entryId, extraction);
    return { extraction, ...result };
  }

  /** Fusion logic — shared by create(apply) and apply(). */
  private async applyExtraction(userId: string, entryId: string, extraction: ExtractionResult) {
    const addedSkills: string[] = [];
    for (const skill of extraction.skills) {
      await this.skills.upsert(
        userId,
        { name: skill.name, category: skill.category as never },
        skill.inferred ? DataSource.ai_inferred : DataSource.user,
      );
      addedSkills.push(skill.name);
    }

    // Persist to vector memory so future retrieval/matching has this context.
    await this.memory.addMemory(userId, MemoryKind.achievement, extraction.summary || 'Journal entry', {
      source: 'career_journal',
      technologies: extraction.technologies,
    });

    const employabilityScore = await this.users.recomputeEmployabilityScore(userId);

    await this.prisma.careerJournal.update({
      where: { id: entryId },
      data: { applied: true },
    });

    await this.memory.createSnapshot(userId, 'Career journal entry applied', SnapshotTrigger.journal);

    return { applied: true, addedSkills, employabilityScore };
  }
}
