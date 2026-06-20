import { Module } from '@nestjs/common';
import { ExpensesController } from './expenses.controller';
import { ExpensesService } from './expenses.service';
import { EmailService } from '../auth/email.service';
import { NotificationsService } from '../notifications/notifications.service'

@Module({
  imports: [NotificationsService],
  controllers: [ExpensesController],
  providers: [ExpensesService, EmailService]
})
export class ExpensesModule {}
