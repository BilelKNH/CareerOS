import { Injectable } from '@nestjs/common';
import { DataSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { assertOwnership } from '../../common/utils/ownership';
import { normalizeSkill } from '../../common/utils/text.util';
import { CreateSkillDto } from './dto/create-skill.dto';
import { UpdateSkillDto } from './dto/update-skill.dto';

// Re-exported for backwards compatibility with existing imports/tests.
export { normalizeSkill };

@Injectable()
export class SkillsService {
  constructor(private readonly prisma: PrismaService) {}

  list(userId: string) {
    return this.prisma.skill.findMany({
      where: { userId },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Idempotent add: upsert on (userId, normalizedName) so re-adding an existing
   * skill never creates a duplicate. Used by the API and by the Memory agent.
   */
  upsert(userId: string, dto: CreateSkillDto, source: DataSource = DataSource.user) {
    const normalizedName = normalizeSkill(dto.name);
    return this.prisma.skill.upsert({
      where: { userId_normalizedName: { userId, normalizedName } },
      create: {
        userId,
        name: dto.name.trim(),
        normalizedName,
        category: dto.category,
        level: dto.level,
        years: dto.years,
        source,
      },
      update: {
        category: dto.category,
        level: dto.level,
        years: dto.years,
        lastUsedAt: new Date(),
      },
    });
  }

  async update(userId: string, id: string, dto: UpdateSkillDto) {
    assertOwnership(await this.prisma.skill.findUnique({ where: { id } }), userId, 'Skill');
    return this.prisma.skill.update({
      where: { id },
      data: {
        ...dto,
        normalizedName: dto.name ? normalizeSkill(dto.name) : undefined,
      },
    });
  }

  async remove(userId: string, id: string) {
    assertOwnership(await this.prisma.skill.findUnique({ where: { id } }), userId, 'Skill');
    await this.prisma.skill.delete({ where: { id } });
    return { deleted: true };
  }

  /** Wipe every skill on the profile — used to reset a polluted profile. */
  async clear(userId: string) {
    const { count } = await this.prisma.skill.deleteMany({ where: { userId } });
    return { deleted: count };
  }
}
