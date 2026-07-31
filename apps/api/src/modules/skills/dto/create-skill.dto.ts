import { IsEnum, IsOptional, IsString, IsNumber, Min } from 'class-validator';

export enum SkillCategory {
  language = 'language',
  framework = 'framework',
  tool = 'tool',
  cloud = 'cloud',
  soft = 'soft',
  methodology = 'methodology',
}

export enum SkillLevel {
  notion = 'notion',
  junior = 'junior',
  confirme = 'confirme',
  senior = 'senior',
  expert = 'expert',
}

export class CreateSkillDto {
  @IsString()
  name!: string;

  @IsOptional() @IsEnum(SkillCategory)
  category?: SkillCategory;

  @IsOptional() @IsEnum(SkillLevel)
  level?: SkillLevel;

  @IsOptional() @IsNumber() @Min(0)
  years?: number;
}
