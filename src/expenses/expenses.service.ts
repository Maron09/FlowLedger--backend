import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expense.dto';

@Injectable()
export class ExpensesService {
    constructor(private readonly prisma: PrismaService) {}

    async create(userId: string, workspaceId: string, dto: CreateExpenseDto) {
        return this.prisma.expense.create({
            data: {
                ...dto,
                userId,
                workspaceId,
                date: new Date(dto.date)
            },
            include: { category: true }
        })
    }

    async findAll(workspaceId: string, query: QueryExpensesDto) {
      const { page = 1, limit = 20, search, categoryId, paymentMethod, startDate, endDate, sortBy = 'date', sortOrder = 'desc' } = query;

      const where: any = { workspaceId };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ];
      }

      if (categoryId) where.categoryId = categoryId;
      if (paymentMethod) where.paymentMethod = paymentMethod;
      if (startDate || endDate) {
        where.date = {};
        if (startDate) where.date.gte = new Date(startDate);
        if (endDate) where.date.lte = new Date(endDate);
      }
      if (query.isRecurring !== undefined) where.isRecurring = query.isRecurring;

      const [total, items] = await Promise.all([
        this.prisma.expense.count({ where }),
        this.prisma.expense.findMany({
          where,
          include: { category: { select: { id: true, name: true, color: true, icon: true } } },
          orderBy: { [sortBy]: sortOrder },
          skip: (page - 1) * limit,
          take: limit,
        }),
      ]);

      return {
        items,
        meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
      };
    }

    async findOne(id: string, userId: string) {
      const expense = await this.prisma.expense.findUnique({
        where: { id },
        include: { category: true },
      });

      if (!expense) throw new NotFoundException('Expense not found');
      if (expense.userId !== userId) throw new ForbiddenException();

      return expense;
    }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    await this.findOne(id, userId);

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId);
    await this.prisma.expense.delete({ where: { id } });
    return { message: 'Expense deleted' };
  }

}
