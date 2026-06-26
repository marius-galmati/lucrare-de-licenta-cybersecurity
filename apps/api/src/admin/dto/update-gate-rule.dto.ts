import { IsArray, IsBoolean, IsInt, IsObject, IsOptional, IsString, Min } from 'class-validator';

export class UpdateGateRuleDto {
  @IsOptional()
  @IsString()
  condition?: string;

  @IsOptional()
  @IsArray()
  activateQuestions?: string[];

  @IsOptional()
  @IsArray()
  skipQuestions?: string[];

  @IsOptional()
  @IsArray()
  setNa?: string[];

  @IsOptional()
  @IsObject()
  categoryMultipliers?: Record<string, number>;

  @IsOptional()
  @IsObject()
  effects?: Record<string, any>;

  @IsOptional()
  @IsObject()
  flags?: Record<string, any>;

  @IsOptional()
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
