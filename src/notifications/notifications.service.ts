import { Injectable, Logger } from '@nestjs/common'
import { PrismaService } from 'prisma/prisma.service'
import Expo, { ExpoPushMessage } from 'expo-server-sdk'

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name)
  private expo = new Expo()

  constructor(private prisma: PrismaService) {}

  async sendToUser(userId: string, title: string, body: string, data?: Record<string, any>) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { pushToken: true },
    })

    if (!user?.pushToken) return
    if (!Expo.isExpoPushToken(user.pushToken)) {
      this.logger.warn(`Invalid push token for user ${userId}`)
      return
    }

    const message: ExpoPushMessage = {
      to: user.pushToken,
      sound: 'default',
      title,
      body,
      data: data ?? {},
    }

    try {
      const chunks = this.expo.chunkPushNotifications([message])
      for (const chunk of chunks) {
        const receipts = await this.expo.sendPushNotificationsAsync(chunk)
        this.logger.log(`Push sent: ${JSON.stringify(receipts)}`)
      }
    } catch (err) {
      this.logger.error('Failed to send push notification:', err)
    }
  }

  async sendBudgetAlert(userId: string, categoryName: string, percentage: number, status: 'warning' | 'over') {
    const title = status === 'over' ? '🚨 Budget exceeded!' : '⚠️ Budget warning'
    const body = status === 'over'
      ? `You've exceeded your ${categoryName} budget`
      : `You've used ${percentage.toFixed(0)}% of your ${categoryName} budget`

    await this.sendToUser(userId, title, body, { type: 'budget_alert', categoryName, percentage, status })
  }
}