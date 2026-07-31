import { Body, Controller, Delete, Get, Patch, Put, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  getMe(@CurrentUser('userId') userId: string) {
    return this.users.getProfile(userId);
  }

  @Patch('me')
  updateMe(@CurrentUser('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.users.updateProfile(userId, dto);
  }

  @Get('me/export')
  exportData(@CurrentUser('userId') userId: string) {
    return this.users.exportData(userId);
  }

  @Delete('me')
  deleteAccount(@CurrentUser('userId') userId: string) {
    return this.users.deleteAccount(userId);
  }

  @Get('me/preferences')
  getPreferences(@CurrentUser('userId') userId: string) {
    return this.users.getPreferences(userId);
  }

  @Put('me/preferences')
  updatePreferences(@CurrentUser('userId') userId: string, @Body() dto: UpdatePreferencesDto) {
    return this.users.upsertPreferences(userId, dto);
  }
}
