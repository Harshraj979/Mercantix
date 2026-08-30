import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { ProductStatus, VendorStatus } from '@mercantix/contracts';
import {
  CreateProductDto,
  CreateVariantDto,
  ProductImageDto,
  ProductQueryDto,
  ProductSortBy,
  SortOrder,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. CREATE PRODUCT (VENDOR)
  async create(userId: string, dto: CreateProductDto) {
    const vendor = await this.getVendorByUserId(userId);

    if (vendor.status !== VendorStatus.APPROVED) {
      throw new ForbiddenException(
        'Your vendor account must be approved before you can list products',
      );
    }

    const category = await this.prisma.category.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          vendorId: vendor.id,
          categoryId: dto.categoryId,
          name: dto.name.trim(),
          slug,
          description: dto.description?.trim(),
          price: dto.price,
          tags: dto.tags || [],
          status: ProductStatus.DRAFT,
          inventory: {
            create: {
              availableQuantity: dto.stock || 0,
              reservedQuantity: 0,
            },
          },
          images: {
            create: (dto.images || []).map((img, idx) => ({
              storageKey: img.storageKey,
              altText: img.altText,
              position: img.position !== undefined ? img.position : idx,
            })),
          },
        },
        include: {
          images: { orderBy: { position: 'asc' } },
          variants: { include: { inventory: true } },
          inventory: true,
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, storeName: true, slug: true } },
        },
      });

      return this.formatProduct(product);
    });
  }

  // 2. SEARCH & BROWSE PRODUCTS (PUBLIC / FILTERED)
  async findAll(query: ProductQueryDto, isPublic = true) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const whereClause: any = {};

    if (isPublic) {
      whereClause.status = ProductStatus.ACTIVE;
    } else if (query.status) {
      whereClause.status = query.status;
    }

    if (query.categoryId) {
      whereClause.categoryId = query.categoryId;
    }

    if (query.vendorId) {
      whereClause.vendorId = query.vendorId;
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      whereClause.price = {};
      if (query.minPrice !== undefined) whereClause.price.gte = query.minPrice;
      if (query.maxPrice !== undefined) whereClause.price.lte = query.maxPrice;
    }

    if (query.search) {
      const search = query.search.trim();
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const orderBy: any = {};
    const sortField = query.sortBy || ProductSortBy.CREATED_AT;
    const sortDirection = query.sortOrder || SortOrder.DESC;
    orderBy[sortField] = sortDirection;

    const [total, products] = await Promise.all([
      this.prisma.product.count({ where: whereClause }),
      this.prisma.product.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy,
        include: {
          images: { orderBy: { position: 'asc' } },
          variants: { include: { inventory: true } },
          inventory: true,
          category: { select: { id: true, name: true, slug: true } },
          vendor: { select: { id: true, storeName: true, slug: true } },
        },
      }),
    ]);

    return {
      data: products.map((p) => this.formatProduct(p)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 3. GET SINGLE PRODUCT BY SLUG (PUBLIC)
  async findBySlug(slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        slug: slug.toLowerCase().trim(),
        status: ProductStatus.ACTIVE,
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { include: { inventory: true } },
        inventory: true,
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, storeName: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  // 4. GET SINGLE PRODUCT BY ID
  async findById(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { include: { inventory: true } },
        inventory: true,
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, storeName: true, slug: true } },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.formatProduct(product);
  }

  // 5. GET VENDOR'S OWN PRODUCTS
  async vendorFindAll(userId: string, query: ProductQueryDto) {
    const vendor = await this.getVendorByUserId(userId);
    return this.findAll({ ...query, vendorId: vendor.id }, false);
  }

  // 6. UPDATE PRODUCT (VENDOR)
  async update(userId: string, productId: string, dto: UpdateProductDto) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to update this product');
    }

    let slug = product.slug;
    if (dto.name && dto.name.trim() !== product.name) {
      slug = await this.generateUniqueSlug(dto.name, productId);
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        slug,
        categoryId: dto.categoryId,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
        price: dto.price !== undefined ? dto.price : undefined,
        tags: dto.tags,
        status: dto.status,
      },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { include: { inventory: true } },
        inventory: true,
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, storeName: true, slug: true } },
      },
    });

    return this.formatProduct(updated);
  }

  // 7. DELETE PRODUCT (VENDOR)
  async remove(userId: string, productId: string) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (product.vendorId !== vendor.id) {
      throw new ForbiddenException('You do not have permission to delete this product');
    }

    await this.prisma.product.delete({
      where: { id: productId },
    });

    return { message: 'Product deleted successfully' };
  }

  // 8. ADD VARIANT TO PRODUCT
  async addVariant(userId: string, productId: string, dto: CreateVariantDto) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.vendorId !== vendor.id) {
      throw new ForbiddenException('Invalid product or insufficient permissions');
    }

    const existingSku = await this.prisma.productVariant.findUnique({
      where: { sku: dto.sku.toUpperCase().trim() },
    });

    if (existingSku) {
      throw new ConflictException(`SKU ${dto.sku} already exists`);
    }

    return this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku.toUpperCase().trim(),
        attributes: dto.attributes,
        price: dto.price || null,
        inventory: {
          create: {
            availableQuantity: dto.stock || 0,
            reservedQuantity: 0,
          },
        },
      },
      include: {
        inventory: true,
      },
    });
  }

  // 9. UPDATE VARIANT
  async updateVariant(
    userId: string,
    productId: string,
    variantId: string,
    dto: UpdateVariantDto,
  ) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.vendorId !== vendor.id) {
      throw new ForbiddenException('Invalid product or insufficient permissions');
    }

    if (dto.sku) {
      const existingSku = await this.prisma.productVariant.findFirst({
        where: {
          sku: dto.sku.toUpperCase().trim(),
          id: { not: variantId },
        },
      });

      if (existingSku) {
        throw new ConflictException(`SKU ${dto.sku} already exists`);
      }
    }

    return this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: dto.sku ? dto.sku.toUpperCase().trim() : undefined,
        attributes: dto.attributes,
        price: dto.price !== undefined ? dto.price : undefined,
      },
      include: {
        inventory: true,
      },
    });
  }

  // 10. REMOVE VARIANT
  async removeVariant(userId: string, productId: string, variantId: string) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.vendorId !== vendor.id) {
      throw new ForbiddenException('Invalid product or insufficient permissions');
    }

    await this.prisma.productVariant.delete({
      where: { id: variantId },
    });

    return { message: 'Variant removed successfully' };
  }

  // 11. ADD PRODUCT IMAGE
  async addImage(userId: string, productId: string, dto: ProductImageDto) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.vendorId !== vendor.id) {
      throw new ForbiddenException('Invalid product or insufficient permissions');
    }

    return this.prisma.productImage.create({
      data: {
        productId,
        storageKey: dto.storageKey.trim(),
        altText: dto.altText?.trim(),
        position: dto.position || 0,
      },
    });
  }

  // 12. REMOVE PRODUCT IMAGE
  async removeImage(userId: string, productId: string, imageId: string) {
    const vendor = await this.getVendorByUserId(userId);
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product || product.vendorId !== vendor.id) {
      throw new ForbiddenException('Invalid product or insufficient permissions');
    }

    await this.prisma.productImage.delete({
      where: { id: imageId },
    });

    return { message: 'Image removed successfully' };
  }

  // 13. ADMIN: UPDATE PRODUCT STATUS
  async adminUpdateStatus(productId: string, status: ProductStatus) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { status },
      include: {
        images: { orderBy: { position: 'asc' } },
        variants: { include: { inventory: true } },
        inventory: true,
        category: { select: { id: true, name: true, slug: true } },
        vendor: { select: { id: true, storeName: true, slug: true } },
      },
    });

    return this.formatProduct(updated);
  }

  // --- HELPERS ---

  private async getVendorByUserId(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
    });

    if (!vendor) {
      throw new ForbiddenException('Vendor profile not found for this user');
    }

    return vendor;
  }

  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let count = 1;

    while (true) {
      const existing = await this.prisma.product.findFirst({
        where: {
          slug,
          id: excludeId ? { not: excludeId } : undefined,
        },
      });

      if (!existing) return slug;

      slug = `${baseSlug}-${count}`;
      count++;
    }
  }

  private formatProduct(p: any) {
    return {
      id: p.id,
      vendorId: p.vendorId,
      vendorName: p.vendor?.storeName,
      categoryId: p.categoryId,
      categoryName: p.category?.name,
      name: p.name,
      slug: p.slug,
      description: p.description,
      tags: p.tags || [],
      price: Number(p.price),
      status: p.status,
      availableQuantity: p.inventory?.availableQuantity ?? 0,
      reservedQuantity: p.inventory?.reservedQuantity ?? 0,
      images: (p.images || []).map((img: any) => ({
        id: img.id,
        productId: img.productId,
        storageKey: img.storageKey,
        altText: img.altText,
        position: img.position,
      })),
      variants: (p.variants || []).map((v: any) => ({
        id: v.id,
        productId: v.productId,
        sku: v.sku,
        attributes: v.attributes,
        price: v.price ? Number(v.price) : null,
        availableQuantity: v.inventory?.availableQuantity ?? 0,
        reservedQuantity: v.inventory?.reservedQuantity ?? 0,
        createdAt: v.createdAt,
        updatedAt: v.updatedAt,
      })),
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
    };
  }
}
