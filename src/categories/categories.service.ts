import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service'
import { CreateCategoryDto } from './dto/create-category.dto'
import { UpdateCategoryDto } from './dto/update.dto'

@Injectable()
export class CategoriesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, workspaceId: string, dto: CreateCategoryDto) {
        const exists = await this.prisma.category.findFirst({
            where: {name: dto.name, userId}
        })

        if (exists) throw new ConflictException('Category name already exists');
        
        return this.prisma.category.create({
            data: { ...dto, userId, workspaceId }
        })
    }

    async update(id: string, userId: string, dto: UpdateCategoryDto) {
        await this.findOne(id, userId)

        return this.prisma.category.update({
            where: { id },
            data: { ...dto }
        })
    }

    async findAll(workspaceId: string, type?: string) {
        return this.prisma.category.findMany({
            where: { 
                workspaceId,
                ...(type ? {type: type as any} : {}),
            },
            orderBy: { name: 'asc' },
        })
    }

    async findOne(id: string, userId: string) {
        const category = await this.prisma.category.findUnique({
            where: { id }
        })

        if (!category) throw new NotFoundException('Category not found');

        if (category.userId !== userId) throw new ForbiddenException();

        return category;
    }

    async remove(id: string, userId: string) {
        await this.findOne(id, userId);
        await this.prisma.category.delete({ where: { id } });
        return { message: 'Category deleted' };
    }


}
