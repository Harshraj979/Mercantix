import { PaymentStatus, PayoutStatus } from './enums';

export interface PaymentDetailsResponse {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: Record<string, any> | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentInitiationResponse {
  paymentId: string;
  orderId: string;
  amount: number;
  currency: string;
  provider: string;
  providerReference: string;
  clientSecret?: string;
  metadata?: Record<string, any>;
}

export interface VendorPayoutResponse {
  id: string;
  orderItemId: string;
  vendorId: string;
  grossAmount: number;
  commission: number;
  netAmount: number;
  status: PayoutStatus;
  paidAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
