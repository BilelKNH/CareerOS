import { IsBoolean, IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export enum ApplicationChannelDto {
  manual = 'manual',
  email = 'email',
  external_url = 'external_url',
}

export class AutoApplySettingsDto {
  @IsOptional() @IsBoolean()
  autoApplyEnabled?: boolean;

  @IsOptional() @IsInt() @Min(50) @Max(100)
  autoApplyThreshold?: number;

  @IsOptional() @IsInt() @Min(1) @Max(20)
  autoApplyDailyLimit?: number;

  @IsOptional() @IsEnum(ApplicationChannelDto)
  autoApplyChannel?: ApplicationChannelDto;
}
