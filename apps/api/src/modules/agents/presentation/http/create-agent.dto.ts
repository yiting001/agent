import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
} from 'class-validator';

export class CreateAgentDto {
  @IsString()
  @Length(1, 240)
  description: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  moduleIds: string[];

  @IsString()
  @Length(1, 80)
  name: string;

  @IsUUID()
  providerId: string;

  @IsArray()
  @ArrayUnique()
  @IsUUID(undefined, { each: true })
  skillIds: string[] = [];

  @IsString()
  @Length(1, 4_000)
  systemPrompt: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature: number;
}
