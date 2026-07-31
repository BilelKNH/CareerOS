import { ExtractionResult } from '../ai-analysis/extraction.types';

export interface CvCriterion {
  key: string;
  label: string;
  score: number; // 0-100
  weight: number; // 0-1
}

export interface CvScore {
  global: number;
  criteria: CvCriterion[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

const RECOMMENDATIONS: Record<string, string> = {
  structure: 'Structure le CV en sections claires : Profil, Expériences, Compétences, Formation.',
  skills: 'Liste davantage de compétences techniques concrètes (langages, frameworks, outils cloud).',
  achievements: 'Quantifie tes réalisations (chiffres, %, impact) avec des verbes d’action.',
  experience: 'Précise les dates de chaque expérience (période et durée).',
  readability: 'Vise 1 à 2 pages, avec des puces courtes et une mise en page aérée.',
  contact: 'Mets email et téléphone en évidence ; garde un CV lisible par les ATS (texte, pas image).',
};

/**
 * Deterministic, transparent CV scorer. Evaluates the document itself across
 * six weighted criteria and returns a breakdown + actionable recommendations.
 * No LLM required (works offline).
 */
export function computeCvScore(rawText: string, extraction: ExtractionResult): CvScore {
  const text = rawText || '';
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean).length;

  // 1. Structure & sections
  const sections = {
    contact: /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text) || /(\+?\d[\d .()-]{7,})/.test(text),
    experience: /(exp[ée]rience|parcours professionnel|work experience|emploi)/i.test(lower),
    education: /(formation|[ée]ducation|dipl[oô]me|licence|master|bts|but|universit)/i.test(lower),
    skills: /(comp[ée]tences|skills|technologies|stack technique)/i.test(lower),
    summary: /(r[ée]sum[ée]|profil|à propos|about|summary|objectif)/i.test(lower),
  };
  const sectionsPresent = Object.values(sections).filter(Boolean).length;
  const structureScore = (sectionsPresent / 5) * 100;

  // 2. Skills richness (any domain — tech or business)
  const skillCount = extraction.skills.length;
  const skillsScore = Math.min(skillCount / 10, 1) * 100;

  // 3. Quantified achievements (numbers + action verbs)
  const numberHits = (
    lower.match(/\b\d+([.,]\d+)?\s?(%|k€|k\$|€|ans?|mois|projets?|utilisateurs?|clients?|tests?)\b/gi) || []
  ).length;
  const verbHits = (
    lower.match(
      /\b(mis en place|d[ée]velopp[ée]|con[çc]u|automatis[ée]|am[ée]lior[ée]|r[ée]duit|optimis[ée]|g[ée]r[ée]|dirig[ée]|livr[ée]|d[ée]ploy[ée]|cr[éeè][ée])\w*/gi,
    ) || []
  ).length;
  const achievementsScore = Math.min(numberHits * 14 + verbHits * 7, 100);

  // 4. Experience signals (date ranges / durations)
  const dateRanges = (text.match(/\b(19|20)\d{2}\s?[-–—/]\s?((19|20)\d{2}|pr[ée]sent|present|aujourd)/gi) || [])
    .length;
  const durationMentions = (lower.match(/\b\d{1,2}\s?ans?\b/g) || []).length;
  const experienceScore = dateRanges
    ? Math.min(dateRanges * 30, 100)
    : durationMentions
      ? 55
      : 20;

  // 5. Readability & length
  let readabilityScore: number;
  if (words < 150) readabilityScore = 40;
  else if (words < 300) readabilityScore = 70;
  else if (words <= 1000) readabilityScore = 100;
  else if (words <= 1500) readabilityScore = 80;
  else readabilityScore = 60;

  // 6. Contact & ATS-friendliness
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const hasPhone = /(\+?\d[\d .()-]{7,})/.test(text);
  const contactScore = (hasEmail ? 50 : 0) + (hasPhone ? 30 : 0) + (words > 50 ? 20 : 0);

  const criteria: CvCriterion[] = [
    { key: 'structure', label: 'Structure & sections', score: clamp(structureScore), weight: 0.2 },
    { key: 'skills', label: 'Compétences techniques', score: clamp(skillsScore), weight: 0.2 },
    { key: 'achievements', label: 'Réalisations quantifiées', score: clamp(achievementsScore), weight: 0.2 },
    { key: 'experience', label: 'Expérience & dates', score: clamp(experienceScore), weight: 0.15 },
    { key: 'readability', label: 'Lisibilité & longueur', score: clamp(readabilityScore), weight: 0.15 },
    { key: 'contact', label: 'Coordonnées & ATS', score: clamp(contactScore), weight: 0.1 },
  ];

  const global = clamp(criteria.reduce((sum, c) => sum + c.score * c.weight, 0));
  const strengths = criteria.filter((c) => c.score >= 75).map((c) => c.label);
  const weak = criteria.filter((c) => c.score < 55);
  const weaknesses = weak.map((c) => c.label);
  const recommendations = weak.map((c) => RECOMMENDATIONS[c.key]).filter(Boolean);

  return { global, criteria, strengths, weaknesses, recommendations };
}
