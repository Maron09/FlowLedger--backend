import { Controller, Get, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../auth/guards/admin.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { ReviewsService } from './reviews.service';
import { IsString, MinLength, MaxLength } from 'class-validator';

class CreateReviewDto {
  @IsString()
  @MinLength(5, { message: 'Comment must be at least 5 characters' })
  @MaxLength(1000)
  comment!: string;
}

@Controller('reviews')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // User submits or updates their review
  @Post()
  upsert(@GetUser('id') userId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.upsert(userId, dto.comment);
  }

  // User gets their own review
  @Get('mine')
  findMine(@GetUser('id') userId: string) {
    return this.reviewsService.findMine(userId);
  }

  // Admin only — get all reviews
  @Get()
  @UseGuards(AdminGuard)
  findAll() {
    return this.reviewsService.findAll();
  }

  // Admin only — delete a review
  @Delete(':id')
  @UseGuards(AdminGuard)
  remove(@Param('id') id: string) {
    return this.reviewsService.remove(id);
  }
}