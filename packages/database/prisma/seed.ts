import { config } from 'dotenv';
import { resolve } from 'path';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';

// Load env from the monorepo root (seed runs outside the Prisma CLI env loader).
config({ path: resolve(process.cwd(), '../../.env') });
config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const email = 'bilelknh@gmail.com';
  const passwordHash = await bcrypt.hash('careeros', 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName: 'Bilel',
      headline: 'QA Automation Engineer',
      location: 'Lille, France',
      yearsExperience: 5,
      targetRoles: ['QA Automation Engineer', 'SDET', 'QA Lead'],
      employabilityScore: 72,
      preferences: {
        create: {
          desiredRoles: ['QA Automation Engineer', 'SDET', 'Test Automation Engineer'],
          locations: ['Lille', 'Belgique', 'Remote', 'France'],
          remote: 'remote',
          contractTypes: ['CDI', 'Freelance'],
          tjmMin: 450,
          tjmMax: 650,
          keywords: ['Playwright', 'TypeScript', 'CI/CD', 'AWS', 'Cloud QA'],
        },
      },
    },
  });

  const skills: { name: string; category: any; level: any; years: number }[] = [
    { name: 'Playwright', category: 'framework', level: 'senior', years: 3 },
    { name: 'TypeScript', category: 'language', level: 'senior', years: 4 },
    { name: 'CI/CD', category: 'methodology', level: 'confirme', years: 3 },
    { name: 'GitHub Actions', category: 'tool', level: 'confirme', years: 2 },
    { name: 'QA Automation', category: 'methodology', level: 'senior', years: 5 },
  ];

  for (const s of skills) {
    await prisma.skill.upsert({
      where: { userId_normalizedName: { userId: user.id, normalizedName: s.name.toLowerCase() } },
      update: {},
      create: {
        userId: user.id,
        name: s.name,
        normalizedName: s.name.toLowerCase(),
        category: s.category,
        level: s.level,
        years: s.years,
        source: 'user',
      },
    });
  }

  console.log(`Seeded user ${user.email} (password: "careeros") with ${skills.length} skills.`);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
