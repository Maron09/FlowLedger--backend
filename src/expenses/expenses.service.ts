import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import { QueryExpensesDto } from './dto/query-expense.dto';
import { EmailService } from '../auth/email.service';

@Injectable()
export class ExpensesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  async create(userId: string, workspaceId: string, dto: CreateExpenseDto) {
    const expense = await this.prisma.expense.create({
      data: {
        ...dto,
        userId,
        workspaceId,
        date: new Date(dto.date),
      },
      include: { category: true },
    })

    // Check budget after creating expense — fire and forget
    this.checkBudgetAndNotify(userId, workspaceId, dto.categoryId).catch(() => {})

    return expense
  }

  private async checkBudgetAndNotify(userId: string, workspaceId: string, categoryId: string) {
    // Find budget for this category
    const budget = await this.prisma.budget.findFirst({
      where: { workspaceId, categoryId },
      include: { category: true },
    })

    if (!budget) return

    // Calculate this month's spending for this category
    const now = new Date()
    const start = new Date(now.getFullYear(), now.getMonth(), 1)
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    const spent = await this.prisma.expense.aggregate({
      where: { workspaceId, categoryId, date: { gte: start, lte: end } },
      _sum: { amount: true },
    })

    const spentAmount = Number(spent._sum.amount ?? 0)
    const budgetAmount = Number(budget.amount)
    const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0

    // Only notify at 80% or exceeded — avoid spamming
    if (percentage < 80) return

    const status = percentage >= 100 ? 'exceeded' : 'warning'

    // Get user email
    const user = await this.prisma.user.findUnique({ where: { id: userId } })
    if (!user) return

    // Get workspace name
    const workspace = await this.prisma.workspace.findUnique({ where: { id: workspaceId } })
    if (!workspace) return

    await this.emailService.sendBudgetWarning(user.email, {
      categoryName: budget.category.name,
      spent: spentAmount,
      budget: budgetAmount,
      percentage,
      status,
      workspaceName: workspace.name,
    })
  }

  async findAll(workspaceId: string, query: QueryExpensesDto) {
    const { page = 1, limit = 20, search, categoryId, paymentMethod, startDate, endDate, sortBy = 'date', sortOrder = 'desc' } = query

    const where: any = { workspaceId }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (categoryId) where.categoryId = categoryId
    if (paymentMethod) where.paymentMethod = paymentMethod
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate)
      if (endDate) where.date.lte = new Date(endDate)
    }
    if (query.isRecurring !== undefined) where.isRecurring = query.isRecurring

    const [total, items] = await Promise.all([
      this.prisma.expense.count({ where }),
      this.prisma.expense.findMany({
        where,
        include: { category: { select: { id: true, name: true, color: true, icon: true } } },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    return {
      items,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    }
  }

  async findOne(id: string, userId: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: { category: true },
    })

    if (!expense) throw new NotFoundException('Expense not found')
    if (expense.userId !== userId) throw new ForbiddenException()

    return expense
  }

  async update(id: string, userId: string, dto: UpdateExpenseDto) {
    await this.findOne(id, userId)

    return this.prisma.expense.update({
      where: { id },
      data: {
        ...dto,
        date: dto.date ? new Date(dto.date) : undefined,
      },
      include: { category: true },
    })
  }

  async remove(id: string, userId: string) {
    await this.findOne(id, userId)
    await this.prisma.expense.delete({ where: { id } })
    return { message: 'Expense deleted' }
  }
}