import { Module } from '@nestjs/common';
import { PrismaModule } from '@common/prisma/prisma.module';
import { AuthModule } from '@modules/auth/auth.module';
import { AddressesController } from './addresses.controller';
import { AddressesService } from './addresses.service';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [UsersController, AddressesController],
  providers: [UsersService, AddressesService],
  exports: [UsersService, AddressesService],
})
export class UsersModule {}
