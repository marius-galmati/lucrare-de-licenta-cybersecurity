import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import { ShareService } from './share.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { JwtAuthGuard, CurrentUser } from '../common';

@Controller('share-links')
export class ShareController {
  constructor(private shareService: ShareService) {}

  // POST /api/share-links — doar pentru utilizatori autentificați
  @UseGuards(JwtAuthGuard)
  @Post()
  async create(
    @Body() dto: CreateShareLinkDto,
    @CurrentUser() user: { id: string },
  ) {
    return this.shareService.createShareLink(dto.assessmentId, user.id);
  }

  // GET /api/share-links/:token — nu necesită autentificare
  @Get(':token')
  async getByToken(@Param('token') token: string) {
    return this.shareService.getByToken(token);
  }
}
