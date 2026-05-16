import { IsString, IsOptional, MaxLength, IsEnum, Matches } from 'class-validator';
import { CategoryType } from '@prisma/client';


export class CreateCategoryDto {
    @IsString()
    @MaxLength(50)
    name!: string;

    @IsOptional()
    @IsString()
    @Matches(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
        message: 'Color must be a valid hex code e.g. #f97316',
    })
    color?: string

    @IsOptional()
    @IsString()
    @MaxLength(30)
    icon?: string

    @IsOptional()
    @IsEnum(CategoryType)
    type?: CategoryType;
}