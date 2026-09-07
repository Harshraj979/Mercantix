import {Injectable,NotFoundException,BadRequestException,ForbiddenException,ConflictException,Logger,} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { OrderStatus, RoleName } from '@mercantix/contracts';
import {CreateReviewDto,UpdateReviewDto,ReviewResponseDto,ProductRatingSummaryDto,} from './dto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format Prisma Review into ReviewResponseDto
   */
  private formatReview(review: any): ReviewResponseDto {
    return {
      id: review.id,
      buyerId: review.buyerId,
      buyerEmail: review.buyer?.email
        ? this.maskEmail(review.buyer.email)
        : undefined,
      productId: review.productId,
      orderItemId: review.orderItemId,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt,
    };
  }

  /**
   * Helper to mask email for public reviews (e.g. j***e@example.com)
   */
  private maskEmail(email: string): string {
    const [local, domain] = email.split('@');
    if (!local || !domain) return email;
    if (local.length <= 2) return `${local[0]}*@${domain}`;
    return `${local[0]}${'*'.repeat(local.length - 2)}${local[local.length - 1]}@${domain}`;
  }

  /**
   * Create a verified purchase review
   */
  async createReview(
    buyerId: string,
    dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    const orderItem = await this.prisma.orderItem.findUnique({
      where: { id: dto.orderItemId },
      include: {
        order: true,
        review: true,
      },
    });

    if (!orderItem) {
      throw new NotFoundException('Order item not found');
    }

    if (orderItem.order.buyerId !== buyerId) {
      throw new ForbiddenException(
        'You can only review products from your own purchases',
      );
    }

    if (
      orderItem.order.status !== OrderStatus.PAID &&
      orderItem.order.status !== OrderStatus.DELIVERED
    ) {
      throw new BadRequestException(
        'You can only review items after order payment has been confirmed',
      );
    }

    if (orderItem.review) {
      throw new ConflictException(
        'You have already reviewed this purchased item',
      );
    }

    const review = await this.prisma.review.create({
      data: {
        buyerId,
        productId: orderItem.productId,
        orderItemId: orderItem.id,
        rating: dto.rating,
        comment: dto.comment,
      },
      include: {
        buyer: { select: { email: true } },
      },
    });

    this.logger.log(
      `Buyer ${buyerId} created verified review ${review.id} for product ${orderItem.productId}`,
    );

    return this.formatReview(review);
  }

  /**
   * Get paginated reviews for a product
   */
  async getProductReviews(productId: string, page = 1, limit = 10) {
    const skip = (page - 1) * limit;

    const [reviews, total] = await Promise.all([
      this.prisma.review.findMany({
        where: { productId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          buyer: { select: { email: true } },
        },
      }),
      this.prisma.review.count({ where: { productId } }),
    ]);

    return {
      data: reviews.map((r: any) => this.formatReview(r)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get aggregated rating score & distribution for a product
   */
  async getProductRatingSummary(
    productId: string,
  ): Promise<ProductRatingSummaryDto> {
    const reviews = await this.prisma.review.findMany({
      where: { productId },
      select: { rating: true },
    });

    const totalReviews = reviews.length;
    const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

    if (totalReviews === 0) {
      return {
        productId,
        averageRating: 0,
        totalReviews: 0,
        ratingDistribution,
      };
    }

    let sum = 0;
    for (const r of reviews) {
      sum += r.rating;
      if (r.rating in ratingDistribution) {
        ratingDistribution[r.rating as 1 | 2 | 3 | 4 | 5]++;
      }
    }

    const averageRating = Math.round((sum / totalReviews) * 10) / 10;

    return {
      productId,
      averageRating,
      totalReviews,
      ratingDistribution,
    };
  }

  /**
   * Update review rating or comment
   */
  async updateReview(
    buyerId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    if (review.buyerId !== buyerId) {
      throw new ForbiddenException('You can only edit your own reviews');
    }

    const updated = await this.prisma.review.update({
      where: { id: reviewId },
      data: {
        ...(dto.rating !== undefined ? { rating: dto.rating } : {}),
        ...(dto.comment !== undefined ? { comment: dto.comment } : {}),
      },
      include: {
        buyer: { select: { email: true } },
      },
    });

    return this.formatReview(updated);
  }

  /**
   * Delete review (Owner or Admin)
   */
  async deleteReview(userId: string, reviewId: string, roles: string[]) {
    const review = await this.prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const isAdmin = roles.includes(RoleName.ADMIN);
    if (!isAdmin && review.buyerId !== userId) {
      throw new ForbiddenException('You can only delete your own reviews');
    }

    await this.prisma.review.delete({
      where: { id: reviewId },
    });

    return { message: 'Review successfully deleted' };
  }
}
