import {
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class UpdateSkillDto {
  @IsOptional()
  @IsString()
  @Length(0, 20_000)
  content = '';

  @IsString()
  @Length(0, 240)
  description = '';

  @IsBoolean()
  enabled: boolean;

  @IsOptional()
  @IsString()
  @Length(0, 2_000)
  endpoint = '';

  @IsOptional()
  @IsObject()
  headers?: Record<string, string>;

  @IsString()
  @Length(1, 80)
  name: string;
}
