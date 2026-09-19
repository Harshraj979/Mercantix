import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
  ParseBoolPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponResponseDto,
  CouponValidationResponseDto,
} from './dto';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { CurrentUser, Roles } from '@common/decorators';
import { JwtPayload, RoleName } from '@mercantix/contracts';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Post('validate')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate coupon code against cart subtotal',
    description:
      'Calculates available discount, checks expiry, usage limits, and user redemption rules.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: CouponValidationResponseDto })
  async validateCoupon(
    @CurrentUser() user: JwtPayload,
    @Body() dto: ValidateCouponDto,
  ): Promise<CouponValidationResponseDto> {
    return this.couponsService.validateCoupon(user.sub, dto);
  }

  @Post('admin')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: Create a new promotional coupon' })
  @ApiResponse({ status: HttpStatus.CREATED, type: CouponResponseDto })
  async createCoupon(
    @Body() dto: CreateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.couponsService.createCoupon(dto);
  }

  @Get('admin')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: List all promotional coupons' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'isActive', required: false, type: Boolean, example: true })
  async listCoupons(
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
    @Query('isActive', new ParseBoolPipe({ optional: true }))
    isActive?: boolean,
  ) {
    return this.couponsService.findAll(page, limit, isActive);
  }

  @Get('admin/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Get coupon details by ID' })
  @ApiResponse({ status: HttpStatus.OK, type: CouponResponseDto })
  async getCoupon(@Param('id') id: string): Promise<CouponResponseDto> {
    return this.couponsService.findById(id);
  }

  @Patch('admin/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Update coupon details or active status' })
  @ApiResponse({ status: HttpStatus.OK, type: CouponResponseDto })
  async updateCoupon(
    @Param('id') id: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<CouponResponseDto> {
    return this.couponsService.updateCoupon(id, dto);
  }

  @Delete('admin/:id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Delete a coupon' })
  async deleteCoupon(@Param('id') id: string) {
    return this.couponsService.deleteCoupon(id);
  }
}
