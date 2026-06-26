import { Controller, Put, Body, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { JwtAuthGuard, CurrentUser } from '../common';

@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @UseGuards(JwtAuthGuard)
  @Put('profile')
  async updateProfile(
    @CurrentUser() user: { id: string },
    @Body() dto: UpdateProfileDto,
  ) {
    const data: any = {};
    if (dto.marketingConsent !== undefined) data.marketingConsent = dto.marketingConsent;
    if (dto.termsAccepted) {
      data.termsAcceptedAt = new Date();
      data.termsVersion = dto.termsVersion || '1.0';
    }

    const profile = await this.usersService.updateProfile(user.id, data);
    return { success: true, profile };
  }
}
