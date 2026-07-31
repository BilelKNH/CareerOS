import { IsBoolean, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateJournalDto {
  @IsString()
  @MinLength(3)
  rawText!: string;

  /** If true, immediately fuse the extraction into the profile. */
  @IsOptional()
  @IsBoolean()
  apply?: boolean;
}
