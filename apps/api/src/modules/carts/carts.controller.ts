import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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
import { CartsService } from './carts.service';
import {
  AddToCartDto,
  CartResponseDto,
  UpdateCartItemDto,
} from './dto';

@ApiTags('Cart')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('cart')
export class CartsController {
  constructor(private readonly cartsService: CartsService) {}

  @Get()
  @ApiOperation({ summary: 'Get current buyer active cart with subtotal calculation' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Current shopping cart',
    type: CartResponseDto,
  })
  async getCart(@CurrentUser('sub') userId: string) {
    return this.cartsService.getCart(userId);
  }

  @Post('items')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Add product to cart or increment quantity' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product added to cart',
    type: CartResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Insufficient stock' })
  async addItem(
    @CurrentUser('sub') userId: string,
    @Body() dto: AddToCartDto,
  ) {
    return this.cartsService.addItem(userId, dto);
  }

  @Patch('items/:productId')
  @ApiOperation({ summary: 'Update item quantity in cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cart item quantity updated',
    type: CartResponseDto,
  })
  async updateItemQuantity(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartsService.updateItemQuantity(userId, productId, dto);
  }

  @Delete('items/:productId')
  @ApiOperation({ summary: 'Remove a product item from cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product removed from cart',
    type: CartResponseDto,
  })
  async removeItem(
    @CurrentUser('sub') userId: string,
    @Param('productId') productId: string,
  ) {
    return this.cartsService.removeItem(userId, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear all items from shopping cart' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Cart cleared',
    type: CartResponseDto,
  })
  async clearCart(@CurrentUser('sub') userId: string) {
    return this.cartsService.clearCart(userId);
  }
}
