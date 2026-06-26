import { IsString, IsOptional, IsEnum } from 'class-validator';
import { DedupePairStatus } from '../../common';

export class UpdateDedupePairDto {
  @IsOptional()
  @IsEnum(DedupePairStatus)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
