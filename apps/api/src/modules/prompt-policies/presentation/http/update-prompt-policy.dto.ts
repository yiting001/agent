import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsString, Length, Max, Min } from 'class-validator';

export class UpdatePromptPolicyDto {
  @IsString()
  @Length(1, 20_000)
  content: string;

  @IsString()
  @Length(0, 240)
  description: string;

  @IsBoolean()
  enabled: boolean;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  expectedRevision: number;

  @IsString()
  @Length(1, 80)
  name: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(1_000)
  priority: number;
}
