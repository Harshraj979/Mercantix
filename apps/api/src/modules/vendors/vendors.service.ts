import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { DocumentStatus, RoleName, VendorStatus } from '@mercantix/contracts';
import {
  CreateVendorDocumentDto,
  CreateVendorDto,
  SetVendorBankAccountDto,
  UpdateVendorDto,
  UpdateVendorStatusDto,
  VerifyDocumentDto,
} from './dto';

@Injectable()
export class VendorsService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. REGISTER / CREATE VENDOR STORE
  async create(userId: string, dto: CreateVendorDto) {
    const existingVendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
    });

    if (existingVendor) {
      throw new ConflictException('You already have a vendor profile');
    }

    const slug = await this.generateUniqueSlug(dto.storeName);

    return this.prisma.$transaction(async (tx) => {
      // Ensure VENDOR role exists
      const role = await tx.role.upsert({
        where: { name: RoleName.VENDOR },
        update: {},
        create: { name: RoleName.VENDOR },
      });

      // Link VENDOR role to user if not already present
      await tx.userRole.upsert({
        where: {
          userId_roleId: {
            userId,
            roleId: role.id,
          },
        },
        update: {},
        create: {
          userId,
          roleId: role.id,
        },
      });

      // Create vendor profile in DRAFT status
      return tx.vendor.create({
        data: {
          ownerUserId: userId,
          storeName: dto.storeName.trim(),
          slug,
          description: dto.description?.trim(),
          status: VendorStatus.DRAFT,
          commissionRate: 10.0,
        },
        include: {
          documents: true,
          bankAccount: true,
        },
      });
    });
  }

  // 2. GET CURRENT VENDOR'S PROFILE
  async getProfile(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
      include: {
        documents: true,
        bankAccount: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    return this.formatVendor(vendor);
  }

  // 3. UPDATE STORE PROFILE
  async updateProfile(userId: string, dto: UpdateVendorDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    let slug = vendor.slug;
    if (dto.storeName && dto.storeName.trim() !== vendor.storeName) {
      slug = await this.generateUniqueSlug(dto.storeName, vendor.id);
    }

    const updated = await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: {
        storeName: dto.storeName ? dto.storeName.trim() : undefined,
        slug,
        description: dto.description !== undefined ? dto.description?.trim() : undefined,
      },
      include: {
        documents: true,
        bankAccount: true,
      },
    });

    return this.formatVendor(updated);
  }

  // 4. SUBMIT VENDOR APPLICATION FOR REVIEW
  async submitForReview(userId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
      include: {
        documents: true,
        bankAccount: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    if (
      vendor.status !== VendorStatus.DRAFT &&
      vendor.status !== VendorStatus.REJECTED
    ) {
      throw new BadRequestException(
        `Cannot submit application in status: ${vendor.status}`,
      );
    }

    // Validation checks for submission
    if (!vendor.bankAccount) {
      throw new BadRequestException(
        'Please add your bank account details before submitting for review',
      );
    }

    if (!vendor.documents || vendor.documents.length === 0) {
      throw new BadRequestException(
        'Please upload at least one business/tax verification document before submitting',
      );
    }

    const updated = await this.prisma.vendor.update({
      where: { id: vendor.id },
      data: { status: VendorStatus.SUBMITTED },
      include: {
        documents: true,
        bankAccount: true,
      },
    });

    return this.formatVendor(updated);
  }

  // 5. ADD KYC DOCUMENT
  async addDocument(userId: string, dto: CreateVendorDocumentDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    return this.prisma.vendorDocument.create({
      data: {
        vendorId: vendor.id,
        documentType: dto.documentType.toUpperCase().trim(),
        storageKey: dto.storageKey.trim(),
        verificationStatus: DocumentStatus.PENDING,
      },
    });
  }

  // 6. REMOVE KYC DOCUMENT
  async removeDocument(userId: string, documentId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const doc = await this.prisma.vendorDocument.findFirst({
      where: { id: documentId, vendorId: vendor.id },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    await this.prisma.vendorDocument.delete({
      where: { id: documentId },
    });

    return { message: 'Document removed successfully' };
  }

  // 7. SET BANK ACCOUNT
  async setBankAccount(userId: string, dto: SetVendorBankAccountDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { ownerUserId: userId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor profile not found');
    }

    const bankAccount = await this.prisma.vendorBankAccount.upsert({
      where: { vendorId: vendor.id },
      update: {
        accountHolder: dto.accountHolder.trim(),
        bankName: dto.bankName.trim(),
        accountNumber: dto.accountNumber.trim(),
        ifscCode: dto.ifscCode.toUpperCase().trim(),
        isVerified: false,
      },
      create: {
        vendorId: vendor.id,
        accountHolder: dto.accountHolder.trim(),
        bankName: dto.bankName.trim(),
        accountNumber: dto.accountNumber.trim(),
        ifscCode: dto.ifscCode.toUpperCase().trim(),
        isVerified: false,
      },
    });

    return {
      ...bankAccount,
      accountNumber: this.maskAccountNumber(bankAccount.accountNumber),
    };
  }

  // 8. PUBLIC: FIND VENDOR BY SLUG
  async findBySlug(slug: string) {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        slug: slug.toLowerCase().trim(),
        status: VendorStatus.APPROVED,
      },
      select: {
        id: true,
        storeName: true,
        slug: true,
        description: true,
        status: true,
        createdAt: true,
      },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor store not found');
    }

    return vendor;
  }

  // 9. PUBLIC: GET APPROVED VENDORS DIRECTORY
  async findAllPublic(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, vendors] = await Promise.all([
      this.prisma.vendor.count({
        where: { status: VendorStatus.APPROVED },
      }),
      this.prisma.vendor.findMany({
        where: { status: VendorStatus.APPROVED },
        skip,
        take: limit,
        orderBy: { storeName: 'asc' },
        select: {
          id: true,
          storeName: true,
          slug: true,
          description: true,
          status: true,
          createdAt: true,
        },
      }),
    ]);

    return {
      data: vendors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 10. ADMIN: FIND ALL VENDORS (FILTER BY STATUS)
  async adminFindAll(page = 1, limit = 20, status?: VendorStatus) {
    const skip = (page - 1) * limit;
    const whereClause = status ? { status } : {};

    const [total, vendors] = await Promise.all([
      this.prisma.vendor.count({ where: whereClause }),
      this.prisma.vendor.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          owner: {
            select: {
              email: true,
              isEmailVerified: true,
            },
          },
          documents: true,
          bankAccount: true,
        },
      }),
    ]);

    return {
      data: vendors.map((v) => this.formatVendor(v)),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 11. ADMIN: UPDATE VENDOR STATUS & COMMISSION
  async adminUpdateStatus(vendorId: string, dto: UpdateVendorStatusDto) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });

    if (!vendor) {
      throw new NotFoundException('Vendor not found');
    }

    const updated = await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        status: dto.status,
        commissionRate:
          dto.commissionRate !== undefined ? dto.commissionRate : undefined,
      },
      include: {
        documents: true,
        bankAccount: true,
      },
    });

    return this.formatVendor(updated);
  }

  // 12. ADMIN: VERIFY KYC DOCUMENT
  async adminVerifyDocument(documentId: string, dto: VerifyDocumentDto) {
    const doc = await this.prisma.vendorDocument.findUnique({
      where: { id: documentId },
    });

    if (!doc) {
      throw new NotFoundException('Document not found');
    }

    return this.prisma.vendorDocument.update({
      where: { id: documentId },
      data: { verificationStatus: dto.verificationStatus },
    });
  }

  // --- HELPERS ---

  private async generateUniqueSlug(storeName: string, excludeId?: string): Promise<string> {
    const baseSlug = storeName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    let slug = baseSlug;
    let count = 1;

    while (true) {
      const existing = await this.prisma.vendor.findFirst({
        where: {
          slug,
          id: excludeId ? { not: excludeId } : undefined,
        },
      });

      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${count}`;
      count++;
    }
  }

  private maskAccountNumber(acc: string): string {
    if (!acc || acc.length < 4) return '****';
    return '*'.repeat(acc.length - 4) + acc.slice(-4);
  }

  private formatVendor(vendor: any) {
    return {
      id: vendor.id,
      ownerUserId: vendor.ownerUserId,
      ownerEmail: vendor.owner?.email,
      storeName: vendor.storeName,
      slug: vendor.slug,
      description: vendor.description,
      status: vendor.status,
      commissionRate: Number(vendor.commissionRate),
      documents: vendor.documents || [],
      bankAccount: vendor.bankAccount
        ? {
            ...vendor.bankAccount,
            accountNumber: this.maskAccountNumber(vendor.bankAccount.accountNumber),
          }
        : null,
      createdAt: vendor.createdAt,
      updatedAt: vendor.updatedAt,
    };
  }
}
