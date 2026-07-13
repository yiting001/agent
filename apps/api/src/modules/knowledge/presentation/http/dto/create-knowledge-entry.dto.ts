import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
} from 'class-validator';

import {
  KNOWLEDGE_CONTENT_MAX_LENGTH,
  KNOWLEDGE_TAG_MAX_LENGTH,
  KNOWLEDGE_TAGS_MAX_COUNT,
  KNOWLEDGE_TITLE_MAX_LENGTH,
} from '../../../domain/knowledge-entry';

/** HTTP payload accepted when creating a knowledge entry. */
export class CreateKnowledgeEntryDto {
  @ApiProperty({ example: 'DDD 分层约定' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(KNOWLEDGE_TITLE_MAX_LENGTH)
  title!: string;

  @ApiProperty({ example: '领域层不得依赖 NestJS、TypeORM 或 HTTP。' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(KNOWLEDGE_CONTENT_MAX_LENGTH)
  content!: string;

  @ApiProperty({ example: ['架构', '规范'], required: false, type: [String] })
  @IsArray()
  @ArrayMaxSize(KNOWLEDGE_TAGS_MAX_COUNT)
  @IsString({ each: true })
  @MaxLength(KNOWLEDGE_TAG_MAX_LENGTH, { each: true })
  tags: string[] = [];
}
