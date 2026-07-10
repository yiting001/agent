import { IsOptional, IsString, Matches } from 'class-validator';

export class CompleteUploadDto {
  @IsOptional()
  @IsString()
  @Matches(/^[\da-f]{64}$/i)
  sha256?: string;
}
