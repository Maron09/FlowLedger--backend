import { Injectable, ConflictException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto'
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly jwtService: JwtService
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
}
