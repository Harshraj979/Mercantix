import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import {
  AddToWishlistDto,
  CartResponseDto,
  WishlistResponseDto,
} from './dto';
import { WishlistsService } from './wishlists.service';

@ApiTags('Wishlist')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('wishlist')
export class WishlistsController {
  constructor(private readonly wishlistsService: WishlistsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current user wishlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'User wishlist',
    type: WishlistResponseDto,
  })
  async getWishlist(@CurrentUser('sub') userId: string) {
    return this.wishlistsService.getWishlist(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add product to wishlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product added to wishlist',
    type: WishlistResponseDto,
  })
  async addItem(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddToWishlistDto,
  ) {
    return this.wishlistsService.addItem(userId, dto.productId);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove product from wishlist' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product removed from wishlist',
    type: WishlistResponseDto,
  })
  async removeItem(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistsService.removeItem(userId, productId);
  }

  @Post('items/:productId/move-to-cart')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Move item from wishlist to active shopping cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Item moved to cart',
    type: CartResponseDto,
  })
  async moveToCart(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.wishlistsService.moveToCart(userId, productId);
  }
}
