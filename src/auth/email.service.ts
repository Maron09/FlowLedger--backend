import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter

  constructor(private readonly config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: config.get<string>('GMAIL_USER'),
        pass: config.get<string>('GMAIL_APP_PASSWORD'),
      },
    })
  }

  async sendPasswordReset(email: string, resetUrl: string) {
    await this.transporter.sendMail({
      from: `"FlowLedger" <${this.config.get('GMAIL_USER')}>`,
      to: email,
      subject: 'Reset your FlowLedger password',
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #10b981; margin-bottom: 8px;">FlowLedger</h2>
          <h3 style="color: #111; margin-bottom: 16px;">Reset your password</h3>
          <p style="color: #555; margin-bottom: 24px;">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="${resetUrl}" style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            Reset Password
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">
            If you didn't request this, you can safely ignore this email.
          </p>
        </div>
      `,
    })
  }

  async sendBudgetWarning(
    email: string,
    data: {
      categoryName: string
      spent: number
      budget: number
      percentage: number
      status: 'warning' | 'exceeded'
      workspaceName: string
    }
  ) {
    const isExceeded = data.status === 'exceeded'
    const formatNaira = (amount: number) =>
      new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 }).format(amount)

    await this.transporter.sendMail({
      from: `"FlowLedger" <${this.config.get('GMAIL_USER')}>`,
      to: email,
      subject: isExceeded
        ? `Budget exceeded — ${data.categoryName}`
        : `Budget warning — ${data.categoryName} at ${data.percentage.toFixed(0)}%`,
      html: `
        <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #10b981; margin-bottom: 8px;">FlowLedger</h2>
          <h3 style="color: #111; margin-bottom: 16px;">
            ${isExceeded ? '🚨 Budget Exceeded' : '⚠️ Budget Warning'}
          </h3>
          <p style="color: #555; margin-bottom: 8px;">
            Your <strong>${data.categoryName}</strong> budget in <strong>${data.workspaceName}</strong>
            has ${isExceeded ? 'been exceeded' : `reached ${data.percentage.toFixed(0)}%`}.
          </p>
          <div style="background: #f9f9f9; border-radius: 8px; padding: 16px; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #333;"><strong>Spent:</strong> ${formatNaira(data.spent)}</p>
            <p style="margin: 0 0 8px; color: #333;"><strong>Budget:</strong> ${formatNaira(data.budget)}</p>
            <p style="margin: 0; color: ${isExceeded ? '#ef4444' : '#f59e0b'};">
              <strong>${isExceeded ? `Over by ${formatNaira(data.spent - data.budget)}` : `${formatNaira(data.budget - data.spent)} remaining`}</strong>
            </p>
          </div>
          <a href="https://flow-ledger-frontend-1th9.vercel.app"
             style="background: #10b981; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
            View Dashboard
          </a>
          <p style="color: #999; font-size: 13px; margin-top: 24px;">
            You can manage your budgets in FlowLedger.
          </p>
        </div>
      `,
    })
  }
}