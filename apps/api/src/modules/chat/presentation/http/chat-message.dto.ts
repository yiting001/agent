import { IsIn, IsString, Length } from 'class-validator';

import type { ConversationMessage } from '../../domain/chat';

export class ChatMessageDto implements ConversationMessage {
  @IsString()
  @Length(1, 8_000)
  content: string;

  @IsIn(['assistant', 'user'])
  role: 'assistant' | 'user';
}
