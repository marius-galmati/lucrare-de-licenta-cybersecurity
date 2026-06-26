import { IsEnum, IsString, IsNotEmpty } from 'class-validator';
import { AnswerRefType } from '../../common';

export class SaveAnswerDto {
  @IsEnum(AnswerRefType)
  refType: 'GATE' | 'QUESTION';

  @IsString()
  @IsNotEmpty()
  refCode: string;

  @IsNotEmpty()
  valueJson: any;
}
