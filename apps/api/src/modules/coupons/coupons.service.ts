import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { DiscountType } from '@mercantix/contracts';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponResponseDto,
  CouponValidationResponseDto,
} from './dto';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Helper to format Prisma Coupon into CouponResponseDto
   */
  private formatCoupon(coupon: any): CouponResponseDto {
    return {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType as DiscountType,
      discountValue: Number(coupon.discountValue),
      minOrderValue:
        coupon.minOrderValue !== null ? Number(coupon.minOrderValue) : null,
      maxUses: coupon.maxUses,
      usedCount: coupon.usedCount,
      expiresAt: coupon.expiresAt,
      isActive: coupon.isActive,
      createdAt: coupon.createdAt,
      updatedAt: coupon.updatedAt,
    };
  }

  /**
   * Admin: Create a new promotional coupon
   */
  async createCoupon(dto: CreateCouponDto): Promise<CouponResponseDto> {
    const code = dto.code.toUpperCase().trim();

    const existing = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      throw new ConflictException(`Coupon code "${code}" already exists`);
    }

    const coupon = await this.prisma.coupon.create({
      data: {
        code,
        discountType: dto.discountType,
        discountValue: dto.discountValue,
        minOrderValue: dto.minOrderValue ?? null,
        maxUses: dto.maxUses ?? null,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        isActive: dto.isActive ?? true,
      },
    });

    this.logger.log(`Created coupon code "${code}" (ID: ${coupon.id})`);

    return this.formatCoupon(coupon);
  }

  /**
   * Admin: Update an existing coupon
   */
  async updateCoupon(
    id: string,
    dto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    const existing = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    if (dto.code) {
      const code = dto.code.toUpperCase().trim();
      const codeConflict = await this.prisma.coupon.findFirst({
        where: { code, id: { not: id } },
      });
      if (codeConflict) {
        throw new ConflictException(`Coupon code "${code}" is already in use`);
      }
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: {
        ...(dto.code ? { code: dto.code.toUpperCase().trim() } : {}),
        ...(dto.discountType ? { discountType: dto.discountType } : {}),
        ...(dto.discountValue !== undefined
          ? { discountValue: dto.discountValue }
          : {}),
        ...(dto.minOrderValue !== undefined
          ? { minOrderValue: dto.minOrderValue }
          : {}),
        ...(dto.maxUses !== undefined ? { maxUses: dto.maxUses } : {}),
        ...(dto.expiresAt !== undefined
          ? { expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null }
          : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
      },
    });

    return this.formatCoupon(updated);
  }

  /**
   * Admin: Delete coupon
   */
  async deleteCoupon(id: string) {
    const existing = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.coupon.delete({
      where: { id },
    });

    return { message: 'Coupon successfully deleted' };
  }

  /**
   * Admin: List coupons with pagination and filter
   */
  async findAll(page = 1, limit = 10, isActive?: boolean) {
    const skip = (page - 1) * limit;
    const where = isActive !== undefined ? { isActive } : {};

    const [coupons, total] = await Promise.all([
      this.prisma.coupon.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.coupon.count({ where }),
    ]);

    return {
      data: coupons.map((c: any) => this.formatCoupon(c)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Admin: Get coupon by ID with usage details
   */
  async findById(id: string): Promise<CouponResponseDto> {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
    });

    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    return this.formatCoupon(coupon);
  }

  /**
   * Validate coupon code against subtotal for a buyer before checkout
   */
  async validateCoupon(
    userId: string,
    dto: ValidateCouponDto,
  ): Promise<CouponValidationResponseDto> {
    const code = dto.code.toUpperCase().trim();

    const coupon = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (!coupon || !coupon.isActive) {
      return {
        isValid: false,
        code,
        discountAmount: 0,
        subtotal: dto.subtotal,
        finalTotal: dto.subtotal,
        message: 'Invalid or inactive coupon code',
      };
    }

    if (coupon.expiresAt && coupon.expiresAt < new Date()) {
      return {
        isValid: false,
        code,
        discountAmount: 0,
        subtotal: dto.subtotal,
        finalTotal: dto.subtotal,
        message: 'Coupon code has expired',
      };
    }

    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return {
        isValid: false,
        code,
        discountAmount: 0,
        subtotal: dto.subtotal,
        finalTotal: dto.subtotal,
        message: 'Coupon usage limit has been reached',
      };
    }

    // Check if buyer has already redeemed this coupon
    const existingUsage = await this.prisma.couponUsage.findFirst({
      where: { couponId: coupon.id, userId },
    });

    if (existingUsage) {
      return {
        isValid: false,
        code,
        discountAmount: 0,
        subtotal: dto.subtotal,
        finalTotal: dto.subtotal,
        message: 'You have already redeemed this coupon code',
      };
    }

    if (
      coupon.minOrderValue !== null &&
      dto.subtotal < Number(coupon.minOrderValue)
    ) {
      return {
        isValid: false,
        code,
        discountAmount: 0,
        subtotal: dto.subtotal,
        finalTotal: dto.subtotal,
        message: `Minimum order subtotal of ₹${coupon.minOrderValue} required for this coupon`,
      };
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (coupon.discountType === DiscountType.PERCENTAGE) {
      discountAmount =
        Math.round(
          dto.subtotal * (Number(coupon.discountValue) / 100) * 100,
        ) / 100;
    } else {
      discountAmount = Math.min(
        dto.subtotal,
        Number(coupon.discountValue),
      );
    }

    const finalTotal = Math.max(
      0,
      Math.round((dto.subtotal - discountAmount) * 100) / 100,
    );

    return {
      isValid: true,
      code,
      discountType: coupon.discountType as DiscountType,
      discountValue: Number(coupon.discountValue),
      discountAmount,
      subtotal: dto.subtotal,
      finalTotal,
      message: `Coupon "${code}" applied successfully! You saved ₹${discountAmount.toFixed(2)}.`,
    };
  }
}
