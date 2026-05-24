import { Controller, Get, UseGuards, Patch, Body, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AdminGuard)
  findAll() {
    return this.usersService.findAll();
  }

  @Patch('me')
  updateProfile(@Body() dto: UpdateProfileDto, @Request() req) {
    return this.usersService.updateProfile(req.user.id, dto);
  }
  
  @Patch('me/password')
  changePassword(@Body() dto: ChangePasswordDto, @Request() req) {
    return this.usersService.changePassword(req.user.id, dto);
  }
}