import { IsArray, IsEnum, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export enum RemotePolicy {
  onsite = 'onsite',
  hybrid = 'hybrid',
  remote = 'remote',
}

export class UpdatePreferencesDto {
  @IsOptional() @IsArray() @IsString({ each: true })
  desiredRoles?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  locations?: string[];

  @IsOptional() @IsEnum(RemotePolicy)
  remote?: RemotePolicy;

  @IsOptional() @IsInt() @Min(0) @Max(200)
  searchRadiusKm?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  contractTypes?: string[];

  @IsOptional() @IsInt() @Min(0)
  salaryMin?: number;

  @IsOptional() @IsInt() @Min(0)
  salaryMax?: number;

  @IsOptional() @IsInt() @Min(0)
  tjmMin?: number;

  @IsOptional() @IsInt() @Min(0)
  tjmMax?: number;

  @IsOptional() @IsArray() @IsString({ each: true })
  keywords?: string[];

  @IsOptional() @IsArray() @IsString({ each: true })
  excludedCompanies?: string[];
}
