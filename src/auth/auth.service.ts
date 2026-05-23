import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcrypt';
import { EmailService } from './email.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService,
        private readonly emailService: EmailService,
        private readonly config: ConfigService
    ) {}

    async register(dto: RegisterDto) {
        const exists = await this.prisma.user.findUnique({
            where: { email: dto.email }
        });

        if (exists) {
            throw new ConflictException('Email already registered');
        }

        const passwordHash = await bcrypt.hash(dto.password, 12);

        const user = await this.prisma.user.create({
            data: {
                email: dto.email,
                passwordHash,
                firstName: dto.firstName,
                lastName: dto.lastName
            }
        })
        return {
            message: 'Registration successful',
            userId: user.id,
        }
    }

    async login(dto: LoginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: dto.email }
        })

        if (!user) {
            throw new UnauthorizedException('Invalid email or password')
        }

        const valid = await bcrypt.compare(dto.password, user.passwordHash)
        if (!valid) {
            throw new UnauthorizedException('Invalid email or password')
        }

        const { accessToken, refreshToken } = await this.generateTokens(user)

        return {
            accessToken: accessToken,
            refreshToken: refreshToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                currency: user.currency,
                role: user.role,
            },
        }
    }

    async forgotPassword(email: string) {
        const user = await this.prisma.user.findUnique({ where: { email } })

        if (!user) return { message: 'If that email exists, a reset link has been sent' };

        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

        await this.prisma.user.update({
            where: { email },
            data: { resetToken, resetTokenExpiry }
        })

        const frontendUrl = this.config.get<string>('FRONTEND_URL');
        const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;


        await this.emailService.sendPasswordReset(email, resetUrl);

        return { message: 'If that email exists, a reset link has been sent' };
    }

    async resetPassword(token: string, newPassword: string) {
        const user = await this.prisma.user.findFirst({
            where: {
                resetToken: token,
                resetTokenExpiry: {
                    gt: new Date(),
                },
            }
        })
        if (!user) throw new BadRequestException('Invalid or expired reset token');

        const passwordHash = await bcrypt.hash(newPassword, 12);

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                passwordHash,
                resetToken: null,
                resetTokenExpiry: null,
            }
        })
        
        return { message: 'Password reset successful' };

    }

    async generateTokens(user: User) {
        const payload = { sub: user.id, email: user.email };
        const accessToken = this.jwtService.sign(payload);
        const refreshToken = crypto.randomBytes(64).toString('hex');
        const refreshTokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const refreshTokenHash = await bcrypt.hash(refreshToken, 10)

        await this.prisma.user.update({
            where: { id: user.id },
            data: {
                refreshToken: refreshTokenHash,
                refreshTokenExpiry,
            },
        })

        return { accessToken, refreshToken };
    }

    async refresh(refreshToken: string) {
        const users = await this.prisma.user.findMany({
            where: {
                refreshToken: { not: null },
                refreshTokenExpiry: { gt: new Date() },
            }
        })

        let matchedUser: typeof users[0] | null = null;
        for (const user of users) {
            const valid = await bcrypt.compare(refreshToken, user.refreshToken!);
            if (valid) {
                matchedUser = user;
                break;
            }
        }
        if (!matchedUser) throw new UnauthorizedException('Invalid or expired refresh token');

        return this.generateTokens(matchedUser);
    }

    async logout(userId: string) {
        await this.prisma.user.update({
            where: { id: userId },
            data: {
            refreshToken: null,
            refreshTokenExpiry: null,
            },
        });

        return { message: 'Logged out successfully' };
    }
}
