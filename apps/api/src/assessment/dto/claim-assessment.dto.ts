import { IsString, IsNotEmpty } from 'class-validator';

export class ClaimAssessmentDto {
  @IsString()
  @IsNotEmpty()
  sessionToken: string;
}
