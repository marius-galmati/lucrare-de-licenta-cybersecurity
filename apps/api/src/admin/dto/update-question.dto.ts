import { IsString, IsOptional } from 'class-validator';

export class UpdateQuestionDto {
  @IsOptional()
  @IsString()
  recommendationRo?: string;

  @IsOptional()
  @IsString()
  recommendationEn?: string;

  @IsOptional()
  optionsJson?: any;

  @IsOptional()
  metadataJson?: any;

  // Câmpuri de bază — vor fi respinse dacă sunt prezente
  @IsOptional()
  code?: string;

  @IsOptional()
  domain?: string;

  @IsOptional()
  category?: string;

  @IsOptional()
  answerType?: string;

  @IsOptional()
  weightPoints?: number;

  @IsOptional()
  textRo?: string;

  @IsOptional()
  textEn?: string;
}
