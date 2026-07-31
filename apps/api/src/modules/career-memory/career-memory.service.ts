import { Injectable } from '@nestjs/common';
import { MemoryKind, SnapshotTrigger, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { EmbeddingService } from './embedding.service';

export interface MemoryHit {
  id: string;
  kind: MemoryKind;
  content: string;
  distance: number;
}

@Injectable()
export class CareerMemoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly embeddings: EmbeddingService,
  ) {}

  /**
   * Store a memory item with its embedding (raw SQL because Prisma doesn't
   * model the `vector` type). Embedding may be null if no provider is set.
   */
  async addMemory(
    userId: string,
    kind: MemoryKind,
    content: string,
    metadata?: Record<string, unknown>,
  ) {
    const vec = await this.embeddings.embed(content);
    const meta = metadata ? JSON.stringify(metadata) : null;

    if (vec) {
      const literal = this.embeddings.toVectorLiteral(vec);
      await this.prisma.$executeRaw`
        INSERT INTO "CareerMemory" ("id", "userId", "kind", "content", "embedding", "metadata", "createdAt")
        VALUES (gen_random_uuid(), ${userId}, ${kind}::"MemoryKind", ${content},
                ${literal}::vector, ${meta}::jsonb, now())`;
    } else {
      await this.prisma.$executeRaw`
        INSERT INTO "CareerMemory" ("id", "userId", "kind", "content", "metadata", "createdAt")
        VALUES (gen_random_uuid(), ${userId}, ${kind}::"MemoryKind", ${content}, ${meta}::jsonb, now())`;
    }
    return { stored: true, embedded: Boolean(vec) };
  }

  /** Semantic retrieval over the user's memory (cosine distance). */
  async query(userId: string, query: string, k = 6): Promise<MemoryHit[]> {
    const vec = await this.embeddings.embed(query);
    if (!vec) {
      const rows = await this.prisma.careerMemory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: k,
        select: { id: true, kind: true, content: true },
      });
      return rows.map((r) => ({ ...r, distance: 0 }));
    }
    const literal = this.embeddings.toVectorLiteral(vec);
    return this.prisma.$queryRaw<MemoryHit[]>`
      SELECT "id", "kind", "content", ("embedding" <=> ${literal}::vector) AS distance
      FROM "CareerMemory"
      WHERE "userId" = ${userId} AND "embedding" IS NOT NULL
      ORDER BY distance ASC
      LIMIT ${k}`;
  }

  /**
   * Immutable, versioned snapshot of the full profile. Enables rollback and a
   * complete change history — nothing is ever overwritten.
   */
  async createSnapshot(userId: string, reason: string, triggeredBy: SnapshotTrigger) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        experiences: true,
        skills: true,
        projects: true,
        certifications: true,
        preferences: true,
      },
    });
    const last = await this.prisma.memorySnapshot.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
    });
    const version = (last?.version ?? 0) + 1;

    return this.prisma.memorySnapshot.create({
      data: {
        userId,
        version,
        reason,
        triggeredBy,
        profile: user as unknown as Prisma.InputJsonValue,
      },
    });
  }

  listSnapshots(userId: string) {
    return this.prisma.memorySnapshot.findMany({
      where: { userId },
      orderBy: { version: 'desc' },
      select: { id: true, version: true, reason: true, triggeredBy: true, createdAt: true },
    });
  }

  /** Reconstruct a working context: latest profile snapshot + relevant memories. */
  async rebuildContext(userId: string, focus?: string) {
    const snapshot = await this.prisma.memorySnapshot.findFirst({
      where: { userId },
      orderBy: { version: 'desc' },
    });
    const memories = focus
      ? await this.query(userId, focus, 8)
      : (
          await this.prisma.careerMemory.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: 8,
            select: { id: true, kind: true, content: true },
          })
        ).map((r) => ({ ...r, distance: 0 }));

    return { snapshot, memories };
  }
}
