import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service'
import { EmploymentType } from '@prisma/client'


@Injectable()
export class TaxProfileService {
    constructor(private prisma: PrismaService) {}

    async getOrCreate(workspaceId: string) {
        const existing = await this.prisma.taxProfile.findUnique({
            where: { workspaceId }
        })
        if (existing) {
            return existing;
        }
        return this.prisma.taxProfile.create({
            data: {
                workspaceId,
                employmentType: EmploymentType.SELF_EMPLOYED,
                taxableCategories: [],
            }
        });

    }

    async update(workspaceId: string, dto: { employmentType?: EmploymentType; taxableCategories?: string[] }) {
        return this.prisma.taxProfile.upsert({
            where: { workspaceId },
            update: dto,
            create: {
                workspaceId,
                employmentType: dto.employmentType ?? EmploymentType.SELF_EMPLOYED,
                taxableCategories: dto.taxableCategories ?? [],
            },
        });
    }
}