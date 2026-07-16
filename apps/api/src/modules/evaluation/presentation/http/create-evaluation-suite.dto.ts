import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  Length,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

class CreateEvaluationCaseDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, 80, { each: true })
  expectedKeywords: string[];

  @IsString()
  @Length(1, 4_000)
  input: string;
}

class CreateEvaluationMetricDto {
  @IsString()
  @Length(1, 80)
  name: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(1)
  passingThreshold: number;

  @Type(() => Number)
  @IsNumber()
  @Min(0.01)
  @Max(100)
  weight: number;
}

export class CreateEvaluationSuiteDto {
  @IsUUID()
  agentId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEvaluationCaseDto)
  cases: CreateEvaluationCaseDto[];

  @IsString()
  @Length(1, 240)
  description: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateEvaluationMetricDto)
  metrics: CreateEvaluationMetricDto[];

  @IsString()
  @Length(1, 80)
  name: string;
}
