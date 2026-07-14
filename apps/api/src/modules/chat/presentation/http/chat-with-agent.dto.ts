import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsBoolean,
  IsArray,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

import { ChatMessageDto } from './chat-message.dto';

export class ChatWithAgentDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatMessageDto)
  messages: ChatMessageDto[];

  @IsOptional()
  @IsBoolean()
  stream?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  conversationId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  @ApiPropertyOptional({
    description: '由 POST /api/memory-owner-tokens 签发的匿名 bearer token',
    example: 'v1.<subject>.<signature>',
  })
  memoryOwnerToken?: string;
}
