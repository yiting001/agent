import { IsString, IsUUID, Length } from 'class-validator';

export class CreateKnowledgeBaseDto {
  @IsString()
  @Length(1, 240)
  description: string;

  @IsUUID()
  embeddingProviderId: string;

  @IsString()
  @Length(1, 80)
  name: string;
}
