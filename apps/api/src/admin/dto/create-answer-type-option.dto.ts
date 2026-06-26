import { IsString, IsNotEmpty, IsNumber, IsBoolean, IsOptional, IsIn, Min, Max } from 'class-validator';

export class CreateAnswerTypeOptionDto {
  @IsIn(['yes_no', 'yes_no_unsure', 'scale', 'multiple_choice'])
  answerType: string;

  @IsString()
  @IsNotEmpty()
  value: string;

  @IsString()
  @IsNotEmpty()
  labelEn: string;

  @IsString()
  @IsNotEmpty()
  labelRo: string;

  @IsNumber()
  @Min(0)
  @Max(1)
  score: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
