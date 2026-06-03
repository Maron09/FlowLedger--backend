import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { EmailService } from '../auth/email.service';

@Module({
  controllers: [ExpensesController],
  providers: [ExpensesService, EmailService]
})
export class ExpensesModule {}
