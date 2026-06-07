import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import Anthropic from '@anthropic-ai/sdk';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AiService {
  private anthropic: Anthropic

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.anthropic = new Anthropic({
      apiKey: config.get<string>('ANTHROPIC_API_KEY'),
    })
  }

  async chat(workspaceId: string, message: string, workspace: any) {
    const now = new Date()
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 2, 1)

    // Fetch financial context
    const [expenses, income, budgets] = await Promise.all([
      this.prisma.expense.findMany({
        where: { workspaceId, date: { gte: threeMonthsAgo } },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 100,
      }),
      this.prisma.income.findMany({
        where: { workspaceId, date: { gte: threeMonthsAgo } },
        include: { category: true },
        orderBy: { date: 'desc' },
        take: 50,
      }),
      this.prisma.budget.findMany({
        where: { workspaceId },
        include: { category: true },
      }),
    ])

    // Build context summary
    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const totalIncome = income.reduce((sum, i) => sum + Number(i.amount), 0)

    const expensesByCategory = expenses.reduce((acc: any, e) => {
      const name = e.category?.name ?? 'Uncategorized'
      acc[name] = (acc[name] ?? 0) + Number(e.amount)
      return acc
    }, {})

    const topCategories = Object.entries(expensesByCategory)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 5)
      .map(([name, amount]) => `${name}: ₦${Number(amount).toLocaleString()}`)
      .join(', ')

    const budgetSummary = budgets.map((b) => {
      const spent = expenses
        .filter((e) => e.categoryId === b.categoryId)
        .reduce((sum, e) => sum + Number(e.amount), 0)
      const pct = ((spent / Number(b.amount)) * 100).toFixed(0)
      return `${b.category?.name}: ₦${spent.toLocaleString()} of ₦${Number(b.amount).toLocaleString()} (${pct}%)`
    }).join('\n')

    const incomeSources = income.reduce((acc: any, i) => {
      const src = i.source?.trim().toLowerCase() || 'other'
      acc[src] = (acc[src] ?? 0) + Number(i.amount)
      return acc
    }, {})

    const topSources = Object.entries(incomeSources)
      .sort(([, a]: any, [, b]: any) => b - a)
      .slice(0, 3)
      .map(([src, amt]) => `${src}: ₦${Number(amt).toLocaleString()}`)
      .join(', ')

    const systemPrompt = `You are a personal finance assistant for FlowLedger, a Nigerian fintech app. 
You help users understand their financial data and make better decisions.
Always respond in a friendly, concise, and actionable way.
Use ₦ for Nigerian Naira amounts.
Keep responses under 200 words unless the user asks for detailed analysis.

Here is the user's financial context for the last 3 months:
- Workspace: ${workspace.name} (${workspace.type})
- Total Income: ₦${totalIncome.toLocaleString()}
- Total Expenses: ₦${totalExpenses.toLocaleString()}
- Net Balance: ₦${(totalIncome - totalExpenses).toLocaleString()}
- Top spending categories: ${topCategories || 'No expenses recorded'}
- Income sources: ${topSources || 'No income recorded'}
- Budget status:
${budgetSummary || 'No budgets set'}

Transactions: ${expenses.length} expenses, ${income.length} income records in the last 3 months.`

    const response = await this.anthropic.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 500,
      system: systemPrompt,
      messages: [{ role: 'user', content: message }],
    })

    return {
      message: response.content[0].type === 'text' ? response.content[0].text : '',
    }
  }
}