import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import {
  AdjustStockDto,
  InventoryResponseDto,
  VariantInventoryResponseDto,
  LowStockItemResponseDto,
} from './dto';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Format Prisma Inventory into InventoryResponseDto
   */
  private formatInventory(inventory: any): InventoryResponseDto {
    return {
      productId: inventory.productId,
      productName: inventory.product?.name,
      productSlug: inventory.product?.slug,
      availableQuantity: inventory.availableQuantity,
      reservedQuantity: inventory.reservedQuantity,
      totalQuantity: inventory.availableQuantity + inventory.reservedQuantity,
      version: inventory.version,
    };
  }

  /**
   * Format Prisma VariantInventory into VariantInventoryResponseDto
   */
  private formatVariantInventory(
    variantInventory: any,
  ): VariantInventoryResponseDto {
    return {
      variantId: variantInventory.variantId,
      sku: variantInventory.variant?.sku,
      availableQuantity: variantInventory.availableQuantity,
      reservedQuantity: variantInventory.reservedQuantity,
      totalQuantity:
        variantInventory.availableQuantity + variantInventory.reservedQuantity,
      version: variantInventory.version,
    };
  }

  /**
   * Get stock details for a product and its variants
   */
  async getProductInventory(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        inventory: {
          include: {
            product: { select: { name: true, slug: true } },
          },
        },
        variants: {
          include: {
            inventory: {
              include: {
                variant: { select: { sku: true } },
              },
            },
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return {
      product: product.inventory
        ? this.formatInventory(product.inventory)
        : null,
      variants: product.variants
        .filter((v: any) => v.inventory)
        .map((v: any) => this.formatVariantInventory(v.inventory)),
    };
  }

  /**
   * Vendor: Adjust product stock level (increment or decrement)
   */
  async adjustProductStock(
    vendorUserId: string,
    productId: string,
    dto: AdjustStockDto,
  ): Promise<InventoryResponseDto> {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: true,
        inventory: true,
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendor.ownerUserId !== vendorUserId) {
      throw new ForbiddenException(
        'You are not authorized to manage inventory for this product',
      );
    }

    if (!product.inventory) {
      throw new NotFoundException('Inventory record not found for product');
    }

    const currentStock = product.inventory.availableQuantity;
    const newStock = currentStock + dto.adjustment;

    if (newStock < 0) {
      throw new BadRequestException(
        `Cannot reduce stock below 0. Current available stock: ${currentStock}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const inv = await tx.inventory.update({
        where: { productId },
        data: {
          availableQuantity: newStock,
          version: { increment: 1 },
        },
        include: {
          product: { select: { name: true, slug: true } },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'INVENTORY',
          aggregateId: productId,
          eventType: 'INVENTORY_ADJUSTED',
          payload: {
            productId,
            previousQuantity: currentStock,
            adjustment: dto.adjustment,
            newQuantity: newStock,
            reason: dto.reason || 'Manual vendor adjustment',
          },
        },
      });

      return inv;
    });

    this.logger.log(
      `Adjusted product ${productId} stock by ${dto.adjustment} -> new total ${newStock}`,
    );

    return this.formatInventory(updated);
  }

  /**
   * Vendor: Adjust variant stock level
   */
  async adjustVariantStock(
    vendorUserId: string,
    variantId: string,
    dto: AdjustStockDto,
  ): Promise<VariantInventoryResponseDto> {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
      include: {
        product: {
          include: { vendor: true },
        },
        inventory: true,
      },
    });

    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    if (variant.product.vendor.ownerUserId !== vendorUserId) {
      throw new ForbiddenException(
        'You are not authorized to manage inventory for this variant',
      );
    }

    if (!variant.inventory) {
      throw new NotFoundException('Inventory record not found for variant');
    }

    const currentStock = variant.inventory.availableQuantity;
    const newStock = currentStock + dto.adjustment;

    if (newStock < 0) {
      throw new BadRequestException(
        `Cannot reduce stock below 0. Current available stock: ${currentStock}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx: any) => {
      const inv = await tx.variantInventory.update({
        where: { variantId },
        data: {
          availableQuantity: newStock,
          version: { increment: 1 },
        },
        include: {
          variant: { select: { sku: true } },
        },
      });

      await tx.outboxEvent.create({
        data: {
          aggregateType: 'VARIANT_INVENTORY',
          aggregateId: variantId,
          eventType: 'VARIANT_INVENTORY_ADJUSTED',
          payload: {
            variantId,
            productId: variant.productId,
            previousQuantity: currentStock,
            adjustment: dto.adjustment,
            newQuantity: newStock,
            reason: dto.reason || 'Manual vendor variant adjustment',
          },
        },
      });

      return inv;
    });

    return this.formatVariantInventory(updated);
  }

  /**
   * Vendor: Get low-stock threshold alerts
   */
  async getLowStockAlerts(
    vendorUserId: string,
    threshold = 5,
  ): Promise<LowStockItemResponseDto[]> {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: vendorUserId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    // 1. Fetch standalone products with low stock
    const lowStockProducts = await this.prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        inventory: {
          availableQuantity: { lte: threshold },
        },
      },
      include: {
        inventory: true,
      },
    });

    // 2. Fetch variants with low stock
    const lowStockVariants = await this.prisma.productVariant.findMany({
      where: {
        product: { vendorId: vendor.id },
        inventory: {
          availableQuantity: { lte: threshold },
        },
      },
      include: {
        product: { select: { name: true } },
        inventory: true,
      },
    });

    const productAlerts: LowStockItemResponseDto[] = lowStockProducts.map(
      (p: any) => ({
        productId: p.id,
        productName: p.name,
        availableQuantity: p.inventory?.availableQuantity ?? 0,
        reservedQuantity: p.inventory?.reservedQuantity ?? 0,
        threshold,
      }),
    );

    const variantAlerts: LowStockItemResponseDto[] = lowStockVariants.map(
      (v: any) => ({
        productId: v.productId,
        productName: v.product.name,
        sku: v.sku,
        availableQuantity: v.inventory?.availableQuantity ?? 0,
        reservedQuantity: v.inventory?.reservedQuantity ?? 0,
        threshold,
      }),
    );

    return [...productAlerts, ...variantAlerts];
  }

  /**
   * Admin: List all inventory levels with filtering
   */
  async adminFindAllInventory(
    page = 1,
    limit = 10,
    lowStockThreshold?: number,
  ) {
    const skip = (page - 1) * limit;
    const where =
      lowStockThreshold !== undefined
        ? { availableQuantity: { lte: lowStockThreshold } }
        : {};

    const [inventories, total] = await Promise.all([
      this.prisma.inventory.findMany({
        where,
        skip,
        take: limit,
        orderBy: { availableQuantity: 'asc' },
        include: {
          product: {
            select: {
              name: true,
              slug: true,
              vendor: { select: { storeName: true } },
            },
          },
        },
      }),
      this.prisma.inventory.count({ where }),
    ]);

    return {
      data: inventories.map((inv: any) => ({
        productId: inv.productId,
        productName: inv.product?.name,
        productSlug: inv.product?.slug,
        storeName: inv.product?.vendor?.storeName,
        availableQuantity: inv.availableQuantity,
        reservedQuantity: inv.reservedQuantity,
        totalQuantity: inv.availableQuantity + inv.reservedQuantity,
        version: inv.version,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
