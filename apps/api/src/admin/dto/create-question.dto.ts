import { IsString, IsNotEmpty, IsInt, IsOptional, Min, IsEnum, ValidateIf } from 'class-validator';
import { QuestionDomain, AnswerType } from '../../common';

export class CreateQuestionDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsEnum(QuestionDomain)
  domain: string;

  @ValidateIf((o) => o.domain !== 'gate')
  @IsString()
  @IsNotEmpty()
  category: string;

  @IsEnum(AnswerType)
  answerType: string;

  @IsInt()
  @Min(0)
  weightPoints: number;

  @IsString()
  @IsNotEmpty()
  textRo: string;

  @IsString()
  @IsNotEmpty()
  textEn: string;

  @IsOptional()
  @IsString()
  recommendationRo?: string;

  @IsOptional()
  @IsString()
  recommendationEn?: string;

  @IsOptional()
  optionsJson?: any;

  @IsOptional()
  @IsString()
  scoringInclusionRule?: string;

  @IsOptional()
  metadataJson?: any;
}
