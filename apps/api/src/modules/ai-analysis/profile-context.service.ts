import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface ProfileContext {
  headline: string | null;
  location: string | null;
  yearsExperience: number;
  skills: { name: string; category: string; level: string }[];
  experiences: { title: string; company: string; technologies: string[] }[];
  certifications: { name: string; status: string }[];
  targetRoles: string[];
}

@Injectable()
export class ProfileContextService {
  constructor(private readonly prisma: PrismaService) {}

  async build(userId: string): Promise<ProfileContext> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        skills: { select: { name: true, category: true, level: true } },
        experiences: {
          orderBy: { startDate: 'desc' },
          select: { title: true, company: true, technologies: true },
        },
        certifications: { select: { name: true, status: true } },
      },
    });

    return {
      headline: user.headline,
      location: user.location,
      yearsExperience: Number(user.yearsExperience),
      skills: user.skills,
      experiences: user.experiences,
      certifications: user.certifications,
      targetRoles: user.targetRoles,
    };
  }

  /** Compact textual rendering for LLM prompts. */
  toText(ctx: ProfileContext): string {
    const skills = ctx.skills.map((s) => s.name).join(', ');
    const exp = ctx.experiences.map((e) => `${e.title} @ ${e.company}`).join(' ; ');
    const certs = ctx.certifications.map((c) => c.name).join(', ') || 'aucune';
    return [
      `Titre: ${ctx.headline ?? 'N/A'}`,
      `Localisation: ${ctx.location ?? 'N/A'}`,
      `Années d'expérience: ${ctx.yearsExperience}`,
      `Rôles visés: ${ctx.targetRoles.join(', ') || 'N/A'}`,
      `Compétences: ${skills || 'aucune'}`,
      `Expériences: ${exp || 'aucune'}`,
      `Certifications: ${certs}`,
    ].join('\n');
  }
}
