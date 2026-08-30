import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CartsController } from './carts.controller';
import { CartsService } from './carts.service';
import { WishlistsController } from './wishlists.controller';
import { WishlistsService } from './wishlists.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CartsController, WishlistsController],
  providers: [CartsService, WishlistsService],
  exports: [CartsService, WishlistsService],
})
export class CartsModule {}
