// Catalogue de métiers par secteur, avec les compétences typiques attendues.
// Volontairement large (tech ET non-tech) pour couvrir tout type de profil :
// commercial, marketing, RH, finance, logistique, design, etc.
// Sert à scorer le profil contre un éventail de métiers, indépendamment des
// offres présentes en base.

export interface Metier {
  sector: string;
  role: string;
  skills: string[];
}

export const METIERS_CATALOG: Metier[] = [
  // --- Test & QA ---
  { sector: 'Test & QA', role: 'QA Automation Engineer', skills: ['Playwright', 'TypeScript', 'CI/CD', 'QA Automation', 'Selenium', 'Git'] },
  { sector: 'Test & QA', role: 'SDET (Software Engineer in Test)', skills: ['TypeScript', 'Java', 'Playwright', 'CI/CD', 'API REST', 'Docker'] },
  { sector: 'Test & QA', role: 'Test Automation Engineer', skills: ['Cypress', 'JavaScript', 'CI/CD', 'QA Automation', 'Jest', 'Git'] },
  { sector: 'Test & QA', role: 'QA Lead', skills: ['QA Automation', 'Agile', 'CI/CD', 'Leadership', 'Reporting'] },

  // --- Développement ---
  { sector: 'Développement', role: 'Développeur Full-Stack', skills: ['TypeScript', 'React', 'Node.js', 'PostgreSQL', 'API REST', 'Git'] },
  { sector: 'Développement', role: 'Frontend Developer', skills: ['React', 'TypeScript', 'JavaScript', 'CSS', 'HTML', 'Git'] },
  { sector: 'Développement', role: 'Backend Developer', skills: ['Node.js', 'TypeScript', 'PostgreSQL', 'API REST', 'Docker', 'Git'] },
  { sector: 'Développement', role: 'Développeur Python', skills: ['Python', 'API REST', 'SQL', 'Docker', 'Git'] },

  // --- DevOps & Cloud ---
  { sector: 'DevOps & Cloud', role: 'DevOps Engineer', skills: ['Docker', 'Kubernetes', 'CI/CD', 'Terraform', 'AWS', 'GitHub Actions'] },
  { sector: 'DevOps & Cloud', role: 'Cloud Engineer', skills: ['AWS', 'Terraform', 'Docker', 'Kubernetes', 'CI/CD', 'Linux'] },
  { sector: 'DevOps & Cloud', role: 'Site Reliability Engineer (SRE)', skills: ['Kubernetes', 'Monitoring', 'CI/CD', 'AWS', 'Terraform', 'Python'] },

  // --- Data & IA ---
  { sector: 'Data & IA', role: 'Data Engineer', skills: ['Python', 'SQL', 'PostgreSQL', 'Docker', 'CI/CD', 'ETL'] },
  { sector: 'Data & IA', role: 'Data Analyst', skills: ['SQL', 'Python', 'Excel', 'Data Viz', 'Reporting'] },
  { sector: 'Data & IA', role: 'ML Engineer', skills: ['Python', 'Machine Learning', 'SQL', 'Docker', 'CI/CD'] },

  // --- Commercial & Vente ---
  { sector: 'Commercial & Vente', role: 'Commercial B2B', skills: ['Prospection', 'Négociation', 'Vente B2B', 'CRM', 'Relation client', 'Closing'] },
  { sector: 'Commercial & Vente', role: 'Business Developer', skills: ['Prospection', 'Développement commercial', 'Négociation', 'CRM', 'Vente B2B', 'Reporting'] },
  { sector: 'Commercial & Vente', role: 'Account Manager', skills: ['Relation client', 'Négociation', 'CRM', 'Gestion de compte', 'Upsell', 'Reporting'] },
  { sector: 'Commercial & Vente', role: 'Key Account Manager', skills: ['Gestion de compte', 'Négociation', 'Vente B2B', 'CRM', 'Stratégie commerciale', 'Reporting'] },
  { sector: 'Commercial & Vente', role: 'Ingénieur d’affaires', skills: ['Vente B2B', 'Négociation', 'Prospection', 'Gestion de projet', 'CRM'] },
  { sector: 'Commercial & Vente', role: 'Sales Manager', skills: ['Management', 'Vente B2B', 'CRM', 'Stratégie commerciale', 'Reporting', 'Leadership'] },

  // --- Marketing & Digital ---
  { sector: 'Marketing & Digital', role: 'Chef de produit marketing', skills: ['Marketing', 'Stratégie', 'Reporting', 'Étude de marché', 'Gestion de projet'] },
  { sector: 'Marketing & Digital', role: 'Traffic Manager', skills: ['SEA', 'Google Analytics', 'Publicité en ligne', 'Reporting', 'SEO'] },
  { sector: 'Marketing & Digital', role: 'SEO / SEA Manager', skills: ['SEO', 'SEA', 'Google Analytics', 'Content', 'Reporting'] },
  { sector: 'Marketing & Digital', role: 'Growth / Acquisition', skills: ['Growth', 'SEA', 'Emailing', 'Google Analytics', 'A/B testing', 'CRM'] },
  { sector: 'Marketing & Digital', role: 'Social Media Manager', skills: ['Réseaux sociaux', 'Content', 'Community management', 'Copywriting', 'Reporting'] },

  // --- Commerce & Retail ---
  { sector: 'Commerce & Retail', role: 'Vendeur / Vendeuse prêt-à-porter', skills: ['Vente', 'Conseil client', 'Accueil client', 'Encaissement', 'Merchandising', 'Fidélisation client'] },
  { sector: 'Commerce & Retail', role: 'Conseiller de vente', skills: ['Vente', 'Conseil client', 'Relation client', 'Fidélisation client', 'Objectifs de vente', 'Service client'] },
  { sector: 'Commerce & Retail', role: 'Hôte / Hôtesse de caisse', skills: ['Encaissement', 'Accueil client', 'Relation client', 'Service client'] },
  { sector: 'Commerce & Retail', role: 'Visual Merchandiser', skills: ['Merchandising', 'Mise en rayon', 'Prêt-à-porter', 'Vitrine', 'Créativité'] },
  { sector: 'Commerce & Retail', role: 'Responsable de magasin', skills: ['Gestion de magasin', 'Management', 'Objectifs de vente', 'Gestion de stock', 'Merchandising', 'Relation client'] },
  { sector: 'Commerce & Retail', role: 'Adjoint responsable magasin', skills: ['Gestion de magasin', 'Vente', 'Management', 'Gestion de stock', 'Encaissement', 'Objectifs de vente'] },

  // --- Communication ---
  { sector: 'Communication', role: 'Chargé de communication', skills: ['Communication', 'Rédaction', 'Réseaux sociaux', 'Événementiel', 'Relations presse'] },
  { sector: 'Communication', role: 'Community Manager', skills: ['Réseaux sociaux', 'Content', 'Community management', 'Copywriting'] },

  // --- Ressources Humaines ---
  { sector: 'Ressources Humaines', role: 'Chargé de recrutement', skills: ['Recrutement', 'Sourcing', 'Entretien', 'LinkedIn', 'SIRH'] },
  { sector: 'Ressources Humaines', role: 'HR Business Partner', skills: ['Gestion RH', 'Droit du travail', 'Recrutement', 'Relations sociales', 'Reporting'] },
  { sector: 'Ressources Humaines', role: 'Gestionnaire de paie', skills: ['Paie', 'Droit du travail', 'SIRH', 'Excel', 'Administration du personnel'] },

  // --- Finance & Comptabilité ---
  { sector: 'Finance & Comptabilité', role: 'Comptable', skills: ['Comptabilité', 'Excel', 'Fiscalité', 'Sage', 'Reporting'] },
  { sector: 'Finance & Comptabilité', role: 'Contrôleur de gestion', skills: ['Contrôle de gestion', 'Excel', 'Reporting', 'SAP', 'Analyse financière'] },
  { sector: 'Finance & Comptabilité', role: 'Analyste financier', skills: ['Analyse financière', 'Excel', 'Modélisation', 'Reporting', 'Consolidation'] },

  // --- Gestion de projet ---
  { sector: 'Gestion de projet', role: 'Chef de projet', skills: ['Gestion de projet', 'Agile', 'Planification', 'Budget', 'Reporting', 'Jira'] },
  { sector: 'Gestion de projet', role: 'Product Owner', skills: ['Agile', 'Scrum', 'Roadmap', 'Communication', 'Reporting'] },
  { sector: 'Gestion de projet', role: 'Scrum Master', skills: ['Agile', 'Scrum', 'Facilitation', 'Leadership', 'Communication'] },

  // --- Design & Créa ---
  { sector: 'Design & Créa', role: 'UX Designer', skills: ['UX', 'Figma', 'Prototypage', 'Recherche utilisateur', 'Wireframe'] },
  { sector: 'Design & Créa', role: 'UI Designer', skills: ['UI', 'Figma', 'Design system', 'Prototypage', 'Adobe'] },
  { sector: 'Design & Créa', role: 'Graphiste', skills: ['Adobe', 'Photoshop', 'Illustrator', 'Créativité', 'Charte graphique'] },

  // --- Logistique & Supply ---
  { sector: 'Logistique & Supply', role: 'Responsable logistique', skills: ['Logistique', 'Supply Chain', 'Gestion de stock', 'ERP', 'Excel', 'Management'] },
  { sector: 'Logistique & Supply', role: 'Approvisionneur', skills: ['Approvisionnement', 'Gestion de stock', 'ERP', 'Excel', 'Négociation'] },

  // --- Juridique ---
  { sector: 'Juridique', role: 'Juriste', skills: ['Droit', 'Contrats', 'Veille juridique', 'Rédaction', 'Conseil'] },

  // --- Administration & Support ---
  { sector: 'Administration & Support', role: 'Assistant administratif', skills: ['Bureautique', 'Excel', 'Organisation', 'Communication', 'Gestion administrative'] },
  { sector: 'Administration & Support', role: 'Office Manager', skills: ['Organisation', 'Gestion administrative', 'Communication', 'Bureautique', 'Coordination'] },
  { sector: 'Administration & Support', role: 'Conseiller clientèle', skills: ['Relation client', 'Communication', 'CRM', 'Écoute', 'Vente'] },
  { sector: 'Administration & Support', role: 'Customer Success Manager', skills: ['Relation client', 'CRM', 'Onboarding', 'Rétention', 'Reporting'] },
  { sector: 'Administration & Support', role: 'Support Technique', skills: ['SQL', 'Communication', 'Ticketing', 'Réseaux', 'Relation client'] },
];
