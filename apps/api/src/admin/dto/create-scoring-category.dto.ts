import { IsString, IsNotEmpty, IsInt, IsBoolean, IsOptional, Min, IsIn, Matches } from 'class-validator';

export class CreateScoringCategoryDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z]+\.[a-z_]+$/, { message: 'key must use dot-notation: domain.slug (e.g. risk.iam)' })
  key: string;

  @IsIn(['risk', 'maturity'])
  domain: string;

  @IsInt()
  @Min(1)
  maxPoints: number;

  @IsString()
  @IsNotEmpty()
  nameEn: string;

  @IsString()
  @IsNotEmpty()
  nameRo: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
