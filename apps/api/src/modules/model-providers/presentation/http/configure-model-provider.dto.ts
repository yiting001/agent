import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  Max,
  Min,
} from 'class-validator';

export class ConfigureModelProviderDto {
  @IsString()
  @Length(1, 200)
  apiKey: string;

  @IsUrl({ require_tld: false })
  baseUrl: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  chatInputCostPerMillionTokens?: number;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  chatModel?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  chatOutputCostPerMillionTokens?: number;

  @IsString()
  @Length(1, 240)
  description: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(65_536)
  embeddingDimensions?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  embeddingInputCostPerMillionTokens?: number;

  @IsOptional()
  @IsString()
  @Length(1, 120)
  embeddingModel?: string;

  @IsString()
  @Length(1, 80)
  name: string;
}
