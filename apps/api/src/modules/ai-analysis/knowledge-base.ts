import { SkillCategoryValue } from './extraction.types';

interface KbEntry {
  /** lowercase patterns that trigger this entry */
  patterns: string[];
  name: string;
  category: SkillCategoryValue;
  /** implied concepts added as inferred skills */
  related?: { name: string; category: SkillCategoryValue }[];
}

/**
 * Domain knowledge base used by the heuristic fallback (no API key).
 * `related` encodes the "GitHub Actions => CI/CD, YAML, DevOps" expansion
 * from the product spec. All related items are flagged inferred downstream.
 */
export const KNOWLEDGE_BASE: KbEntry[] = [
  {
    patterns: ['github actions', 'gh actions'],
    name: 'GitHub Actions',
    category: 'tool',
    related: [
      { name: 'CI/CD', category: 'methodology' },
      { name: 'YAML', category: 'language' },
      { name: 'DevOps', category: 'methodology' },
    ],
  },
  {
    patterns: ['gitlab ci', 'gitlab-ci'],
    name: 'GitLab CI',
    category: 'tool',
    related: [
      { name: 'CI/CD', category: 'methodology' },
      { name: 'YAML', category: 'language' },
      { name: 'DevOps', category: 'methodology' },
    ],
  },
  {
    patterns: ['jenkins'],
    name: 'Jenkins',
    category: 'tool',
    related: [{ name: 'CI/CD', category: 'methodology' }],
  },
  {
    patterns: ['playwright'],
    name: 'Playwright',
    category: 'framework',
    related: [
      { name: 'Automatisation', category: 'methodology' },
      { name: 'QA Automation', category: 'methodology' },
    ],
  },
  {
    patterns: ['cypress'],
    name: 'Cypress',
    category: 'framework',
    related: [{ name: 'QA Automation', category: 'methodology' }],
  },
  {
    patterns: ['selenium'],
    name: 'Selenium',
    category: 'framework',
    related: [{ name: 'QA Automation', category: 'methodology' }],
  },
  {
    patterns: ['typescript', ' ts '],
    name: 'TypeScript',
    category: 'language',
  },
  { patterns: ['javascript', ' js '], name: 'JavaScript', category: 'language' },
  { patterns: ['python'], name: 'Python', category: 'language' },
  { patterns: ['docker'], name: 'Docker', category: 'tool', related: [{ name: 'DevOps', category: 'methodology' }] },
  {
    patterns: ['kubernetes', 'k8s'],
    name: 'Kubernetes',
    category: 'tool',
    related: [{ name: 'DevOps', category: 'methodology' }],
  },
  { patterns: ['terraform'], name: 'Terraform', category: 'tool', related: [{ name: 'IaC', category: 'methodology' }] },
  { patterns: ['aws'], name: 'AWS', category: 'cloud' },
  { patterns: ['azure'], name: 'Azure', category: 'cloud' },
  { patterns: ['gcp', 'google cloud'], name: 'GCP', category: 'cloud' },
  { patterns: ['postgres', 'postgresql'], name: 'PostgreSQL', category: 'tool' },
  { patterns: ['playwright test', 'jest'], name: 'Jest', category: 'framework' },
  { patterns: ['api rest', 'rest api', 'endpoint'], name: 'API REST', category: 'methodology' },
  { patterns: ['agile', 'scrum'], name: 'Agile/Scrum', category: 'methodology' },

  // --- Commercial & vente ---
  {
    patterns: ['prospection', 'prospecter'],
    name: 'Prospection',
    category: 'methodology',
    related: [{ name: 'Développement commercial', category: 'methodology' }],
  },
  { patterns: ['négociation', 'negociation', 'négocier'], name: 'Négociation', category: 'methodology' },
  {
    patterns: ['vente b2b', 'b to b', 'btob', 'commercial b2b'],
    name: 'Vente B2B',
    category: 'methodology',
    related: [{ name: 'Relation client', category: 'soft' }],
  },
  { patterns: ['développement commercial', 'developpement commercial', 'business development'], name: 'Développement commercial', category: 'methodology' },
  { patterns: ['salesforce'], name: 'Salesforce', category: 'tool', related: [{ name: 'CRM', category: 'tool' }] },
  { patterns: ['hubspot'], name: 'HubSpot', category: 'tool', related: [{ name: 'CRM', category: 'tool' }] },
  { patterns: ['crm'], name: 'CRM', category: 'tool' },
  { patterns: ['relation client', 'relation clientèle', 'clientele'], name: 'Relation client', category: 'soft' },
  { patterns: ['closing'], name: 'Closing', category: 'methodology' },
  { patterns: ['gestion de compte', 'account management', 'key account'], name: 'Gestion de compte', category: 'methodology' },

  // --- Marketing & digital ---
  { patterns: ['marketing'], name: 'Marketing', category: 'methodology' },
  { patterns: ['seo', 'référencement naturel', 'referencement naturel'], name: 'SEO', category: 'methodology' },
  { patterns: ['sea', 'google ads', 'adwords'], name: 'SEA', category: 'methodology' },
  { patterns: ['google analytics'], name: 'Google Analytics', category: 'tool' },
  { patterns: ['community management', 'community manager'], name: 'Community management', category: 'methodology' },
  { patterns: ['réseaux sociaux', 'reseaux sociaux', 'social media'], name: 'Réseaux sociaux', category: 'tool' },
  { patterns: ['emailing', 'e-mailing'], name: 'Emailing', category: 'tool' },
  { patterns: ['copywriting', 'rédaction web', 'redaction web'], name: 'Copywriting', category: 'methodology' },

  // --- RH ---
  {
    patterns: ['recrutement', 'recruteur', 'talent acquisition'],
    name: 'Recrutement',
    category: 'methodology',
    related: [{ name: 'Sourcing', category: 'methodology' }],
  },
  { patterns: ['sourcing'], name: 'Sourcing', category: 'methodology' },
  { patterns: ['paie', 'gestionnaire de paie'], name: 'Paie', category: 'methodology' },
  { patterns: ['droit du travail'], name: 'Droit du travail', category: 'methodology' },
  { patterns: ['sirh'], name: 'SIRH', category: 'tool' },

  // --- Finance & compta ---
  { patterns: ['comptabilité', 'comptabilite', 'comptable'], name: 'Comptabilité', category: 'methodology' },
  { patterns: ['contrôle de gestion', 'controle de gestion'], name: 'Contrôle de gestion', category: 'methodology' },
  { patterns: ['analyse financière', 'analyse financiere'], name: 'Analyse financière', category: 'methodology' },
  { patterns: ['fiscalité', 'fiscalite'], name: 'Fiscalité', category: 'methodology' },
  { patterns: ['sap'], name: 'SAP', category: 'tool' },
  { patterns: ['excel', 'tableur'], name: 'Excel', category: 'tool' },

  // --- Gestion / management / soft ---
  { patterns: ['gestion de projet', 'chef de projet', 'project management'], name: 'Gestion de projet', category: 'methodology' },
  { patterns: ['management', 'encadrement', 'manager une équipe'], name: 'Management', category: 'soft' },
  { patterns: ['leadership'], name: 'Leadership', category: 'soft' },
  { patterns: ['reporting'], name: 'Reporting', category: 'methodology' },
  { patterns: ['communication'], name: 'Communication', category: 'soft' },

  // --- Design ---
  { patterns: ['figma'], name: 'Figma', category: 'tool' },
  { patterns: ['photoshop'], name: 'Photoshop', category: 'tool', related: [{ name: 'Adobe', category: 'tool' }] },
  { patterns: ['illustrator'], name: 'Illustrator', category: 'tool', related: [{ name: 'Adobe', category: 'tool' }] },
  { patterns: ['ux design', ' ux '], name: 'UX', category: 'methodology' },
  { patterns: ['ui design', ' ui '], name: 'UI', category: 'methodology' },

  // --- Logistique ---
  { patterns: ['logistique'], name: 'Logistique', category: 'methodology' },
  { patterns: ['supply chain'], name: 'Supply Chain', category: 'methodology' },
  { patterns: ['gestion de stock', 'gestion des stocks', 'gestion des stock'], name: 'Gestion de stock', category: 'methodology' },
  { patterns: ['erp'], name: 'ERP', category: 'tool' },

  // --- Commerce / retail / prêt-à-porter ---
  {
    patterns: ['vente', 'vendeur', 'vendeuse', 'conseiller de vente', 'conseillère de vente'],
    name: 'Vente',
    category: 'methodology',
    related: [{ name: 'Relation client', category: 'soft' }],
  },
  { patterns: ['conseil client', 'conseil clientèle', 'conseil clientele', 'conseil en image'], name: 'Conseil client', category: 'soft' },
  { patterns: ['accueil client', 'accueil de la clientèle', 'accueil physique'], name: 'Accueil client', category: 'soft' },
  { patterns: ['encaissement', 'tenue de caisse', 'gestion de caisse', 'caisse'], name: 'Encaissement', category: 'methodology' },
  {
    patterns: ['merchandising', 'marchandisage', 'visual merchandising', 'vitrine', 'vitrines'],
    name: 'Merchandising',
    category: 'methodology',
  },
  { patterns: ['mise en rayon', 'réassort', 'reassort', 'réassortiment', 'facing'], name: 'Mise en rayon', category: 'methodology' },
  { patterns: ['fidélisation', 'fidelisation', 'fidélité client', 'carte de fidélité'], name: 'Fidélisation client', category: 'methodology' },
  { patterns: ['inventaire', 'inventaires'], name: 'Inventaire', category: 'methodology' },
  { patterns: ['prêt-à-porter', 'pret-a-porter', 'prêt à porter', 'pret a porter', 'mode', 'textile', 'retail'], name: 'Prêt-à-porter', category: 'methodology' },
  { patterns: ['service client', 'service clientèle', 'service apres-vente', 'service après-vente', 'sav'], name: 'Service client', category: 'soft' },
  { patterns: ['objectifs de vente', "chiffre d'affaires", "chiffre d’affaires", 'ca magasin'], name: 'Objectifs de vente', category: 'methodology' },
  { patterns: ['gestion de magasin', 'responsable de magasin', 'tenue du magasin', 'ouverture magasin', 'fermeture magasin'], name: 'Gestion de magasin', category: 'methodology' },
];
