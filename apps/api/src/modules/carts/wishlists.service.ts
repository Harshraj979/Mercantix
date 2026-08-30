import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ProductStatus } from '@mercantix/contracts';
import { CartsService } from './carts.service';

@Injectable()
export class WishlistsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartsService: CartsService,
  ) {}

  // 1. GET OR CREATE WISHLIST
  async getOrCreateWishlist(userId: string) {
    let wishlist = await this.prisma.wishlist.findUnique({
      where: { userId },
    });

    if (!wishlist) {
      wishlist = await this.prisma.wishlist.create({
        data: { userId },
      });
    }

    return wishlist;
  }

  // 2. GET USER WISHLIST
  async getWishlist(userId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);

    const wishlistWithItems = await this.prisma.wishlist.findUnique({
      where: { id: wishlist.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { position: 'asc' }, take: 1 },
              },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
      },
    });

    const items = (wishlistWithItems?.items || []).map((item) => ({
      id: item.id,
      wishlistId: item.wishlistId,
      productId: item.productId,
      productName: item.product.name,
      productSlug: item.product.slug,
      productPrice: Number(item.product.price),
      productImage: item.product.images?.[0]?.storageKey || null,
      isAvailable: item.product.status === ProductStatus.ACTIVE,
      addedAt: item.addedAt,
    }));

    return {
      id: wishlist.id,
      userId,
      items,
      totalItems: items.length,
    };
  }

  // 3. ADD ITEM TO WISHLIST
  async addItem(userId: string, productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const wishlist = await this.getOrCreateWishlist(userId);

    await this.prisma.wishlistItem.upsert({
      where: {
        wishlistId_productId: {
          wishlistId: wishlist.id,
          productId,
        },
      },
      update: {},
      create: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    return this.getWishlist(userId);
  }

  // 4. REMOVE ITEM FROM WISHLIST
  async removeItem(userId: string, productId: string) {
    const wishlist = await this.getOrCreateWishlist(userId);

    await this.prisma.wishlistItem.deleteMany({
      where: {
        wishlistId: wishlist.id,
        productId,
      },
    });

    return this.getWishlist(userId);
  }

  // 5. MOVE WISHLIST ITEM TO CART
  async moveToCart(userId: string, productId: string) {
    await this.cartsService.addItem(userId, { productId, quantity: 1 });
    await this.removeItem(userId, productId);
    return this.cartsService.getCart(userId);
  }
}
