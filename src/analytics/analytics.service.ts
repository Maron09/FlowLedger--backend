import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service'

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverview(workspaceId: string, month?: string) {
    const { start, end } = this.getDateRange(month)

    const [expense, income, allTimeExpense, allTimeIncome] = await Promise.all([
      // This month
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
      // All time
      this.prisma.expense.aggregate({
        where: { workspaceId },
        _sum: { amount: true },
      }),
      this.prisma.income.aggregate({
        where: { workspaceId },
        _sum: { amount: true },
      }),
    ])

    const totalExpense = Number(expense._sum.amount ?? 0)
    const totalIncome = Number(income._sum.amount ?? 0)
    const allTimeBalance = Number(allTimeIncome._sum.amount ?? 0) - Number(allTimeExpense._sum.amount ?? 0)

    return {
      totalIncome,
      totalExpenses: totalExpense,
      balance: allTimeBalance,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpense) / totalIncome) * 100 : 0,
      allTimeIncome: Number(allTimeIncome._sum.amount ?? 0),
      allTimeExpenses: Number(allTimeExpense._sum.amount ?? 0),
    }
  }

  async getCategoryBreakdown(workspaceId: string, month?: string) {
    const { start, end } = this.getDateRange(month)

    const breakdown = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { workspaceId, date: { gte: start, lte: end } },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    })

    const categoryIds = breakdown.map((b) => b.categoryId)
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    })

    const catMap = Object.fromEntries(categories.map((c) => [c.id, c]))
    const totalSpent = breakdown.reduce((sum, b) => sum + Number(b._sum.amount ?? 0), 0)

    return breakdown.map((b) => ({
      category: catMap[b.categoryId],
      totalSpent: Number(b._sum.amount ?? 0),
      percentage: totalSpent > 0 ? (Number(b._sum.amount ?? 0) / totalSpent) * 100 : 0,
    }))
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
    const currentYear = now.getFullYear()
    const { start, end } = this.getDateRange(`${currentYear}-01`)
    const yearEnd = new Date(currentYear, 11, 31, 23, 59, 59, 999)

    // Get tax profile
    const taxProfile = await this.prisma.taxProfile.findUnique({
      where: { workspaceId },
    })

    const employmentType = taxProfile?.employmentType ?? 'SELF_EMPLOYED'
    const taxableCategories = taxProfile?.taxableCategories ?? []
    const deductibleCategories = taxProfile?.deductibleCategories ?? []
    const vatRegistered = taxProfile?.vatRegistered ?? false
    const businessSector = taxProfile?.businessSector ?? 'GENERAL'
    const businessSize = taxProfile?.businessSize ?? 'SMALL'

    if (workspace.type === 'BUSINESS') {
      // YTD revenue
      const revenueWhere: any = { workspaceId, date: { gte: start, lte: yearEnd } }
      if (taxableCategories.length > 0) revenueWhere.categoryId = { in: taxableCategories }

      // YTD expenses
      const expenseWhere: any = { workspaceId, date: { gte: start, lte: yearEnd } }
      if (deductibleCategories.length > 0) expenseWhere.categoryId = { in: deductibleCategories }

      const [revenueAgg, expenseAgg] = await Promise.all([
        this.prisma.income.aggregate({ where: revenueWhere, _sum: { amount: true } }),
        this.prisma.expense.aggregate({ where: expenseWhere, _sum: { amount: true } }),
      ])

      const ytdRevenue = Number(revenueAgg._sum.amount ?? 0)
      const ytdExpenses = Number(expenseAgg._sum.amount ?? 0)
      const taxableProfit = Math.max(0, ytdRevenue - ytdExpenses)

      // Annualize based on months elapsed
      const monthsElapsed = now.getMonth() + 1
      const annualizedRevenue = (ytdRevenue / monthsElapsed) * 12
      const annualizedProfit = (taxableProfit / monthsElapsed) * 12

      return this.calculateBusinessTax(
        ytdRevenue,
        ytdExpenses,
        taxableProfit,
        annualizedRevenue,
        annualizedProfit,
        vatRegistered,
        businessSector,
        businessSize,
        taxProfile?.handlesPaye ?? false,
        monthsElapsed,
      )
    }

    // Personal tax logic (unchanged)
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
    const { start: thisStart, end: thisEnd } = this.getDateRange(thisMonth)
    const incomeWhere: any = { workspaceId, date: { gte: thisStart, lte: thisEnd } }

    if (employmentType === 'SALARIED') {
      if (taxableCategories.length > 0) {
        incomeWhere.categoryId = { in: taxableCategories }
      } else {
        return {
          type: 'PERSONAL',
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
      if (taxableCategories.length > 0) {
        incomeWhere.categoryId = { in: taxableCategories }
      }
    }

    const incomeAgg = await this.prisma.income.aggregate({
      where: incomeWhere,
      _sum: { amount: true },
    })

    const monthlyIncome = Number(incomeAgg._sum.amount ?? 0)
    const annualIncome = monthlyIncome * 12

    const result = this.calculatePersonalTax(monthlyIncome, annualIncome)
    return { ...result, employmentType }
  }

  async getIncomeSources(workspaceId: string, month?: string) {
    const { start, end } = this.getDateRange(month)

    const incomeRecords = await this.prisma.income.findMany({
      where: { workspaceId, date: { gte: start, lte: end } },
      select: { source: true, amount: true, title: true }
    })

    const sourceMap = new Map<string, { total: number, count: number }>()

    for (const record of incomeRecords) {
      const key = record.source?.trim() || 'Other'
      const existiing = sourceMap.get(key) ?? { total: 0, count: 0 }
      sourceMap.set(key, {
        total: existiing.total + Number(record.amount),
        count: existiing.count + 1,
      })
    }

    const totalIncome = Array.from(sourceMap.values()).reduce((sum, s) => sum + s.total, 0)
    
    const sources = Array.from(sourceMap.entries())
      .map(([source, data]) => ({
        source,
        total: data.total,
        count: data.count,
        percentage: totalIncome > 0 ? (data.total / totalIncome) * 100 : 0,
      }))
      .sort((a, b) => b.total - a.total)
    
    return { sources, totalIncome }
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

  private calculateBusinessTax(
    ytdRevenue: number,
    ytdExpenses: number,
    taxableProfit: number,
    annualizedRevenue: number,
    annualizedProfit: number,
    vatRegistered: boolean,
    sector: string,
    size: string,
    handlesPaye: boolean,
    monthsElapsed: number,
  ) {
    // CIT rate based on sector and size
    let citRate = 0.30
    let sectorNote = ''

    if (sector === 'AGRICULTURE') {
      citRate = 0
      sectorNote = 'Agricultural businesses are exempt from CIT for the first 5 years'
    } else if (sector === 'MANUFACTURING') {
      citRate = annualizedRevenue < 100_000_000 ? 0.20 : 0.25
      sectorNote = 'Manufacturing sector reduced rate applies'
    } else {
      // General / Tech / Other
      citRate = annualizedRevenue < 100_000_000 ? 0.20 : 0.30
      sectorNote = annualizedRevenue < 100_000_000
        ? 'Small company rate (under ₦100M annual revenue)'
        : 'Large company rate (₦100M+ annual revenue)'
    }

    const annualTax = annualizedProfit * citRate
    const ytdTax = taxableProfit * citRate
    const monthlyTaxProvision = annualTax / 12

    // VAT
    const monthlyRevenue = ytdRevenue / monthsElapsed
    const monthlyVat = vatRegistered ? monthlyRevenue * 0.075 : 0
    const annualVat = monthlyVat * 12

    const totalMonthlyProvision = monthlyTaxProvision + monthlyVat

    return {
      type: 'BUSINESS',
      ytdRevenue,
      ytdExpenses,
      taxableProfit,
      annualizedRevenue,
      annualizedProfit,
      citRate: citRate * 100,
      annualTax,
      ytdTax,
      monthlyTaxProvision,
      vatRegistered,
      monthlyVat,
      annualVat,
      totalMonthlyProvision,
      handlesPaye,
      sector,
      size,
      effectiveRate: annualizedProfit > 0 ? citRate * 100 : 0,
      note: `CIT on net profit at ${citRate * 100}%${vatRegistered ? ' + VAT at 7.5%' : ''}. Set aside ₦${Math.ceil(totalMonthlyProvision).toLocaleString()} monthly. ${sectorNote}`,
    }
  }
}
