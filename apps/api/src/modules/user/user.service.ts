import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Injectable()
export class UserService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        headline: true,
        location: true,
        yearsExperience: true,
        targetRoles: true,
        employabilityScore: true,
        preferences: true,
        _count: { select: { skills: true, experiences: true } },
      },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  updateProfile(userId: string, dto: UpdateUserDto) {
    return this.prisma.user.update({ where: { id: userId }, data: dto });
  }

  getPreferences(userId: string) {
    return this.prisma.jobPreference.findUnique({ where: { userId } });
  }

  upsertPreferences(userId: string, dto: UpdatePreferencesDto) {
    return this.prisma.jobPreference.upsert({
      where: { userId },
      create: { userId, ...dto },
      update: dto,
    });
  }

  /**
   * Deterministic employability score (0–100). Transparent by design — never
   * produced by the LLM. Tunable as the market model matures in Phase 4.
   */
  async recomputeEmployabilityScore(userId: string): Promise<number> {
    const [skillCount, user, certCount, projectCount] = await Promise.all([
      this.prisma.skill.count({ where: { userId } }),
      this.prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { yearsExperience: true } }),
      this.prisma.certification.count({ where: { userId } }),
      this.prisma.project.count({ where: { userId } }),
    ]);

    const years = Number(user.yearsExperience);
    const skillScore = Math.min(skillCount * 4, 40); // up to 40 pts (10 skills)
    const expScore = Math.min(years * 5, 35); // up to 35 pts (7 yrs)
    const certScore = Math.min(certCount * 5, 15); // up to 15 pts
    const projectScore = Math.min(projectCount * 2, 10); // up to 10 pts

    const score = Math.round(skillScore + expScore + certScore + projectScore);
    await this.prisma.user.update({ where: { id: userId }, data: { employabilityScore: score } });
    return score;
  }

  /** RGPD: full export of the user's data. */
  async exportData(userId: string) {
    const { passwordHash, ...user } = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        experiences: true,
        skills: true,
        projects: true,
        certifications: true,
        preferences: true,
        journalEntries: true,
        reports: true,
        notifications: true,
        snapshots: true,
        matches: true,
      },
    });
    void passwordHash; // never exported
    return user;
  }

  /** RGPD: right to erasure — cascades to all related rows. */
  async deleteAccount(userId: string) {
    await this.prisma.user.delete({ where: { id: userId } });
    return { deleted: true };
  }
}
