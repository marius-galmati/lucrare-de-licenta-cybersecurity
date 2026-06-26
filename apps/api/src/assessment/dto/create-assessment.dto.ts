import { IsEnum } from 'class-validator';
import { AssessmentLanguage } from '../../common';

export class CreateAssessmentDto {
  @IsEnum(AssessmentLanguage)
  language: 'en' | 'ro';
}
