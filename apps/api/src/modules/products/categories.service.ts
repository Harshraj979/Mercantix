import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateCategoryDto, UpdateCategoryDto } from './dto';

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. CREATE CATEGORY
  async create(dto: CreateCategoryDto) {
    if (dto.parentId) {
      const parent = await this.prisma.category.findUnique({
        where: { id: dto.parentId },
      });
      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }
    }

    const slug = await this.generateUniqueSlug(dto.name);

    return this.prisma.category.create({
      data: {
        name: dto.name.trim(),
        slug,
        parentId: dto.parentId || null,
      },
    });
  }

  // 2. GET NESTED CATEGORY TREE (PUBLIC)
  async getTree() {
    return this.prisma.category.findMany({
      where: { parentId: null },
      include: {
        children: {
          include: {
            children: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  }

  // 3. GET ALL FLAT CATEGORIES
  async findAllFlat() {
    return this.prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // 4. GET SINGLE CATEGORY BY ID OR SLUG
  async findOne(idOrSlug: string) {
    const category = await this.prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug.toLowerCase().trim() }],
      },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  // 5. UPDATE CATEGORY
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.prisma.category.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    let slug = category.slug;
    if (dto.name && dto.name.trim() !== category.name) {
      slug = await this.generateUniqueSlug(dto.name, id);
    }

    if (dto.parentId && dto.parentId === id) {
      throw new BadRequestException('A category cannot be its own parent');
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        name: dto.name ? dto.name.trim() : undefined,
        slug,
        parentId: dto.parentId !== undefined ? dto.parentId : undefined,
      },
    });
  }

  // 6. DELETE CATEGORY
  async remove(id: string) {
    const category = await this.prisma.category.findUnique({
      where: { id },
      include: {
        children: true,
        products: { select: { id: true }, take: 1 },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category.children.length > 0) {
      throw new ConflictException('Cannot delete category with child subcategories');
    }

    if (category.products.length > 0) {
      throw new ConflictException('Cannot delete category with associated products');
    }

    await this.prisma.category.delete({
      where: { id },
    });

    return { message: 'Category deleted successfully' };
  }

  // --- HELPER ---
  private async generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
    const baseSlug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let count = 1;

    while (true) {
      const existing = await this.prisma.category.findFirst({
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
}
