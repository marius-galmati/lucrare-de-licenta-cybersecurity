import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateDedupePairDto {
  @IsString()
  @IsNotEmpty()
  gateCode: string;

  @IsString()
  @IsNotEmpty()
  questionCode: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
