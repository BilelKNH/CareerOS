import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateExperienceDto {
  @IsString()
  title!: string;

  @IsString()
  company!: string;

  @IsOptional() @IsString()
  location?: string;

  @IsOptional() @IsString()
  contractType?: string;

  @IsDateString()
  startDate!: string;

  @IsOptional() @IsDateString()
  endDate?: string;

  @IsOptional() @IsBoolean()
  isCurrent?: boolean;

  @IsOptional() @IsString()
  description?: string;

  @IsOptional() @IsArray() @IsString({ each: true })
  achievements?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  technologies?: string[];
}
