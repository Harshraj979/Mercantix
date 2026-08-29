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
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser, Public, Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { RoleName, VendorStatus } from '@mercantix/contracts';
import {
  CreateVendorDocumentDto,
  CreateVendorDto,
  PublicVendorResponseDto,
  SetVendorBankAccountDto,
  UpdateVendorDto,
  UpdateVendorStatusDto,
  VendorBankAccountResponseDto,
  VendorDocumentResponseDto,
  VendorResponseDto,
  VerifyDocumentDto,
} from './dto';
import { VendorsService } from './vendors.service';

@ApiTags('Vendors')
@Controller('vendors')
export class VendorsController {
  constructor(private readonly vendorsService: VendorsService) {}

  // ==========================================
  // 1. PUBLIC ENDPOINTS
  // ==========================================

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: Browse approved vendor directory' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Paginated list of approved vendor stores',
    type: [PublicVendorResponseDto],
  })
  async findAllPublic(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.vendorsService.findAllPublic(+page, +limit);
  }

  @Public()
  @Get(':slug')
  @ApiOperation({ summary: 'Public: Get approved vendor store by slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Public vendor store profile',
    type: PublicVendorResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor store not found' })
  async findBySlug(@Param('slug') slug: string) {
    return this.vendorsService.findBySlug(slug);
  }

  // ==========================================
  // 2. VENDOR PORTAL ENDPOINTS (AUTHENTICATED)
  // ==========================================

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vendor: Create new vendor store application' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Vendor application created in DRAFT status',
    type: VendorResponseDto,
  })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'Vendor profile already exists' })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVendorDto,
  ) {
    return this.vendorsService.create(userId, dto);
  }

  @Get('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Get current vendor profile and onboarding status' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor profile details',
    type: VendorResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Vendor profile not found' })
  async getProfile(@CurrentUser('sub') userId: string) {
    return this.vendorsService.getProfile(userId);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Update store details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor profile updated',
    type: VendorResponseDto,
  })
  async updateProfile(
    @CurrentUser('sub') userId: string,
    @Body() dto: UpdateVendorDto,
  ) {
    return this.vendorsService.updateProfile(userId, dto);
  }

  @Post('me/submit')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Vendor: Submit completed onboarding application for review' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Application submitted for review',
    type: VendorResponseDto,
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Missing bank account or KYC documents' })
  async submitForReview(@CurrentUser('sub') userId: string) {
    return this.vendorsService.submitForReview(userId);
  }

  @Post('me/documents')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Vendor: Upload/register KYC verification document' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Document registered in PENDING status',
    type: VendorDocumentResponseDto,
  })
  async addDocument(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateVendorDocumentDto,
  ) {
    return this.vendorsService.addDocument(userId, dto);
  }

  @Delete('me/documents/:id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Remove KYC verification document' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Document removed successfully' })
  async removeDocument(
    @CurrentUser('sub') userId: string,
    @Param('id') documentId: string,
  ) {
    return this.vendorsService.removeDocument(userId, documentId);
  }

  @Put('me/bank-account')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Vendor: Set payout bank account details' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bank account configured',
    type: VendorBankAccountResponseDto,
  })
  async setBankAccount(
    @CurrentUser('sub') userId: string,
    @Body() dto: SetVendorBankAccountDto,
  ) {
    return this.vendorsService.setBankAccount(userId, dto);
  }

  // ==========================================
  // 3. ADMIN ENDPOINTS (RBAC)
  // ==========================================

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: List all vendors with status filter and pagination' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiQuery({ name: 'status', enum: VendorStatus, required: false })
  @ApiResponse({ status: HttpStatus.OK, description: 'Paginated list of all vendors' })
  async adminFindAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
    @Query('status') status?: VendorStatus,
  ) {
    return this.vendorsService.adminFindAll(+page, +limit, status);
  }

  @Patch('admin/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update vendor status (Approve, Reject, Suspend) and commission rate' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Vendor status updated',
    type: VendorResponseDto,
  })
  async adminUpdateStatus(
    @Param('id') vendorId: string,
    @Body() dto: UpdateVendorStatusDto,
  ) {
    return this.vendorsService.adminUpdateStatus(vendorId, dto);
  }

  @Patch('admin/documents/:id/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Verify or reject a vendor KYC document' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Document verification status updated',
    type: VendorDocumentResponseDto,
  })
  async adminVerifyDocument(
    @Param('id') documentId: string,
    @Body() dto: VerifyDocumentDto,
  ) {
    return this.vendorsService.adminVerifyDocument(documentId, dto);
  }
}
