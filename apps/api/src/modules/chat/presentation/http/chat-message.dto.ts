import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';

import type { ConversationMessage } from '../../domain/chat';

class ChatAttachmentDto {
  @IsString()
  @MaxLength(120)
  fileName: string;

  @IsUUID()
  id: string;

  @IsIn([
    'audio/mpeg',
    'audio/wav',
    'audio/x-wav',
    'image/gif',
    'image/jpeg',
    'image/png',
    'image/webp',
  ])
  mimeType: string;

  @IsInt()
  @IsPositive()
  sizeBytes: number;
}

export class ChatMessageDto implements ConversationMessage {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ValidateNested({ each: true })
  @Type(() => ChatAttachmentDto)
  attachments?: ChatAttachmentDto[];

  @IsString()
  @MaxLength(8_000)
  @ValidateIf((message: ChatMessageDto) => !message.attachments?.length)
  @MinLength(1)
  content: string;

  @IsIn(['assistant', 'user'])
  role: 'assistant' | 'user';
}
