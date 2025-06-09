/**
 * 레스토랑 관리 컨트롤러
 * 
 * 점주용 레스토랑 관리 REST API 엔드포인트를 제공합니다.
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Request,
  HttpStatus,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
// import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RestaurantsService } from './restaurants.service';
import { CategoryService } from './services/category.service';
import { BusinessHoursService } from './services/business-hours.service';
import { ImageService } from './services/image.service';
import { MenuItemService } from './services/menu-item.service';
import { OptionGroupService } from './services/option-group.service';
import { MenuOptionService } from './services/menu-option.service';
import { MenuImageService } from './services/menu-image.service';
import { CreateRestaurantDto, UpdateRestaurantDto } from './dto/restaurant.dto';
import { CreateMenuCategoryDto, UpdateMenuCategoryDto, ReorderCategoriesDto } from './dto/category.dto';
import { UpdateBusinessHoursDto, SpecialBusinessHoursDto } from './dto/business-hours.dto';
import { UploadImageDto, UpdateImageDto, ReorderImagesDto, SetPrimaryImageDto, ImageType } from './dto/image.dto';
import { CreateMenuItemDto, UpdateMenuItemDto, MenuItemFilterDto, MenuItemStatus } from './dto/menu-item.dto';
import { CreateOptionGroupDto, UpdateOptionGroupDto, CreateMenuOptionDto, UpdateMenuOptionDto, ReorderOptionsDto } from './dto/menu-option.dto';
import { UploadMenuImageDto, UpdateMenuImageDto, ReorderMenuImagesDto, SetPrimaryMenuImageDto, MenuImageType } from './dto/menu-image.dto';

@ApiTags('restaurants')
@Controller('restaurants')
// @UseGuards(JwtAuthGuard)
// @ApiBearerAuth()
export class RestaurantsController {
  constructor(
    private readonly restaurantsService: RestaurantsService,
    private readonly categoryService: CategoryService,
    private readonly businessHoursService: BusinessHoursService,
    private readonly imageService: ImageService,
    private readonly menuItemService: MenuItemService,
    private readonly optionGroupService: OptionGroupService,
    private readonly menuOptionService: MenuOptionService,
    private readonly menuImageService: MenuImageService,
  ) {}

  // ==================== 레스토랑 기본 관리 ====================

  @Post()
  @ApiOperation({ summary: '레스토랑 등록', description: '새로운 레스토랑을 등록합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '레스토랑이 성공적으로 등록되었습니다.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '잘못된 요청 데이터입니다.' })
  async createRestaurant(@Request() req: any, @Body() createRestaurantDto: CreateRestaurantDto) {
    return this.restaurantsService.createRestaurant(req.user.id, createRestaurantDto);
  }

  // @Get('my')
  // @ApiOperation({ summary: '내 레스토랑 목록 조회', description: '현재 사용자가 소유한 레스토랑 목록을 조회합니다.' })
  // @ApiResponse({ status: HttpStatus.OK, description: '레스토랑 목록 조회 성공' })
  // async getMyRestaurants(@Request() req: any) {
  //   return this.restaurantsService.getRestaurantsByOwner(req.user.id);
  // }

  @Get(':id')
  @ApiOperation({ summary: '레스토랑 상세 조회', description: '특정 레스토랑의 상세 정보를 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '레스토랑 상세 정보 조회 성공' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '레스토랑을 찾을 수 없습니다.' })
  async getRestaurant(@Param('id') id: string) {
    return this.restaurantsService.getRestaurant(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '레스토랑 정보 수정', description: '레스토랑 정보를 수정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '레스토랑 정보가 성공적으로 수정되었습니다.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '해당 레스토랑에 대한 권한이 없습니다.' })
  async updateRestaurant(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateRestaurantDto: UpdateRestaurantDto,
  ) {
    return this.restaurantsService.updateRestaurant(id, req.user.id, updateRestaurantDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '레스토랑 삭제', description: '레스토랑을 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '레스토랑이 성공적으로 삭제되었습니다.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '해당 레스토랑에 대한 권한이 없습니다.' })
  async deleteRestaurant(@Param('id') id: string, @Request() req: any) {
    return this.restaurantsService.deleteRestaurant(id, req.user.id);
  }

  @Get(':id/status')
  @ApiOperation({ summary: '레스토랑 영업 상태 확인', description: '레스토랑의 현재 영업 상태를 확인합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '영업 상태 조회 성공' })
  async getRestaurantStatus(@Param('id') id: string) {
    return this.businessHoursService.getBusinessStatus(id);
  }

  // ==================== 영업시간 관리 ====================

  @Get(':id/business-hours')
  @ApiOperation({ summary: '영업시간 조회', description: '레스토랑의 영업시간을 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '영업시간 조회 성공' })
  async getBusinessHours(@Param('id') id: string) {
    return this.businessHoursService.getBusinessHours(id);
  }

  @Put(':id/business-hours')
  @ApiOperation({ summary: '영업시간 설정', description: '레스토랑의 영업시간을 설정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '영업시간이 성공적으로 설정되었습니다.' })
  async updateBusinessHours(
    @Param('id') id: string,
    @Request() req: any,
    @Body() updateBusinessHoursDto: UpdateBusinessHoursDto,
  ) {
    return this.businessHoursService.updateBusinessHours(id, req.user.id, updateBusinessHoursDto);
  }

  @Post(':id/special-hours')
  @ApiOperation({ summary: '특별 영업일 설정', description: '특별 영업일을 설정합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '특별 영업일이 성공적으로 설정되었습니다.' })
  async setSpecialBusinessHours(
    @Param('id') id: string,
    @Request() req: any,
    @Body() specialBusinessHoursDto: SpecialBusinessHoursDto,
  ) {
    return this.businessHoursService.setSpecialBusinessHours(id, req.user.id, specialBusinessHoursDto);
  }

  @Delete(':id/special-hours/:date')
  @ApiOperation({ summary: '특별 영업일 삭제', description: '특별 영업일을 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '특별 영업일이 성공적으로 삭제되었습니다.' })
  async deleteSpecialBusinessHours(
    @Param('id') id: string,
    @Param('date') date: string,
    @Request() req: any,
  ) {
    return this.businessHoursService.deleteSpecialBusinessHours(id, req.user.id, date);
  }

  // ==================== 메뉴 카테고리 관리 ====================

  @Get(':id/categories')
  @ApiOperation({ summary: '메뉴 카테고리 목록 조회', description: '레스토랑의 메뉴 카테고리 목록을 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '카테고리 목록 조회 성공' })
  async getMenuCategories(
    @Param('id') id: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.categoryService.getMenuCategories(id, includeInactive);
  }

  @Post(':id/categories')
  @ApiOperation({ summary: '메뉴 카테고리 생성', description: '새로운 메뉴 카테고리를 생성합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '카테고리가 성공적으로 생성되었습니다.' })
  async createMenuCategory(
    @Param('id') id: string,
    @Request() req: any,
    @Body() createCategoryDto: CreateMenuCategoryDto,
  ) {
    return this.categoryService.createMenuCategory(id, req.user.id, createCategoryDto);
  }

  @Get(':id/categories/:categoryId')
  @ApiOperation({ summary: '메뉴 카테고리 상세 조회', description: '특정 메뉴 카테고리의 상세 정보를 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '카테고리 상세 정보 조회 성공' })
  async getMenuCategory(@Param('id') id: string, @Param('categoryId') categoryId: string) {
    return this.categoryService.getMenuCategory(categoryId, id);
  }

  @Put(':id/categories/:categoryId')
  @ApiOperation({ summary: '메뉴 카테고리 수정', description: '메뉴 카테고리 정보를 수정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '카테고리가 성공적으로 수정되었습니다.' })
  async updateMenuCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Request() req: any,
    @Body() updateCategoryDto: UpdateMenuCategoryDto,
  ) {
    return this.categoryService.updateMenuCategory(categoryId, id, req.user.id, updateCategoryDto);
  }

  @Delete(':id/categories/:categoryId')
  @ApiOperation({ summary: '메뉴 카테고리 삭제', description: '메뉴 카테고리를 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '카테고리가 성공적으로 삭제되었습니다.' })
  async deleteMenuCategory(
    @Param('id') id: string,
    @Param('categoryId') categoryId: string,
    @Request() req: any,
  ) {
    return this.categoryService.deleteMenuCategory(categoryId, id, req.user.id);
  }

  @Put(':id/categories/reorder')
  @ApiOperation({ summary: '카테고리 순서 변경', description: '메뉴 카테고리의 순서를 변경합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '카테고리 순서가 성공적으로 변경되었습니다.' })
  async reorderCategories(
    @Param('id') id: string,
    @Request() req: any,
    @Body() reorderDto: ReorderCategoriesDto,
  ) {
    return this.categoryService.reorderCategories(id, req.user.id, reorderDto);
  }

  // ==================== 메뉴 아이템 관리 ====================

  @Get(':id/menu-items')
  @ApiOperation({ summary: '메뉴 아이템 목록 조회', description: '레스토랑의 메뉴 아이템 목록을 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 아이템 목록 조회 성공' })
  async getMenuItems(
    @Param('id') id: string,
    @Query() filter: MenuItemFilterDto,
  ) {
    return this.menuItemService.getMenuItems(id, filter);
  }

  @Post(':id/menu-items')
  @ApiOperation({ summary: '메뉴 아이템 생성', description: '새로운 메뉴 아이템을 생성합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '메뉴 아이템이 성공적으로 생성되었습니다.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '잘못된 요청 데이터입니다.' })
  async createMenuItem(
    @Param('id') id: string,
    @Request() req: any,
    @Body() createMenuItemDto: CreateMenuItemDto,
  ) {
    return this.menuItemService.createMenuItem(id, req.user.id, createMenuItemDto);
  }

  @Get(':id/menu-items/:menuItemId')
  @ApiOperation({ summary: '메뉴 아이템 상세 조회', description: '특정 메뉴 아이템의 상세 정보를 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 아이템 상세 정보 조회 성공' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: '메뉴 아이템을 찾을 수 없습니다.' })
  async getMenuItem(@Param('id') id: string, @Param('menuItemId') menuItemId: string) {
    return this.menuItemService.getMenuItem(menuItemId, id);
  }

  @Put(':id/menu-items/:menuItemId')
  @ApiOperation({ summary: '메뉴 아이템 수정', description: '메뉴 아이템 정보를 수정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 아이템이 성공적으로 수정되었습니다.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '해당 메뉴 아이템에 대한 권한이 없습니다.' })
  async updateMenuItem(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Request() req: any,
    @Body() updateMenuItemDto: UpdateMenuItemDto,
  ) {
    return this.menuItemService.updateMenuItem(menuItemId, id, req.user.id, updateMenuItemDto);
  }

  @Delete(':id/menu-items/:menuItemId')
  @ApiOperation({ summary: '메뉴 아이템 삭제', description: '메뉴 아이템을 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 아이템이 성공적으로 삭제되었습니다.' })
  @ApiResponse({ status: HttpStatus.FORBIDDEN, description: '해당 메뉴 아이템에 대한 권한이 없습니다.' })
  async deleteMenuItem(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Request() req: any,
  ) {
    return this.menuItemService.deleteMenuItem(menuItemId, id, req.user.id);
  }

  @Put(':id/menu-items/:menuItemId/status')
  @ApiOperation({ summary: '메뉴 아이템 상태 변경', description: '메뉴 아이템의 상태를 변경합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 아이템 상태가 성공적으로 변경되었습니다.' })
  async updateMenuItemStatus(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Request() req: any,
    @Body('status') status: MenuItemStatus,
  ) {
    return this.menuItemService.updateMenuItemStatus(menuItemId, id, req.user.id, status);
  }

  // ==================== 메뉴 옵션 그룹 관리 ====================

  @Get(':id/menu-items/:menuItemId/option-groups')
  @ApiOperation({ summary: '메뉴 옵션 그룹 목록 조회', description: '메뉴 아이템의 옵션 그룹 목록을 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '옵션 그룹 목록 조회 성공' })
  async getOptionGroups(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.optionGroupService.getOptionGroups(menuItemId, id, includeInactive);
  }

  @Post(':id/menu-items/:menuItemId/option-groups')
  @ApiOperation({ summary: '메뉴 옵션 그룹 생성', description: '새로운 메뉴 옵션 그룹을 생성합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '옵션 그룹이 성공적으로 생성되었습니다.' })
  async createOptionGroup(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Request() req: any,
    @Body() createOptionGroupDto: CreateOptionGroupDto,
  ) {
    return this.optionGroupService.createOptionGroup(menuItemId, id, req.user.id, createOptionGroupDto);
  }

  @Get(':id/menu-items/:menuItemId/option-groups/:optionGroupId')
  @ApiOperation({ summary: '메뉴 옵션 그룹 상세 조회', description: '특정 메뉴 옵션 그룹의 상세 정보를 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '옵션 그룹 상세 정보 조회 성공' })
  async getOptionGroup(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
  ) {
    return this.optionGroupService.getOptionGroup(optionGroupId, menuItemId, id);
  }

  @Put(':id/menu-items/:menuItemId/option-groups/:optionGroupId')
  @ApiOperation({ summary: '메뉴 옵션 그룹 수정', description: '메뉴 옵션 그룹 정보를 수정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '옵션 그룹이 성공적으로 수정되었습니다.' })
  async updateOptionGroup(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Request() req: any,
    @Body() updateOptionGroupDto: UpdateOptionGroupDto,
  ) {
    return this.optionGroupService.updateOptionGroup(optionGroupId, menuItemId, id, req.user.id, updateOptionGroupDto);
  }

  @Delete(':id/menu-items/:menuItemId/option-groups/:optionGroupId')
  @ApiOperation({ summary: '메뉴 옵션 그룹 삭제', description: '메뉴 옵션 그룹을 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '옵션 그룹이 성공적으로 삭제되었습니다.' })
  async deleteOptionGroup(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Request() req: any,
  ) {
    return this.optionGroupService.deleteOptionGroup(optionGroupId, menuItemId, id, req.user.id);
  }

  // ==================== 메뉴 옵션 관리 ====================

  @Get(':id/menu-items/:menuItemId/option-groups/:optionGroupId/options')
  @ApiOperation({ summary: '메뉴 옵션 목록 조회', description: '옵션 그룹의 메뉴 옵션 목록을 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 옵션 목록 조회 성공' })
  async getMenuOptions(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.menuOptionService.getMenuOptions(optionGroupId, menuItemId, id, includeInactive);
  }

  @Post(':id/menu-items/:menuItemId/option-groups/:optionGroupId/options')
  @ApiOperation({ summary: '메뉴 옵션 생성', description: '새로운 메뉴 옵션을 생성합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '메뉴 옵션이 성공적으로 생성되었습니다.' })
  async createMenuOption(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Request() req: any,
    @Body() createMenuOptionDto: CreateMenuOptionDto,
  ) {
    return this.menuOptionService.createMenuOption(optionGroupId, menuItemId, id, req.user.id, createMenuOptionDto);
  }

  @Get(':id/menu-items/:menuItemId/option-groups/:optionGroupId/options/:optionId')
  @ApiOperation({ summary: '메뉴 옵션 상세 조회', description: '특정 메뉴 옵션의 상세 정보를 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 옵션 상세 정보 조회 성공' })
  async getMenuOption(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Param('optionId') optionId: string,
  ) {
    return this.menuOptionService.getMenuOption(optionId, optionGroupId, menuItemId, id);
  }

  @Put(':id/menu-items/:menuItemId/option-groups/:optionGroupId/options/:optionId')
  @ApiOperation({ summary: '메뉴 옵션 수정', description: '메뉴 옵션 정보를 수정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 옵션이 성공적으로 수정되었습니다.' })
  async updateMenuOption(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Param('optionId') optionId: string,
    @Request() req: any,
    @Body() updateMenuOptionDto: UpdateMenuOptionDto,
  ) {
    return this.menuOptionService.updateMenuOption(optionId, optionGroupId, menuItemId, id, req.user.id, updateMenuOptionDto);
  }

  @Delete(':id/menu-items/:menuItemId/option-groups/:optionGroupId/options/:optionId')
  @ApiOperation({ summary: '메뉴 옵션 삭제', description: '메뉴 옵션을 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 옵션이 성공적으로 삭제되었습니다.' })
  async deleteMenuOption(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Param('optionId') optionId: string,
    @Request() req: any,
  ) {
    return this.menuOptionService.deleteMenuOption(optionId, optionGroupId, menuItemId, id, req.user.id);
  }

  @Put(':id/menu-items/:menuItemId/option-groups/:optionGroupId/options/reorder')
  @ApiOperation({ summary: '메뉴 옵션 순서 변경', description: '메뉴 옵션의 순서를 변경합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 옵션 순서가 성공적으로 변경되었습니다.' })
  async reorderMenuOptions(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Request() req: any,
    @Body() reorderDto: ReorderOptionsDto,
  ) {
    return this.menuOptionService.reorderMenuOptions(optionGroupId, menuItemId, id, req.user.id, reorderDto);
  }

  @Put(':id/menu-items/:menuItemId/option-groups/:optionGroupId/options/:optionId/stock-status')
  @ApiOperation({ summary: '메뉴 옵션 품절 상태 변경', description: '메뉴 옵션의 품절 상태를 변경합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 옵션 품절 상태가 성공적으로 변경되었습니다.' })
  async updateMenuOptionStockStatus(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('optionGroupId') optionGroupId: string,
    @Param('optionId') optionId: string,
    @Request() req: any,
    @Body('isOutOfStock') isOutOfStock: boolean,
  ) {
    return this.menuOptionService.updateStockStatus(optionId, optionGroupId, menuItemId, id, req.user.id, isOutOfStock);
  }

  // ==================== 메뉴 이미지 관리 ====================

  @Get(':id/menu-items/:menuItemId/images')
  @ApiOperation({ summary: '메뉴 이미지 갤러리 조회', description: '메뉴 아이템의 이미지 갤러리를 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 이미지 갤러리 조회 성공' })
  async getMenuImageGallery(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.menuImageService.getMenuImageGallery(menuItemId, id, includeInactive);
  }

  @Get(':id/menu-items/:menuItemId/images/:type')
  @ApiOperation({ summary: '특정 타입 메뉴 이미지 목록 조회', description: '특정 타입의 메뉴 이미지 목록을 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 이미지 목록 조회 성공' })
  async getMenuImagesByType(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('type') type: MenuImageType,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.menuImageService.getMenuImagesByType(menuItemId, id, type, includeInactive);
  }

  @Post(':id/menu-items/:menuItemId/images')
  @ApiOperation({ summary: '메뉴 이미지 업로드', description: '메뉴 아이템에 새로운 이미지를 업로드합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '메뉴 이미지가 성공적으로 업로드되었습니다.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '파일 업로드에 실패했습니다.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    description: '메뉴 이미지 업로드',
    type: UploadMenuImageDto,
  })
  async uploadMenuImage(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: any,
    @Body() uploadDto: UploadMenuImageDto,
  ) {
    return this.menuImageService.uploadMenuImage(menuItemId, id, req.user.id, file, uploadDto);
  }

  @Put(':id/menu-items/:menuItemId/images/:imageId')
  @ApiOperation({ summary: '메뉴 이미지 수정', description: '메뉴 이미지 정보를 수정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 이미지가 성공적으로 수정되었습니다.' })
  async updateMenuImage(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
    @Body() updateDto: UpdateMenuImageDto,
  ) {
    return this.menuImageService.updateMenuImage(imageId, menuItemId, id, req.user.id, updateDto);
  }

  @Delete(':id/menu-items/:menuItemId/images/:imageId')
  @ApiOperation({ summary: '메뉴 이미지 삭제', description: '메뉴 이미지를 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 이미지가 성공적으로 삭제되었습니다.' })
  async deleteMenuImage(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
  ) {
    return this.menuImageService.deleteMenuImage(imageId, menuItemId, id, req.user.id);
  }

  @Put(':id/menu-items/:menuItemId/images/reorder')
  @ApiOperation({ summary: '메뉴 이미지 순서 변경', description: '메뉴 이미지의 순서를 변경합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '메뉴 이미지 순서가 성공적으로 변경되었습니다.' })
  async reorderMenuImages(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Request() req: any,
    @Body() reorderDto: ReorderMenuImagesDto,
  ) {
    return this.menuImageService.reorderMenuImages(menuItemId, id, req.user.id, reorderDto);
  }

  @Put(':id/menu-items/:menuItemId/images/:imageId/set-primary')
  @ApiOperation({ summary: '메뉴 대표 이미지 설정', description: '메뉴 이미지를 대표 이미지로 설정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '대표 이미지가 성공적으로 설정되었습니다.' })
  async setPrimaryMenuImage(
    @Param('id') id: string,
    @Param('menuItemId') menuItemId: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
    @Body() setPrimaryDto: SetPrimaryMenuImageDto,
  ) {
    return this.menuImageService.setPrimaryMenuImage(menuItemId, id, req.user.id, setPrimaryDto);
  }

  // ==================== 레스토랑 이미지 관리 (기존 유지) ====================

  @Get(':id/images')
  @ApiOperation({ summary: '레스토랑 이미지 갤러리 조회', description: '레스토랑의 이미지 갤러리를 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '이미지 갤러리 조회 성공' })
  async getImageGallery(
    @Param('id') id: string,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.imageService.getImageGallery(id, includeInactive);
  }

  @Get(':id/images/:type')
  @ApiOperation({ summary: '특정 타입 이미지 목록 조회', description: '특정 타입의 이미지 목록을 조회합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '이미지 목록 조회 성공' })
  async getImagesByType(
    @Param('id') id: string,
    @Param('type') type: ImageType,
    @Query('includeInactive') includeInactive?: boolean,
  ) {
    return this.imageService.getImagesByType(id, type, includeInactive);
  }

  @Post(':id/images')
  @ApiOperation({ summary: '레스토랑 이미지 업로드', description: '레스토랑에 새로운 이미지를 업로드합니다.' })
  @ApiResponse({ status: HttpStatus.CREATED, description: '이미지가 성공적으로 업로드되었습니다.' })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: '파일 업로드에 실패했습니다.' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @ApiBody({
    description: '이미지 업로드',
    type: UploadImageDto,
  })
  async uploadImage(
    @Param('id') id: string,
    @Request() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|webp)$/ }),
        ],
      }),
    )
    file: any,
    @Body() uploadDto: UploadImageDto,
  ) {
    return this.imageService.uploadImage(id, req.user.id, file, uploadDto);
  }

  @Put(':id/images/:imageId')
  @ApiOperation({ summary: '레스토랑 이미지 수정', description: '레스토랑 이미지 정보를 수정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '이미지가 성공적으로 수정되었습니다.' })
  async updateImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
    @Body() updateDto: UpdateImageDto,
  ) {
    return this.imageService.updateImage(imageId, id, req.user.id, updateDto);
  }

  @Delete(':id/images/:imageId')
  @ApiOperation({ summary: '레스토랑 이미지 삭제', description: '레스토랑 이미지를 삭제합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '이미지가 성공적으로 삭제되었습니다.' })
  async deleteImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
  ) {
    return this.imageService.deleteImage(imageId, id, req.user.id);
  }

  @Put(':id/images/reorder')
  @ApiOperation({ summary: '레스토랑 이미지 순서 변경', description: '레스토랑 이미지의 순서를 변경합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '이미지 순서가 성공적으로 변경되었습니다.' })
  async reorderImages(
    @Param('id') id: string,
    @Request() req: any,
    @Body() reorderDto: ReorderImagesDto,
  ) {
    return this.imageService.reorderImages(id, req.user.id, reorderDto);
  }

  @Put(':id/images/:imageId/set-primary')
  @ApiOperation({ summary: '레스토랑 대표 이미지 설정', description: '레스토랑 이미지를 대표 이미지로 설정합니다.' })
  @ApiResponse({ status: HttpStatus.OK, description: '대표 이미지가 성공적으로 설정되었습니다.' })
  async setPrimaryImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @Request() req: any,
  ) {
    return this.imageService.setPrimaryImage(imageId, id, req.user.id);
  }
} 