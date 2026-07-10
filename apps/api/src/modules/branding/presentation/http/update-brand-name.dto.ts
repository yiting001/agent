import { IsString, Length } from 'class-validator';

export class UpdateBrandNameDto {
  @IsString()
  @Length(2, 40)
  softwareName: string;
}
