import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'
import { PrismaModule } from '../prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { ExpensesModule } from './expenses/expenses.module';
import { IncomeModule } from './income/income.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { BudgetsModule } from './budgets/budgets.module';
import { ReviewsModule } from './reviews/reviews.module';
import { UsersModule } from './users/users.module';
import { WorkspacesModule } from './workspaces/workspaces.module';
import { ExportModule } from './export/export.module';
import { AiModule } from './ai/ai.module';
import { PortfolioModule } from './portfolio/portfolio.module';


@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CategoriesModule,
    ExpensesModule,
    IncomeModule,
    AnalyticsModule,
    BudgetsModule,
    ReviewsModule,
    UsersModule,
    WorkspacesModule,
    ExportModule,
    AiModule,
    PortfolioModule,
  ],
})
export class AppModule {}
