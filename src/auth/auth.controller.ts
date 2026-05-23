import { Body, Controller, Post, Get, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service'
import { RegisterDto } from './dto/register.dto'
import { LoginDto } from './dto/login.dto'
import { JwtAuthGuard } from './guards/jwt-auth.guard'

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Post('register')
    register(@Body() dto: RegisterDto) {
        return this.authService.register(dto);
    }

    @Post('login')
    login(@Body() dto: LoginDto) {
        return this.authService.login(dto)
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    getMe(@Request() req) {
        return req.user
    }

    @Post('forgot-password')
    forgotPassword(@Body() dto: { email: string }) {
        return this.authService.forgotPassword(dto.email);
    }

    @Post('reset-password')
    resetPassword(@Body() dto: { token: string; password: string }) {
        return this.authService.resetPassword(dto.token, dto.password);
    }
}
