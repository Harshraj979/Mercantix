import { DiscountType } from './enums';

export interface CouponResponse {
  id: string;
  code: string;
  discountType: DiscountType;
  discountValue: number;
  minOrderValue?: number | null;
  maxUses?: number | null;
  usedCount: number;
  expiresAt?: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CouponValidationResponse {
  isValid: boolean;
  code: string;
  discountType?: DiscountType;
  discountValue?: number;
  discountAmount: number;
  subtotal: number;
  finalTotal: number;
  message: string;
}
