import { Injectable } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { EmploymentType } from '@prisma/client';

@Injectable()
export class TaxProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(workspaceId: string) {
    const existing = await this.prisma.taxProfile.findUnique({
      where: { workspaceId },
    });

    if (existing) return existing;

    return this.prisma.taxProfile.create({
      data: {
        workspaceId,
        employmentType: EmploymentType.SELF_EMPLOYED,
        taxableCategories: [],
        deductibleCategories: [],
      },
    });
  }

  async update(workspaceId: string, dto: {
    employmentType?: EmploymentType
    taxableCategories?: string[]
    businessSector?: string
    businessSize?: string
    handlesPaye?: boolean
    vatRegistered?: boolean
    deductibleCategories?: string[]
  }) {
    return this.prisma.taxProfile.upsert({
      where: { workspaceId },
      update: dto,
      create: {
        workspaceId,
        employmentType: dto.employmentType ?? EmploymentType.SELF_EMPLOYED,
        taxableCategories: dto.taxableCategories ?? [],
        deductibleCategories: dto.deductibleCategories ?? [],
        businessSector: dto.businessSector,
        businessSize: dto.businessSize,
        handlesPaye: dto.handlesPaye ?? false,
        vatRegistered: dto.vatRegistered ?? false,
      },
    });
  }
}