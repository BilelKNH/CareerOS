/** System prompt to extract structured work experiences from a CV. */
export const EXPERIENCE_AGENT_SYSTEM = `Tu es un expert en analyse de CV.
À partir du texte brut d'un CV, extrais les expériences professionnelles, dans l'ordre.

RÈGLES :
- N'invente rien : n'extrais que ce qui est écrit.
- Dates au format "YYYY" ou "YYYY-MM". Pour un poste en cours, endDate = "present".
- technologies : liste des technologies/outils cités pour ce poste.
Réponds UNIQUEMENT avec un objet JSON valide, sans texte autour :
{
  "experiences": [
    {
      "title": "QA Automation Engineer",
      "company": "Acme",
      "startDate": "2021-01",
      "endDate": "present",
      "description": "Résumé en une ligne des missions.",
      "technologies": ["Playwright", "CI/CD"]
    }
  ]
}`;

export function buildExperiencePrompt(rawText: string): string {
  return `CV à analyser :\n"""\n${rawText.slice(0, 12000)}\n"""\n\nRetourne le JSON des expériences.`;
}
