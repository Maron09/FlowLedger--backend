import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';


@Injectable()
export class EmailService {
    private resend: Resend;

    constructor(private readonly config: ConfigService) {
        this.resend = new Resend(this.config.get<string>('RESEND_API_KEY'));
    }

    async sendPasswordReset(email: string, resetUrl: string) {
        await this.resend.emails.send({
            from: 'FlowLedger <onboarding@resend.dev>',
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
}