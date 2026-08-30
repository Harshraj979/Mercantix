import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [CategoriesController, ProductsController],
  providers: [CategoriesService, ProductsService],
  exports: [CategoriesService, ProductsService],
})
export class ProductsModule {}
