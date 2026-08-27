import {Body,Controller,Get,Param,Patch,Query,UseGuards,} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiQuery,ApiResponse,ApiTags,} from '@nestjs/swagger';
import { Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { RoleName } from '@mercantix/contracts';
import { UpdateUserStatusDto } from './dto';
import { UsersService } from './users.service';

@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Get paginated list of all users' })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 20 })
  @ApiResponse({ status: 200, description: 'Paginated users list' })
  async findAll(
    @Query('page') page = 1,
    @Query('limit') limit = 20,
  ) {
    return this.usersService.findAll(+page, +limit);
  }

  @Get(':id')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Get user details by ID' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async findById(@Param('id') id: string) {
    return this.usersService.findById(id);
  }

  @Patch(':id/status')
  @Roles(RoleName.ADMIN)
  @ApiOperation({ summary: 'Admin: Update user account status' })
  @ApiResponse({ status: 200, description: 'User status updated successfully' })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateUserStatusDto,
  ) {
    return this.usersService.updateStatus(id, dto.status);
  }
}
