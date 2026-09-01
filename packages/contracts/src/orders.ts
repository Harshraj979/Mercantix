import {
  OrderItemStatus,
  OrderStatus,
  PaymentStatus,
} from './enums';

export interface OrderItemResponse {
  id: string;
  orderId: string;
  vendorId: string;
  vendorName?: string;
  productId: string;
  productName?: string;
  productSlug?: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  status: OrderItemStatus;
  trackingNumber?: string | null;
  trackingCarrier?: string | null;
}

export interface OrderEventResponse {
  id: string;
  orderId: string;
  previousStatus?: string | null;
  newStatus: string;
  actorId?: string | null;
  metadata?: Record<string, any> | null;
  createdAt: Date;
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  provider: string;
  providerReference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderResponse {
  id: string;
  buyerId: string;
  shippingAddressId?: string | null;
  couponId?: string | null;
  couponDiscount: number;
  status: OrderStatus;
  subtotal: number;
  tax: number;
  shippingFee: number;
  platformFee: number;
  total: number;
  currency: string;
  idempotencyKey: string;
  orderItems: OrderItemResponse[];
  payment?: PaymentResponse | null;
  events?: OrderEventResponse[];
  createdAt: Date;
  updatedAt: Date;
}
