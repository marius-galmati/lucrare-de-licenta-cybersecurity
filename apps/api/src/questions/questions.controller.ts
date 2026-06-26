import { Controller, Get } from '@nestjs/common';
import { QuestionsService } from './questions.service';

@Controller('questions')
export class QuestionsController {
  constructor(private questionsService: QuestionsService) {}

  // GET /api/questions — nu necesită autentificare
  @Get()
  async getAll() {
    return this.questionsService.getLatestActive();
  }

  // GET /api/questions/answer-type-options — nu necesită autentificare
  @Get('answer-type-options')
  async getAnswerTypeOptions() {
    return this.questionsService.getAnswerTypeOptions();
  }
}
