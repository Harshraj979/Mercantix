import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ProductStatus } from '@mercantix/contracts';
import { AddToCartDto, UpdateCartItemDto } from './dto';

@Injectable()
export class CartsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. GET OR CREATE BUYER'S CART
  async getOrCreateCart(buyerId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { buyerId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { buyerId },
      });
    }

    return cart;
  }

  // 2. GET CART WITH DETAILED ITEMS & SUBTOTAL
  async getCart(buyerId: string) {
    const cart = await this.getOrCreateCart(buyerId);

    const cartWithItems = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { position: 'asc' }, take: 1 },
                inventory: true,
                vendor: { select: { id: true, storeName: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    return this.formatCart(cartWithItems);
  }

  // 3. ADD ITEM TO CART
  async addItem(buyerId: string, dto: AddToCartDto) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { inventory: true },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product not found or is currently unavailable');
    }

    const availableStock = product.inventory?.availableQuantity ?? 0;
    const requestedQty = dto.quantity || 1;

    if (availableStock < requestedQty) {
      throw new BadRequestException(
        `Insufficient stock. Only ${availableStock} units available`,
      );
    }

    const cart = await this.getOrCreateCart(buyerId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId: dto.productId,
        },
      },
    });

    if (existingItem) {
      const newTotalQty = existingItem.quantity + requestedQty;
      if (availableStock < newTotalQty) {
        throw new BadRequestException(
          `Cannot add more units. Total requested (${newTotalQty}) exceeds available stock (${availableStock})`,
        );
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newTotalQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: dto.productId,
          quantity: requestedQty,
        },
      });
    }

    return this.getCart(buyerId);
  }

  // 4. UPDATE ITEM QUANTITY
  async updateItemQuantity(
    buyerId: string,
    productId: string,
    dto: UpdateCartItemDto,
  ) {
    if (dto.quantity <= 0) {
      return this.removeItem(buyerId, productId);
    }

    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { inventory: true },
    });

    if (!product || product.status !== ProductStatus.ACTIVE) {
      throw new NotFoundException('Product is not active or available');
    }

    const availableStock = product.inventory?.availableQuantity ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds available stock (${availableStock})`,
      );
    }

    const cart = await this.getOrCreateCart(buyerId);

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        cartId_productId: {
          cartId: cart.id,
          productId,
        },
      },
    });

    if (!existingItem) {
      throw new NotFoundException('Item not found in cart');
    }

    await this.prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: dto.quantity },
    });

    return this.getCart(buyerId);
  }

  // 5. REMOVE ITEM FROM CART
  async removeItem(buyerId: string, productId: string) {
    const cart = await this.getOrCreateCart(buyerId);

    await this.prisma.cartItem.deleteMany({
      where: {
        cartId: cart.id,
        productId,
      },
    });

    return this.getCart(buyerId);
  }

  // 6. CLEAR ALL ITEMS IN CART
  async clearCart(buyerId: string) {
    const cart = await this.getOrCreateCart(buyerId);

    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });

    return this.getCart(buyerId);
  }

  // --- HELPER ---
  private formatCart(cart: any) {
    let subtotal = 0;
    let totalItems = 0;

    const items = (cart?.items || []).map((item: any) => {
      const price = Number(item.product.price);
      const itemSubtotal = price * item.quantity;
      const stock = item.product.inventory?.availableQuantity ?? 0;
      const isAvailable =
        item.product.status === ProductStatus.ACTIVE && stock >= item.quantity;

      subtotal += itemSubtotal;
      totalItems += item.quantity;

      return {
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        productName: item.product.name,
        productSlug: item.product.slug,
        productPrice: price,
        productImage: item.product.images?.[0]?.storageKey || null,
        vendorId: item.product.vendorId,
        vendorName: item.product.vendor?.storeName,
        quantity: item.quantity,
        subtotal: Math.round(itemSubtotal * 100) / 100,
        isAvailable,
        availableStock: stock,
      };
    });

    return {
      id: cart.id,
      buyerId: cart.buyerId,
      items,
      totalItems,
      subtotal: Math.round(subtotal * 100) / 100,
      updatedAt: cart.updatedAt,
    };
  }
}
