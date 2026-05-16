import { IsString, IsNumber, IsPositive, IsDateString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { Transform } from 'class-transformer'



export class CreateExpenseDto {
    @IsString()
    @MaxLength(100)
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    description?: string


    @Transform(({ value }) => Number(value))
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount!: number

    @IsDateString()
    date!: string

    @IsString()
    categoryId!: string;

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    notes?: string;
}