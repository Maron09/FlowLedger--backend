import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';


@Injectable()
export class BudgetsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, workspaceId: string, dto: CreateBudgetDto) {
    // Make sure the category belongs to the user
    const category = await this.prisma.category.findFirst({
      where: { id: dto.categoryId, workspaceId },
    });

    if (!category) throw new NotFoundException('Category not found');

    return this.prisma.budget.upsert({
      where: {
        workspaceId_categoryId_period: {
          workspaceId,
          categoryId: dto.categoryId,
          period: dto.period ?? 'MONTHLY',
        },
      },
      update: { amount: dto.amount },
      create: {
        amount: dto.amount,
        categoryId: dto.categoryId,
        period: dto.period ?? 'MONTHLY',
        userId,
        workspaceId,
      },
      include: { category: true },
    });
  }

  async findAll(workspaceId: string) {
    return this.prisma.budget.findMany({
      where: { workspaceId },
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({ where: { id } });

    if (!budget) throw new NotFoundException('Budget not found');
    if (budget.userId !== userId) throw new ForbiddenException();

    await this.prisma.budget.delete({ where: { id } });
    return { message: 'Budget deleted' };
  }
}