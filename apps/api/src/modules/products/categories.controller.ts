import {Body,Controller,Delete,Get,HttpCode,HttpStatus,Param,Patch,Post,UseGuards,} from '@nestjs/common';
import {ApiBearerAuth,ApiOperation,ApiResponse,ApiTags,} from '@nestjs/swagger';
import { Public, Roles } from '@common/decorators';
import { JwtAuthGuard, RolesGuard } from '@common/guards';
import { RoleName } from '@mercantix/contracts';
import { CategoriesService } from './categories.service';
import {CategoryResponseDto,CreateCategoryDto,UpdateCategoryDto,} from './dto';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Public()
  @Get('tree')
  @ApiOperation({ summary: 'Public: Get hierarchical category tree' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category tree hierarchy',
    type: [CategoryResponseDto],
  })
  async getTree() {
    return this.categoriesService.getTree();
  }

  @Public()
  @Get()
  @ApiOperation({ summary: 'Public: Get flat list of all categories' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Flat list of categories',
    type: [CategoryResponseDto],
  })
  async findAllFlat() {
    return this.categoriesService.findAllFlat();
  }

  @Public()
  @Get(':idOrSlug')
  @ApiOperation({ summary: 'Public: Get single category by UUID or slug' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category details',
    type: CategoryResponseDto,
  })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Category not found' })
  async findOne(@Param('idOrSlug') idOrSlug: string) {
    return this.categoriesService.findOne(idOrSlug);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Admin: Create a new category' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Category created',
    type: CategoryResponseDto,
  })
  async create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Update category' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Category updated',
    type: CategoryResponseDto,
  })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(RoleName.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Admin: Delete category' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Category deleted' })
  async remove(@Param('id') id: string) {
    return this.categoriesService.remove(id);
  }
}
