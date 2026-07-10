import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Min } from 'class-validator';

export class CreateUploadSessionDto {
  @IsString()
  @Length(1, 255)
  fileName: string;

  @IsString()
  @Length(1, 160)
  mimeType: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  totalBytes: number;
}
