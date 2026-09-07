import {Controller,Get,Post,Patch,Delete,Body,Param,Query,UseGuards,HttpCode,HttpStatus,ParseIntPipe,} from '@nestjs/common';
import {ApiTags,ApiOperation,ApiResponse,ApiBearerAuth,ApiQuery,} from '@nestjs/swagger';
import { ReviewsService } from './reviews.service';
import {CreateReviewDto,UpdateReviewDto,ReviewResponseDto,ProductRatingSummaryDto,} from './dto';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { CurrentUser, Roles, Public } from '@common/decorators';
import { JwtPayload, RoleName } from '@mercantix/contracts';

@ApiTags('Reviews')
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.BUYER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit a verified purchase review',
    description:
      'Creates a 1-5 star review with optional feedback for a delivered/paid order item.',
  })
  @ApiResponse({ status: HttpStatus.CREATED, type: ReviewResponseDto })
  async createReview(
    @CurrentUser() user: JwtPayload,
    @Body() dto: CreateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.createReview(user.sub, dto);
  }

  @Get('product/:productId')
  @Public()
  @ApiOperation({ summary: 'Get paginated reviews for a product' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  async getProductReviews(
    @Param('productId') productId: string,
    @Query('page', new ParseIntPipe({ optional: true })) page = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit = 10,
  ) {
    return this.reviewsService.getProductReviews(productId, page, limit);
  }

  @Get('product/:productId/summary')
  @Public()
  @ApiOperation({
    summary: 'Get aggregated rating distribution and average score',
  })
  @ApiResponse({ status: HttpStatus.OK, type: ProductRatingSummaryDto })
  async getProductRatingSummary(
    @Param('productId') productId: string,
  ): Promise<ProductRatingSummaryDto> {
    return this.reviewsService.getProductRatingSummary(productId);
  }

  @Patch(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.BUYER)
  @ApiOperation({ summary: 'Update your submitted review' })
  @ApiResponse({ status: HttpStatus.OK, type: ReviewResponseDto })
  async updateReview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
  ): Promise<ReviewResponseDto> {
    return this.reviewsService.updateReview(user.sub, id, dto);
  }

  @Delete(':id')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Delete review (Review author or Administrator)' })
  async deleteReview(
    @CurrentUser() user: JwtPayload,
    @Param('id') id: string,
  ) {
    return this.reviewsService.deleteReview(user.sub, id, user.roles);
  }
}
