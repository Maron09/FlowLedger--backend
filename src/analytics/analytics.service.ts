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

  async getInsights(workspaceId: string) {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonth = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`

    const { start: thisStart, end: thisEnd } = this.getDateRange(thisMonth)
    const { start: lastStart, end: lastEnd } = this.getDateRange(lastMonth)

    const [thisExpense, lastExpense, thisIncome, lastIncome, budgets, categories] = await Promise.all([
      this.prisma.expense.aggregate({
        where: { workspaceId, date: { gte: thisStart, lte: thisEnd } },
        _sum: { amount: true },
      }),
      this.prisma.expense.aggregate({
        where: { workspaceId, date: { gte: lastStart, lte: lastEnd } },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: { workspaceId, date: { gte: thisStart, lte: thisEnd } },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: { workspaceId, date: { gte: lastStart, lte: lastEnd } },
        _sum: { amount: true },
      }),
      this.prisma.budget.findMany({
        where: { workspaceId },
        include: { category: true },
      }),
      this.prisma.expense.groupBy({
        by: ['categoryId'],
        where: { workspaceId, date: { gte: thisStart, lte: thisEnd } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: 'desc' } },
        take: 1,
      }),
    ])

    const thisExpenseTotal = Number(thisExpense._sum.amount ?? 0)
    const lastExpenseTotal = Number(lastExpense._sum.amount ?? 0)
    const thisIncomeTotal = Number(thisIncome._sum.amount ?? 0)
    const lastIncomeTotal = Number(lastIncome._sum.amount ?? 0)

    const insights: { type: string; message: string; severity: 'info' | 'warning' | 'positive' }[] = []

    // Spending vs last month
    if (lastExpenseTotal > 0) {
      const diff = ((thisExpenseTotal - lastExpenseTotal) / lastExpenseTotal) * 100
      if (diff > 20) {
        insights.push({
          type: 'spending_up',
          message: `You've spent ${diff.toFixed(0)}% more than last month`,
          severity: 'warning',
        })
      } else if (diff < -10) {
        insights.push({
          type: 'spending_down',
          message: `You've spent ${Math.abs(diff).toFixed(0)}% less than last month — great job!`,
          severity: 'positive',
        })
      }
    }

    // Income vs last month
    if (lastIncomeTotal > 0 && thisIncomeTotal > 0) {
      const diff = ((thisIncomeTotal - lastIncomeTotal) / lastIncomeTotal) * 100
      if (diff > 10) {
        insights.push({
          type: 'income_up',
          message: `Your income is up ${diff.toFixed(0)}% compared to last month`,
          severity: 'positive',
        })
      }
    }

    // No income this month
    if (thisIncomeTotal === 0) {
      insights.push({
        type: 'no_income',
        message: 'No income recorded this month yet',
        severity: 'info',
      })
    }

    // Savings rate
    if (thisIncomeTotal > 0) {
      const savingsRate = ((thisIncomeTotal - thisExpenseTotal) / thisIncomeTotal) * 100
      if (savingsRate < 0) {
        insights.push({
          type: 'overspending',
          message: `You're spending more than you earn this month`,
          severity: 'warning',
        })
      } else if (savingsRate > 50) {
        insights.push({
          type: 'great_savings',
          message: `Excellent! You're saving ${savingsRate.toFixed(0)}% of your income`,
          severity: 'positive',
        })
      }
    }

    // Budget warnings
    const budgetWarnings = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.prisma.expense.aggregate({
          where: { workspaceId, categoryId: budget.categoryId, date: { gte: thisStart, lte: thisEnd } },
          _sum: { amount: true },
        })
        const spentAmount = Number(spent._sum.amount ?? 0)
        const budgetAmount = Number(budget.amount)
        const percentage = budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0
        return { budget, percentage, spentAmount }
      })
    )

    const overBudgets = budgetWarnings.filter((b) => b.percentage > 100)
    const warningBudgets = budgetWarnings.filter((b) => b.percentage >= 80 && b.percentage <= 100)

    if (overBudgets.length > 0) {
      insights.push({
        type: 'over_budget',
        message: `You've exceeded ${overBudgets.length} budget${overBudgets.length > 1 ? 's' : ''} this month`,
        severity: 'warning',
      })
    }

    if (warningBudgets.length > 0) {
      insights.push({
        type: 'budget_warning',
        message: `${warningBudgets.length} budget${warningBudgets.length > 1 ? 's are' : ' is'} nearly exhausted`,
        severity: 'warning',
      })
    }

    // Top spending category
    if (categories.length > 0) {
      const topCategoryId = categories[0].categoryId
      const topCategory = await this.prisma.category.findUnique({ where: { id: topCategoryId } })
      if (topCategory) {
        insights.push({
          type: 'top_category',
          message: `Your biggest spend this month is ${topCategory.name}`,
          severity: 'info',
        })
      }
    }

    return insights
  }

  async getTaxEstimate(workspaceId: string, workspace: any) {
    const now = new Date()
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const { start, end } = this.getDateRange(thisMonth)

    // Get tax profile
    const taxProfile = await this.prisma.taxProfile.findUnique({
      where: { workspaceId },
    })

    const employmentType = taxProfile?.employmentType ?? 'SELF_EMPLOYED'
    const taxableCategories = taxProfile?.taxableCategories ?? []

    // Build income query based on employment type and taxable categories
    const incomeWhere: any = { workspaceId, date: { gte: start, lte: end } }

    if (employmentType === 'SALARIED') {
      // Salaried — tax already deducted, only tax side income (taxable categories)
      if (taxableCategories.length > 0) {
        incomeWhere.categoryId = { in: taxableCategories }
      } else {
        // No taxable categories selected — nothing to estimate
        return {
          type: workspace.type,
          monthlyIncome: 0,
          annualIncome: 0,
          annualTax: 0,
          monthlyTax: 0,
          effectiveRate: 0,
          employmentType,
          note: 'No taxable income selected. If you have side income, update your tax profile.',
        }
      }
    } else if (employmentType === 'MIXED') {
      // Mixed — exclude non-taxable categories
      if (taxableCategories.length > 0) {
        incomeWhere.categoryId = { in: taxableCategories }
      }
      // If no categories selected, treat all income as taxable
    }
    // SELF_EMPLOYED — all income is taxable, no filter needed

    const incomeAgg = await this.prisma.income.aggregate({
      where: incomeWhere,
      _sum: { amount: true },
    })

    const monthlyIncome = Number(incomeAgg._sum.amount ?? 0)
    const annualIncome = monthlyIncome * 12

    const result = workspace.type === 'PERSONAL'
      ? this.calculatePersonalTax(monthlyIncome, annualIncome)
      : this.calculateBusinessTax(monthlyIncome, annualIncome)

    return { ...result, employmentType }
  }

  private calculatePersonalTax(monthlyIncome: number, annualIncome: number) {
    // NTA 2025 bands (annual)
    const bands = [
      { limit: 800000, rate: 0 },
      { limit: 2200000, rate: 0.15 },
      { limit: 9000000, rate: 0.18 },
      { limit: 13000000, rate: 0.21 },
      { limit: 25000000, rate: 0.23 },
      { limit: Infinity, rate: 0.25 },
    ]

    let taxableIncome = annualIncome
    let totalTax = 0
    let remaining = taxableIncome
    const breakdown: { band: string; rate: number; tax: number }[] = []

    for (const band of bands) {
      if (remaining <= 0) break
      const taxable = Math.min(remaining, band.limit)
      const tax = taxable * band.rate
      totalTax += tax
      if (tax > 0) {
        breakdown.push({
          band: `₦${(taxableIncome - remaining + 1).toLocaleString()} - ₦${Math.min(taxableIncome, taxableIncome - remaining + band.limit).toLocaleString()}`,
          rate: band.rate * 100,
          tax,
        })
      }
      remaining -= taxable
    }

    const effectiveRate = annualIncome > 0 ? (totalTax / annualIncome) * 100 : 0
    const monthlyTax = totalTax / 12

    return {
      type: 'PERSONAL',
      monthlyIncome,
      annualIncome,
      annualTax: totalTax,
      monthlyTax,
      effectiveRate,
      breakdown,
      note: annualIncome <= 800000
        ? 'Your annual income is within the tax-free threshold of ₦800,000'
        : `Based on NTA 2025 rates. Set aside ₦${Math.ceil(monthlyTax).toLocaleString()} monthly.`,
    }
  }

  private calculateBusinessTax(monthlyIncome: number, annualIncome: number) {
    // CIT: 20% for turnover < ₦100M, 30% for ₦100M+
    const isSmall = annualIncome < 100_000_000
    const citRate = isSmall ? 0.20 : 0.30
    const annualTax = annualIncome * citRate
    const monthlyTax = annualTax / 12

    // VAT estimate: 7.5% on eligible transactions
    const monthlyVat = monthlyIncome * 0.075

    return {
      type: 'BUSINESS',
      monthlyIncome,
      annualIncome,
      citRate: citRate * 100,
      annualTax,
      monthlyTax,
      monthlyVat,
      effectiveRate: citRate * 100,
      companySize: isSmall ? 'Small (under ₦100M turnover)' : 'Large (₦100M+ turnover)',
      note: `CIT at ${citRate * 100}% + VAT at 7.5%. Set aside ₦${Math.ceil(monthlyTax + monthlyVat).toLocaleString()} monthly.`,
    }
  }
}
