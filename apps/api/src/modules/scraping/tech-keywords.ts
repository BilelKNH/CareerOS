// Shared skill detection for sources/CV parsing whose payloads have no clean
// "skills" field. Deliberately broad: tech AND non-tech (commercial, marketing,
// RH, finance, logistique…) so the app fits any profile.
export const TECH_KEYWORDS = [
  // --- Tech ---
  'Playwright', 'Cypress', 'Selenium', 'TypeScript', 'JavaScript', 'Python', 'Java',
  'GitHub Actions', 'GitLab CI', 'Jenkins', 'CI/CD', 'Docker', 'Kubernetes', 'Terraform',
  'AWS', 'Azure', 'GCP', 'PostgreSQL', 'SQL', 'Jest', 'Cucumber', 'Robot Framework',
  'API REST', 'Agile', 'Scrum', 'Appium', 'JMeter', 'Postman', 'React', 'Node.js',
  'Machine Learning', 'ETL', 'Linux', 'Git', 'Jira',

  // --- Commercial & vente ---
  'Prospection', 'Négociation', 'Vente B2B', 'Vente', 'Développement commercial', 'CRM',
  'Salesforce', 'HubSpot', 'Relation client', 'Closing', 'Gestion de compte', 'Upsell',
  'Stratégie commerciale',

  // --- Marketing & digital ---
  'Marketing', 'SEO', 'SEA', 'Google Analytics', 'Publicité en ligne', 'Content',
  'Community management', 'Réseaux sociaux', 'Emailing', 'Copywriting', 'Growth', 'A/B testing',

  // --- RH ---
  'Recrutement', 'Sourcing', 'Paie', 'Droit du travail', 'SIRH', 'Gestion RH',
  'Relations sociales', 'Administration du personnel',

  // --- Finance & compta ---
  'Comptabilité', 'Contrôle de gestion', 'Analyse financière', 'Fiscalité', 'SAP', 'Sage',
  'Consolidation', 'Excel',

  // --- Gestion / projet / management ---
  'Gestion de projet', 'Management', 'Leadership', 'Planification', 'Reporting', 'Budget',
  'Communication', 'Organisation',

  // --- Design ---
  'Figma', 'Adobe', 'Photoshop', 'Illustrator', 'UX', 'UI', 'Prototypage',

  // --- Logistique & support ---
  'Logistique', 'Supply Chain', 'Gestion de stock', 'ERP', 'Approvisionnement', 'Ticketing',

  // --- Juridique / admin ---
  'Droit', 'Contrats', 'Veille juridique', 'Bureautique', 'Gestion administrative',
];

export function detectTech(text: string): string[] {
  const haystack = (text || '').toLowerCase();
  return TECH_KEYWORDS.filter((t) => haystack.includes(t.toLowerCase()));
}
