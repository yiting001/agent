import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from 'class-validator';

import {
  EVALUATION_CASE_CRITERIA_MAX_CHARACTERS,
  EVALUATION_CASE_EXPECTED_OUTPUT_MAX_CHARACTERS,
  EVALUATION_CASE_INPUT_MAX_CHARACTERS,
  EVALUATION_CASE_KEYWORD_MAX_CHARACTERS,
  EVALUATION_CASE_MAX_KEYWORDS,
  EVALUATION_CASE_MAX_TAGS,
  EVALUATION_CASE_TAG_MAX_CHARACTERS,
} from '../../domain/feedback-review';

export class ConvertFeedbackToEvaluationCaseDto {
  @IsOptional()
  @IsString()
  @MaxLength(EVALUATION_CASE_CRITERIA_MAX_CHARACTERS)
  evaluationCriteria?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(EVALUATION_CASE_MAX_KEYWORDS)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, EVALUATION_CASE_KEYWORD_MAX_CHARACTERS, { each: true })
  expectedKeywords: string[];

  @IsOptional()
  @IsString()
  @MaxLength(EVALUATION_CASE_EXPECTED_OUTPUT_MAX_CHARACTERS)
  expectedOutput?: string;

  @IsString()
  @Length(1, EVALUATION_CASE_INPUT_MAX_CHARACTERS)
  input: string;

  @IsUUID()
  suiteId: string;

  @IsArray()
  @ArrayMaxSize(EVALUATION_CASE_MAX_TAGS)
  @ArrayUnique()
  @IsString({ each: true })
  @Length(1, EVALUATION_CASE_TAG_MAX_CHARACTERS, { each: true })
  tags: string[];
}
