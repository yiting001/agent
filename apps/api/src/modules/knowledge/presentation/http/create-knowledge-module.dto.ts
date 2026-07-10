import { IsString, Length } from 'class-validator';

export class CreateKnowledgeModuleDto {
  @IsString()
  @Length(1, 240)
  description: string;

  @IsString()
  @Length(1, 80)
  name: string;
}
