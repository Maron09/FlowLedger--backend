import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ExportService {
  constructor(private readonly prisma: PrismaService) {}

  async generateCsv(
    workspaceId: string,
    type: 'all' | 'expenses' | 'income',
    startDate: string,
    endDate: string,
  ): Promise<string> {
    const start = new Date(startDate)
    const end = new Date(endDate)
    end.setHours(23, 59, 59, 999)

    const rows: string[] = []

    if (type === 'all' || type === 'expenses') {
      const expenses = await this.prisma.expense.findMany({
        where: { workspaceId, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: 'desc' },
      })

      if (type === 'all') rows.push('--- EXPENSES ---')
      rows.push('Date,Title,Category,Amount,Payment Method,Notes')

      for (const e of expenses) {
        rows.push([
          new Date(e.date).toLocaleDateString('en-NG'),
          `"${e.title.replace(/"/g, '""')}"`,
          `"${e.category?.name ?? ''}"`,
          Number(e.amount).toFixed(2),
          e.paymentMethod,
          `"${(e.notes ?? '').replace(/"/g, '""')}"`,
        ].join(','))
      }
    }

    if (type === 'all') rows.push('')

    if (type === 'all' || type === 'income') {
      const income = await this.prisma.income.findMany({
        where: { workspaceId, date: { gte: start, lte: end } },
        include: { category: true },
        orderBy: { date: 'desc' },
      })

      if (type === 'all') rows.push('--- INCOME ---')
      rows.push('Date,Title,Category,Source,Amount')

    for (const i of income) {
        rows.push([
            new Date(i.date).toLocaleDateString('en-NG'),
            `"${i.title.replace(/"/g, '""')}"`,
            `"${i.category?.name ?? ''}"`,
            `"${(i.source ?? '').replace(/"/g, '""')}"`,
            Number(i.amount).toFixed(2),
        ].join(','))
    }
    }

    return rows.join('\n')
  }
}