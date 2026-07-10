import { IsString, IsUUID, Length } from 'class-validator';

export class CreateApiApplicationDto {
  @IsUUID()
  agentId: string;

  @IsString()
  @Length(1, 80)
  name: string;
}
