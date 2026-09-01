import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  UpdateOrderStatusDto,
  UpdateOrderItemStatusDto,
  OrderResponseDto,
  OrderItemResponseDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { CurrentUser, Roles } from '@common/decorators';
import { JwtPayload, RoleName, OrderStatus } from '@mercantix/contracts';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Checkout shopping cart into an Order',
    description:
      'Atomic checkout operation with stock reservation, coupon application, idempotency verification, and cart clearing.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Order created or returned idempotently',
    type: OrderResponseDto,
  })
  async checkout(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(user.sub, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get current buyer order history' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getMyOrders(
    @CurrentUser() user: JwtPayload,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.ordersService.getBuyerOrders(user.sub, page, limit);
  }

  @Get('admin/all')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: List all orders across platform' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderStatus,
  })
  async adminListOrders(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('status') status?: OrderStatus,
  ) {
    return this.ordersService.adminFindAll(page, limit, status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  async getOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(id, user.sub, user.roles);
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Cancel order',
    description:
      'Cancels order and releases reserved inventory. Allowed when order is PENDING_PAYMENT.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  async cancelOrder(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body('reason') reason?: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(id, user.sub, user.roles, reason);
  }

  @Patch('items/:itemId/status')
  @Roles(RoleName.VENDOR)
  @ApiOperation({
    summary: 'Vendor: Update order item fulfillment status & tracking',
  })
  @ApiResponse({ status: HttpStatus.OK, type: OrderItemResponseDto })
  async vendorUpdateItemStatus(
    @CurrentUser() user: JwtPayload,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateOrderItemStatusDto,
  ) {
    return this.ordersService.vendorUpdateItemStatus(
      user.sub,
      itemId,
      dto,
    );
  }

  @Patch('admin/:id/status')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Override order status' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  async adminUpdateOrderStatus(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.adminUpdateOrderStatus(
      user.sub,
      id,
      dto,
    );
  }
}
