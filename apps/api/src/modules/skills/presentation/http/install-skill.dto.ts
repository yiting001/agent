import { IsIn, IsObject, IsOptional, IsString, Length } from 'class-validator';

import type { SkillType } from '../../domain/skill';

export class InstallSkillDto {
  @IsOptional()
  @IsString()
  @Length(0, 20_000)
  content = '';

  @IsString()
  @Length(0, 240)
  description = '';

  @IsOptional()
  @IsString()
  @Length(0, 2_000)
  endpoint = '';

  @IsOptional()
  @IsObject()
  headers: Record<string, string> = {};

  @IsString()
  @Length(1, 80)
  name: string;

  @IsIn(['mcp', 'prompt'])
  type: SkillType;
}
