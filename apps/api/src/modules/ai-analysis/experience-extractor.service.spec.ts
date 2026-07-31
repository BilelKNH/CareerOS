import { ExperienceExtractorService } from './experience-extractor.service';
import { LlmService } from './llm.service';

const svc = new ExperienceExtractorService({ available: false } as unknown as LlmService);

describe('ExperienceExtractorService (heuristic)', () => {
  it('extracts dated experiences with title, company and current flag', async () => {
    const cv = [
      'Expériences professionnelles',
      '2021 - présent  QA Automation Engineer - Acme',
      'Automatisation des tests avec Playwright et CI/CD.',
      '2018 - 2021  Testeur, Nimbus',
      'Tests manuels et Selenium.',
    ].join('\n');

    const exps = await svc.extract(cv);

    expect(exps).toHaveLength(2);
    expect(exps[0].isCurrent).toBe(true);
    expect(exps[0].title.toLowerCase()).toContain('qa');
    expect(exps[0].company.toLowerCase()).toContain('acme');
    expect(exps[0].technologies).toEqual(expect.arrayContaining(['Playwright']));
    expect(exps[1].startDate?.getFullYear()).toBe(2018);
    expect(exps[1].endDate?.getFullYear()).toBe(2021);
  });

  it('returns nothing for text without dated experiences', async () => {
    expect(await svc.extract('un texte sans dates ni postes')).toHaveLength(0);
  });

  it('excludes education / diplomas from experiences', async () => {
    const cv = [
      'Expérience professionnelle',
      '2022 - présent  QA Automation Engineer - Acme',
      'Playwright, CI/CD.',
      'Formation',
      '2019 - 2022  Master informatique, EPSI Lille',
      '2017 - 2019  BTS SIO',
    ].join('\n');

    const exps = await svc.extract(cv);

    const companies = exps.map((e) => e.company.toLowerCase());
    expect(companies.some((c) => c.includes('epsi'))).toBe(false);
    expect(exps.every((e) => !/bts|master|epsi/i.test(`${e.title} ${e.company}`))).toBe(true);
    expect(exps.some((e) => e.company.toLowerCase().includes('acme'))).toBe(true);
  });

  it('drops a diploma line even without an explicit section header', async () => {
    const exps = await svc.extract('2019 - 2022  Master informatique EPSI Lille');
    expect(exps).toHaveLength(0);
  });
});

describe('ExperienceExtractorService — real-world date formats', () => {
  const cv = (lines: string[]) => lines.join('\n');

  it('parses "MM/YYYY - MM/YYYY"', async () => {
    const [e] = await svc.extract(cv(['EXPERIENCES', 'QA Engineer - Decathlon', '09/2022 - 07/2024', 'Tests.']));
    expect([e.title, e.company, e.startDate?.getFullYear(), e.endDate?.getFullYear()]).toEqual([
      'QA Engineer', 'Decathlon', 2022, 2024,
    ]);
  });

  it('parses full/abbreviated French months', async () => {
    const [e] = await svc.extract(cv(['EXPERIENCES', 'SDET chez Capgemini', 'Sept. 2020 – Déc. 2022', 'CI/CD.']));
    expect([e.company, e.startDate?.getFullYear(), e.endDate?.getFullYear()]).toEqual(['Capgemini', 2020, 2022]);
  });

  it('parses "<month> YYYY - aujourd’hui" and keeps "Poste @ Société"', async () => {
    const [e] = await svc.extract(cv(['EXPERIENCES', 'Ingénieur QA @ OVH', 'janvier 2023 - aujourd’hui', 'API REST.']));
    expect([e.title, e.company, e.isCurrent]).toEqual(['Ingénieur QA', 'OVH', true]);
  });

  it('parses open-ended "Depuis YYYY"', async () => {
    const [e] = await svc.extract(cv(['EXPERIENCES', 'Testeur — Worldline', 'Depuis 2021', 'Selenium.']));
    expect([e.company, e.startDate?.getFullYear(), e.isCurrent]).toEqual(['Worldline', 2021, true]);
  });

  it('parses "YYYY à YYYY"', async () => {
    const [e] = await svc.extract(cv(['EXPERIENCES', 'Consultant QA - Sopra', '2019 à 2021', 'Robot.']));
    expect([e.company, e.startDate?.getFullYear(), e.endDate?.getFullYear()]).toEqual(['Sopra', 2019, 2021]);
  });

  it('parses dates inline with the job title and trims separators', async () => {
    const [e] = await svc.extract(cv(['EXPERIENCES', 'Lead QA — Thales · mars 2018 - févr. 2020', 'Management.']));
    expect([e.title, e.company]).toEqual(['Lead QA', 'Thales']);
  });
});
