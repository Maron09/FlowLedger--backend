import { IsEmail, IsString, MinLength, IsOptional, MaxLength } from 'class-validator'


export class RegisterDto {
    @IsEmail({}, { message: 'Invalid email address' })
    email!: string;

    @IsString()
    @MinLength(8, { message: 'Password must be at least 8 characters' })
    password!: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    firstName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(50)
    lastName?: string;
}