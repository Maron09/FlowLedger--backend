import { IsString, IsNumber, IsPositive, IsDateString, IsOptional, IsEnum, MaxLength } from 'class-validator';
import { Transform } from 'class-transformer';


export class CreateBudgetDto {
    @Transform(({ value }) => Number(value))
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    amount!: number

    @IsString()
    categoryId!: string;

    @IsString()
    @IsOptional()
    period?: string; 
}