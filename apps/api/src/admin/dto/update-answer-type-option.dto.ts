import { IsString, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdateAnswerTypeOptionDto {
  @IsOptional()
  @IsString()
  labelEn?: string;

  @IsOptional()
  @IsString()
  labelRo?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  score?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
