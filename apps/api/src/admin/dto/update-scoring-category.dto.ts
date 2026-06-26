import { IsInt, IsBoolean, IsOptional, IsString, Min } from 'class-validator';

export class UpdateScoringCategoryDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  maxPoints?: number;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  nameRo?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
