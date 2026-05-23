import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcrypt';
import { EmailService } from './email.service';
import * as crypto from 'crypto';
import { ConfigService } from '@nestjs/config';

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

        const token = this.jwtService.sign({
            sub: user.id,
            email: user.email,
        })

        return {
            accessToken: token,
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
}
