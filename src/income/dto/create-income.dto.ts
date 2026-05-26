import { IsString, IsNumber, IsPositive, IsDateString, IsOptional, IsBoolean, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer'


export class CreateIncomeDto {
    @IsString()
    @MaxLength(100)
    title!: string;

    @IsOptional()
    @IsString()
    @MaxLength(500)
    source?: string

    @Transform(({ value }) => Number(value))
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount!: number

    @IsDateString()
    date!: string

    @IsString()
    @IsOptional()
    categoryId?: string;

    @IsOptional()
    @IsBoolean()
    isRecurring?: boolean;
}