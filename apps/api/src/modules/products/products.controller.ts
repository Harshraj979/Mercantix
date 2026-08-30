import {Body,Controller,Delete,Get,HttpCode,HttpStatus,Param,Patch,Post,Query,UseGuards,} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiResponse,ApiTags,} from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { ProductStatus, RoleName } from '@mercantix/contracts';
import {
  CreateProductDto,
  CreateVariantDto,
  ProductImageDto,
  ProductImageResponseDto,
  ProductQueryDto,
  ProductResponseDto,
  ProductVariantResponseDto,
  UpdateProductDto,
  UpdateVariantDto,
} from './dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: Search, filter, and paginate active product catalog' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated product list',
  })
  async findAll(@Query() query: ProductQueryDto) {
    return this.productsService.findAll(query, true);
  }

  @Public()
  @Get('detail/:slug')
  @ApiOperation({ summary: 'Public: Get single active product by SEO slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Full product details with gallery and variants',
    type: ProductResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Product not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.productsService.findBySlug(slug);
  }

  

  @Get('vendor/me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Get all products owned by current vendor' })
  @ApiResponse({ status: HttpStatus.OK, description: 'List of vendor products' })
  async vendorFindAll(
    @CurrentUser('sub') userId: string,
    @Query() query: ProductQueryDto,
  ) {
    return this.productsService.vendorFindAll(userId, query);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vendor: Create a new product listing' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Product created in DRAFT status',
    type: ProductResponseDto,
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateProductDto,
  ) {
    return this.productsService.create(userId, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get single product by UUID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product details',
    type: ProductResponseDto,
  })
  async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Update product information' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product updated',
    type: ProductResponseDto,
  })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(userId, id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Delete a product listing' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Product deleted' })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.productsService.remove(userId, id);
  }



  @Post(':id/variants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vendor: Add a variant to a product' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Variant created',
    type: ProductVariantResponseDto,
  })
  async addVariant(
    @CurrentUser('sub') userId: string,
    @Param('id') productId: string,
    @Body() dto: CreateVariantDto,
  ) {
    return this.productsService.addVariant(userId, productId, dto);
  }

  @Patch(':id/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Update a product variant' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Variant updated',
    type: ProductVariantResponseDto,
  })
  async updateVariant(
    @CurrentUser('sub') userId: string,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() dto: UpdateVariantDto,
  ) {
    return this.productsService.updateVariant(userId, productId, variantId, dto);
  }

  @Delete(':id/variants/:variantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Delete a product variant' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Variant deleted' })
  async removeVariant(
    @CurrentUser('sub') userId: string,
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
  ) {
    return this.productsService.removeVariant(userId, productId, variantId);
  }

  // ==========================================
  // 4. PRODUCT IMAGES MANAGEMENT
  // ==========================================

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vendor: Add an image to the product gallery' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Image added',
    type: ProductImageResponseDto,
  })
  async addImage(
    @CurrentUser('sub') userId: string,
    @Param('id') productId: string,
    @Body() dto: ProductImageDto,
  ) {
    return this.productsService.addImage(userId, productId, dto);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.VENDOR)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Remove an image from the product gallery' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Image removed' })
  async removeImage(
    @CurrentUser('sub') userId: string,
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
  ) {
    return this.productsService.removeImage(userId, productId, imageId);
  }



  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update product status (Approve / Activate / Deactivate)' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Product status updated',
    type: ProductResponseDto,
  })
  async adminUpdateStatus(
    @Param('id') id: string,
    @Body('status') status: ProductStatus,
  ) {
    return this.productsService.adminUpdateStatus(id, status);
  }
}
