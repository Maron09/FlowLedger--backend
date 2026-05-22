import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(workspaceId: string, month?: string) {
    const { start, end } = this.getDateRange(month);

    const [expense, income] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { workspaceId, date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { id: true },
      }),
      this.prisma.income.aggregate({
        where: { workspaceId, date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: { id: true },
      }),
    ]);

    const totalExpense = Number(expense._sum.amount ?? 0);
    const totalIncome = Number(income._sum.amount ?? 0);

    return {
      totalIncome,
      totalExpenses: totalExpense,
      balance: totalIncome - totalExpense,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
    };
  }

  async getCategoryBreakdown(workspaceId: string, month?: string) {
    const { start, end } = this.getDateRange(month);

    const breakdown = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { workspaceId, date: { gte: start, lte: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    const categoryIds = breakdown.map((b) => b.categoryId);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]));
    const totalSpent = breakdown.reduce((sum, b) => sum + Number(b._sum.amount ?? 0), 0);

    return breakdown.map((b) => ({
      category: catMap[b.categoryId],
      totalSpent: Number(b._sum.amount ?? 0),
      percentage: totalSpent > 0 ? (Number(b._sum.amount ?? 0) / totalSpent) * 100 : 0,
    }));
  }

  async getMonthlyTrend(workspaceId: string, months: number = 6) {
    const result: { month: string; income: number; expenses: number }[] = [];
    const now = new Date();

    for (let i = months - 1; i >= 0; i--) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const { start, end } = this.getDateRange(monthStr);

      const [expAgg, incAgg] = await Promise.all([
        this.prisma.expense.aggregate({
          where: { workspaceId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
        this.prisma.income.aggregate({
          where: { workspaceId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        }),
      ]);

      result.push({
        month: monthStr,
        income: Number(incAgg._sum.amount ?? 0),
        expenses: Number(expAgg._sum.amount ?? 0),
      });
    }

    return result;
  }

  async getBudgetStatus(workspaceId: string, month?: string) {
    const { start, end } = this.getDateRange(month);

    const budgets = await this.prisma.budget.findMany({
      where: { workspaceId },
      include: { category: true },
    });

    const result = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.prisma.expense.aggregate({
          where: { workspaceId, categoryId: budget.categoryId, date: { gte: start, lte: end } },
          _sum: { amount: true },
        });

        const spentAmount = Number(spent._sum.amount ?? 0);
        const budgetAmount = Number(budget.amount);

        return {
          budget,
          spent: spentAmount,
          remaining: budgetAmount - spentAmount,
          percentage: budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0,
          status: spentAmount > budgetAmount ? 'over' : spentAmount / budgetAmount > 0.8 ? 'warning' : 'ok',
        };
      }),
    );

    return result;
  }

  private getDateRange(month?: string) {
    if (month) {
      const [year, m] = month.split('-').map(Number);
      const start = new Date(year, m - 1, 1);
      const end = new Date(year, m, 0, 23, 59, 59, 999);
      return { start, end };
    }

    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return { start, end };
  }
}
