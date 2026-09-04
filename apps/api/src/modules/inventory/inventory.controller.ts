import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import {
  AdjustStockDto,
  InventoryResponseDto,
  VariantInventoryResponseDto,
  LowStockItemResponseDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { CurrentUser, Roles, Public } from '@common/decorators';
import { JwtPayload, RoleName } from '@mercantix/contracts';

@ApiTags('Inventory')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('product/:productId')
  @Public()
  @ApiOperation({ summary: 'Get current stock level for a product and its variants' })
  async getProductInventory(@Param('productId') productId: string) {
    return this.inventoryService.getProductInventory(productId);
  }

  @Patch('product/:productId/adjust')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiOperation({
    summary: 'Vendor: Adjust stock quantity for a standalone product',
    description:
      'Increments or decrements available inventory quantity with optimistic concurrency locking.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: InventoryResponseDto })
  async adjustProductStock(
    @CurrentUser() user: JwtPayload,
    @Param('productId') productId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<InventoryResponseDto> {
    return this.inventoryService.adjustProductStock(
      user.sub,
      productId,
      dto,
    );
  }

  @Patch('variant/:variantId/adjust')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiOperation({
    summary: 'Vendor: Adjust stock quantity for a product variant',
  })
  @ApiResponse({ status: HttpStatus.OK, type: VariantInventoryResponseDto })
  async adjustVariantStock(
    @CurrentUser() user: JwtPayload,
    @Param('variantId') variantId: string,
    @Body() dto: AdjustStockDto,
  ): Promise<VariantInventoryResponseDto> {
    return this.inventoryService.adjustVariantStock(
      user.sub,
      variantId,
      dto,
    );
  }

  @Get('alerts/low-stock')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiOperation({ summary: 'Vendor: Fetch low stock threshold alerts' })
  @ApiQuery({ name: 'threshold', required: false, type: Number, example: 5 })
  @ApiResponse({ status: HttpStatus.OK, type: [LowStockItemResponseDto] })
  async getLowStockAlerts(
    @CurrentUser() user: JwtPayload,
    @Query('threshold', new ParseIntPipe({ optional: true })) threshold = 5,
  ): Promise<LowStockItemResponseDto[]> {
    return this.inventoryService.getLowStockAlerts(user.sub, threshold);
  }

  @Get('admin/all')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Monitor global stock levels' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({
    name: 'lowStockThreshold',
    required: false,
    type: Number,
    example: 5,
  })
  async adminFindAllInventory(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('lowStockThreshold', new ParseIntPipe({ optional: true }))
    lowStockThreshold?: number,
  ) {
    return this.inventoryService.adminFindAllInventory(
      page,
      limit,
      lowStockThreshold,
    );
  }
}
