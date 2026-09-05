export interface ReviewResponse {
  id: string;
  buyerId: string;
  buyerEmail?: string;
  productId: string;
  orderItemId: string;
  rating: number;
  comment?: string | null;
  createdAt: Date;
}

export interface RatingDistribution {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export interface ProductRatingSummaryResponse {
  productId: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: RatingDistribution;
}
