import { IsString, IsNotEmpty, IsArray, IsOptional, IsBoolean, IsInt, IsObject, Min } from 'class-validator';

export class CreateGateRuleDto {
  @IsString()
  @IsNotEmpty()
  gateCode: string;

  @IsString()
  @IsNotEmpty()
  condition: string;

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
