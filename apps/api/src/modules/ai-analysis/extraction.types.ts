export type SkillCategoryValue =
  | 'language'
  | 'framework'
  | 'tool'
  | 'cloud'
  | 'soft'
  | 'methodology';

export interface ExtractedSkill {
  name: string;
  category: SkillCategoryValue;
  inferred: boolean;
}

export interface ExtractionResult {
  skills: ExtractedSkill[];
  technologies: string[];
  responsibilities: string[];
  results: string[];
  summary: string;
  method: 'llm' | 'heuristic';
}
