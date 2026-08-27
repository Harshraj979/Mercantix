import {Injectable,NotFoundException} from '@nestjs/common';
import { PrismaService } from '@common/prisma/prisma.service';
import { RoleName, UserStatus } from '@mercantix/contracts';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // 1. GET ALL USERS (ADMIN PAGINATED)
  async findAll(page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [total, users] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.findMany({
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          roles: {
            select: {
              role: {
                select: { name: true },
              },
            },
          },
          vendor: {
            select: {
              id: true,
              storeName: true,
              status: true,
            },
          },
        },
      }),
    ]);

    return {
      data: users.map((u) => ({
        id: u.id,
        email: u.email,
        isEmailVerified: u.isEmailVerified,
        status: u.status,
        roles: u.roles.map((r) => r.role.name as RoleName),
        vendor: u.vendor,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 2. GET USER BY ID
  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        roles: {
          select: {
            role: { select: { name: true } },
          },
        },
        vendor: {
          select: {
            id: true,
            storeName: true,
            status: true,
          },
        },
        addresses: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      isEmailVerified: user.isEmailVerified,
      status: user.status,
      roles: user.roles.map((r) => r.role.name as RoleName),
      vendor: user.vendor,
      addresses: user.addresses,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // 3. UPDATE USER STATUS (ADMIN)
  async updateStatus(userId: string, status: UserStatus) {
    await this.findById(userId);

    const updatedUser = await this.prisma.$transaction(async (tx) => {
      // If suspending/deactivating, invalidate all active sessions
      if (status === UserStatus.SUSPENDED || status === UserStatus.INACTIVE) {
        await tx.session.updateMany({
          where: { userId, revokedAt: null },
          data: { revokedAt: new Date() },
        });
      }

      return tx.user.update({
        where: { id: userId },
        data: { status: status as any },
        select: {
          id: true,
          email: true,
          isEmailVerified: true,
          status: true,
          updatedAt: true,
        },
      });
    });

    return updatedUser;
  }
}
