import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, comment: string) {
    return this.prisma.review.upsert({
      where: { userId },
      update: { comment },
      create: { comment, userId },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
    });
  }

  async findMine(userId: string) {
    return this.prisma.review.findUnique({
      where: { userId },
    });
  }

  async findAll() {
    return this.prisma.review.findMany({
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');
    await this.prisma.review.delete({ where: { id } });
    return { message: 'Review deleted' };
  }
}