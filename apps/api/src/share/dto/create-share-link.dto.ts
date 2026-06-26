import { IsString, IsNotEmpty } from 'class-validator';

export class CreateShareLinkDto {
  @IsString()
  @IsNotEmpty()
  assessmentId: string;
}
