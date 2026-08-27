import {Body,Controller,Delete,Get,HttpCode,HttpStatus,Param,Patch,Post,UseGuards} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiResponse,ApiTags,} from '@nestjs/swagger';
import { CurrentUser } from '@common/decorators';
import { JwtAuthGuard } from '@common/guards';
import { AddressesService } from './addresses.service';
import {AddressResponseDto,CreateAddressDto,UpdateAddressDto,} from './dto';

@ApiTags('Addresses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('users/me/addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add a new address for current user' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Address created successfully',
    type: AddressResponseDto,
  })
  async create(
    @CurrentUser('sub') userId: string,
    @Body() dto: CreateAddressDto,
  ) {
    return this.addressesService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all addresses for current user' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'List of user addresses',
    type: [AddressResponseDto],
  })
  async findAll(@CurrentUser('sub') userId: string) {
    return this.addressesService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a specific address by ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address details',
    type: AddressResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Address not found' })
  async findOne(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.addressesService.findOne(userId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an existing address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address updated successfully',
    type: AddressResponseDto,
  })
  async update(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.addressesService.update(userId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address deleted successfully',
  })
  async remove(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.addressesService.remove(userId, id);
  }

  @Patch(':id/default')
  @ApiOperation({ summary: 'Set an address as the default delivery address' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Address set as default',
    type: AddressResponseDto,
  })
  async setDefault(
    @CurrentUser('sub') userId: string,
    @Param('id') id: string,
  ) {
    return this.addressesService.setDefault(userId, id);
  }
}
