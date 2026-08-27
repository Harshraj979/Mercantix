import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from './dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. CREATE ADDRESS
  async create(userId: string, dto: CreateAddressDto) {
    const existingCount = await this.prisma.address.count({
      where: { userId },
    });

    // If first address or marked default, set as default
    const shouldBeDefault = dto.isDefault || existingCount === 0;

    return this.prisma.$transaction(async (tx) => {
      if (shouldBeDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.create({
        data: {
          userId,
          fullName: dto.fullName,
          phone: dto.phone,
          line1: dto.line1,
          line2: dto.line2,
          city: dto.city,
          state: dto.state,
          postalCode: dto.postalCode,
          country: dto.country || 'IN',
          isDefault: shouldBeDefault,
        },
      });
    });
  }

  // 2. GET ALL ADDRESSES FOR USER
  async findAll(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  // 3. GET SINGLE ADDRESS
  async findOne(userId: string, addressId: string) {
    const address = await this.prisma.address.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new NotFoundException('Address not found');
    }

    return address;
  }

  // 4. UPDATE ADDRESS
  async update(userId: string, addressId: string, dto: UpdateAddressDto) {
    await this.findOne(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      if (dto.isDefault) {
        await tx.address.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return tx.address.update({
        where: { id: addressId },
        data: dto,
      });
    });
  }

  // 5. DELETE ADDRESS
  async remove(userId: string, addressId: string) {
    const address = await this.findOne(userId, addressId);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.delete({
        where: { id: addressId },
      });

      // If deleted address was default, make the most recent remaining address default
      if (address.isDefault) {
        const remaining = await tx.address.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

        if (remaining) {
          await tx.address.update({
            where: { id: remaining.id },
            data: { isDefault: true },
          });
        }
      }
    });

    return { message: 'Address deleted successfully' };
  }

  // 6. SET DEFAULT ADDRESS
  async setDefault(userId: string, addressId: string) {
    await this.findOne(userId, addressId);

    return this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });

      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }
}
