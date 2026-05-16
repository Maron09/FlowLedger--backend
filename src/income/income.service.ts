import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service'
import { CreateIncomeDto } from './dto/create-income.dto'
import { QueryIncomeDto } from './dto/query-income.dto'
import { UpdateIncomeDto } from './dto/update-income.dto'

@Injectable()
export class IncomeService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateIncomeDto) {
    return this.prisma.income.create({
      data: {
        ...dto,
        userId,
        date: new Date(dto.date)
      },
    })
  }

  async findAll(userId: string, query: QueryIncomeDto) {
    const { page = 1, limit = 20, search, startDate, endDate, sortBy = 'date', sortOrder = 'desc' } = query;

    const where: any = { userId }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { source: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [total, items] = await Promise.all([
      this.prisma.income.count({ where }),
      this.prisma.income.findMany({
        where,
        include: { category: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      })
    ])

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) }
    }
  }

  async findOne(id: string, userId: string) {
        const income = await this.prisma.income.findUnique({
          where: { id },
        });
  
        if (!income) throw new NotFoundException('Income not found');
        if (income.userId !== userId) throw new ForbiddenException();
  
        return income;
      }
  
    async update(id: string, userId: string, dto: UpdateIncomeDto) {
      await this.findOne(id, userId);
  
      return this.prisma.income.update({
        where: { id },
        data: {
          ...dto,
          date: dto.date ? new Date(dto.date) : undefined,
        },
      });
    }
  
    async remove(id: string, userId: string) {
      await this.findOne(id, userId);
      await this.prisma.income.delete({ where: { id } });
      return { message: 'Income deleted' };
    }
}
