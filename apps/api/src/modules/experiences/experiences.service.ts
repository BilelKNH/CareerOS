import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { assertOwnership } from '../../common/utils/ownership';
import { CreateExperienceDto } from './dto/create-experience.dto';
import { UpdateExperienceDto } from './dto/update-experience.dto';

@Injectable()
export class ExperiencesService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.experience.findMany({
      where: { userId },
      orderBy: { startDate: 'desc' },
    });
  }

  async create(userId: string, dto: CreateExperienceDto) {
    const exp = await this.prisma.experience.create({
      data: {
        userId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: dto.endDate ? new Date(dto.endDate) : null,
      },
    });
    await this.recomputeYearsExperience(userId);
    return exp;
  }

  async update(userId: string, id: string, dto: UpdateExperienceDto) {
    assertOwnership(await this.prisma.experience.findUnique({ where: { id } }), userId, 'Experience');
    const exp = await this.prisma.experience.update({
      where: { id },
      data: {
        ...dto,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
    });
    await this.recomputeYearsExperience(userId);
    return exp;
  }

  async remove(userId: string, id: string) {
    assertOwnership(await this.prisma.experience.findUnique({ where: { id } }), userId, 'Experience');
    await this.prisma.experience.delete({ where: { id } });
    await this.recomputeYearsExperience(userId);
    return { deleted: true };
  }

  /**
   * Sums the (non-overlapping) durations of all experiences and stores the
   * total years on the user. Kept deterministic — never inferred by the LLM.
   */
  async recomputeYearsExperience(userId: string) {
    const experiences = await this.prisma.experience.findMany({ where: { userId } });
    const intervals = experiences
      .map((e) => ({
        start: e.startDate.getTime(),
        end: (e.endDate ?? new Date()).getTime(),
      }))
      .sort((a, b) => a.start - b.start);

    let totalMs = 0;
    let cursor = 0;
    for (const { start, end } of intervals) {
      const s = Math.max(start, cursor);
      if (end > s) {
        totalMs += end - s;
        cursor = Math.max(cursor, end);
      }
    }
    const years = Math.round((totalMs / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10;
    await this.prisma.user.update({ where: { id: userId }, data: { yearsExperience: years } });
    return years;
  }
}
