import {Controller,Get,Post,Patch,Body,Param,Query,Headers,UseGuards,HttpCode,HttpStatus,ParseIntPipe,} from '@nestjs/common';
import {ApiTags,ApiOperation,ApiResponse,ApiBearerAuth,ApiQuery,} from '@nestjs/swagger';
import { PaymentsService } from './payments.service';
import {InitiatePaymentDto,VerifyPaymentDto,PaymentInitiationResponseDto,PaymentDetailsResponseDto,VendorPayoutResponseDto,} from './dto';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { CurrentUser, Roles, Public } from '@common/decorators';
import { JwtPayload, RoleName } from '@mercantix/contracts';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('initiate')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Initiate payment session for an Order',
    description: 'Generates or returns existing provider payment reference idempotently.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaymentInitiationResponseDto,
  })
  async initiate(
    @CurrentUser() user: JwtPayload,
    @Body() dto: InitiatePaymentDto,
  ): Promise<PaymentInitiationResponseDto> {
    return this.paymentsService.initiatePayment(user.sub, dto);
  }

  @Post('verify')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify client payment completion',
    description:
      'Atomically updates payment to CAPTURED, order to PAID, items to ACCEPTED, and creates vendor payouts.',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PaymentDetailsResponseDto,
  })
  async verify(
    @CurrentUser() user: JwtPayload,
    @Body() dto: VerifyPaymentDto,
  ): Promise<PaymentDetailsResponseDto> {
    return this.paymentsService.verifyPayment(user.sub, dto);
  }

  @Post('webhook/:provider')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Public payment webhook endpoint for gateway callbacks (Razorpay, Stripe)',
  })
  async handleWebhook(
    @Param('provider') provider: string,
    @Body() payload: any,
    @Headers('x-razorpay-signature') razorpaySignature?: string,
    @Headers('stripe-signature') stripeSignature?: string,
  ) {
    const signature = razorpaySignature || stripeSignature;
    return this.paymentsService.processWebhook(provider, payload, signature);
  }

  @Get('order/:orderId')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Get payment details for an order' })
  @ApiResponse({ status: HttpStatus.OK, type: PaymentDetailsResponseDto })
  async getPayment(
    @CurrentUser() user: JwtPayload,
    @Param('orderId') orderId: string,
  ): Promise<PaymentDetailsResponseDto> {
    return this.paymentsService.getPaymentByOrderId(
      orderId,
      user.sub,
      user.roles,
    );
  }

  @Get('vendor/payouts')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiOperation({ summary: 'Vendor: View earnings & payout ledger' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getVendorPayouts(
    @CurrentUser() user: JwtPayload,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.paymentsService.getVendorPayouts(user.sub, page, limit);
  }

  @Patch('admin/payouts/:payoutId/process')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Mark vendor payout as disbursed' })
  @ApiResponse({ status: HttpStatus.OK, type: VendorPayoutResponseDto })
  async adminProcessPayout(
    @CurrentUser() user: JwtPayload,
    @Param('payoutId') payoutId: string,
  ): Promise<VendorPayoutResponseDto> {
    return this.paymentsService.adminProcessPayout(user.sub, payoutId);
  }
}
