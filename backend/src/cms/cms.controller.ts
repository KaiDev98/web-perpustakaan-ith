import { BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { IsBoolean, IsEmail, IsIn, IsInt, IsObject, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { type AdminRequest, CsrfGuard, PermissionGuard, RequirePermission, SessionGuard } from '../auth/auth.guards.js';
import { CmsService, CONTENT_TYPES, RESOURCE_TYPES, safeText } from './cms.service.js';

class PageDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsString() @IsIn(CONTENT_TYPES) content_type?: string;
  @IsOptional() @IsString() @IsIn(RESOURCE_TYPES) resource_type?: string;
}
class ContentDto {
  @IsOptional() @IsString() @MaxLength(180) slug?: string;
  @IsOptional() @IsIn(CONTENT_TYPES) content_type?: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(100000) body?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) media_asset_id?: number;
  @IsOptional() @IsBoolean() is_published?: boolean;
}
class ResourceDto {
  @IsOptional() @IsIn(RESOURCE_TYPES) resource_type?: string;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) description?: string;
  @IsOptional() @IsString() @MaxLength(2048) url?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) position?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
class SlideDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) media_asset_id?: number;
  @IsOptional() @IsString() @MaxLength(255) title?: string;
  @IsOptional() @IsString() @MaxLength(5000) caption?: string;
  @IsOptional() @IsString() @MaxLength(2048) target_url?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) position?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
}
class SettingsDto {
  @IsOptional() @IsString() @MaxLength(255) institution_name?: string;
  @IsOptional() @IsString() @MaxLength(255) website_name?: string;
  @IsOptional() @IsString() @MaxLength(20) admin_whatsapp?: string;
  @IsOptional() @IsEmail() admin_email?: string;
  @IsOptional() @IsString() @MaxLength(5000) address?: string;
  @IsOptional() @IsString() @MaxLength(255) service_hours?: string;
  @IsOptional() @IsObject() social_links?: Record<string, string>;
  @IsOptional() @IsString() @MaxLength(5000) footer_text?: string;
}
class MenuDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) parent_id?: number;
  @IsOptional() @IsString() @MaxLength(120) label?: string;
  @IsOptional() @IsString() @MaxLength(2048) target_url?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) position?: number;
  @IsOptional() @IsBoolean() is_active?: boolean;
  @IsOptional() @IsBoolean() open_new_tab?: boolean;
}
const pagination = (query: PageDto) => [query.page ?? 1, query.limit ?? 20] as const;

@Controller('public')
export class CmsPublicController {
  constructor(private readonly cms: CmsService) {}
  @Get('contents') contents(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('contents', page, limit, true, query.content_type); }
  @Get('contents/:id') content(@Param('id', ParseIntPipe) id: number) { return this.cms.detail('contents', id, true); }
  @Get('menu') menu(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('menu_items', page, limit, true); }
  @Get('resources') resources(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('resource_links', page, limit, true, query.resource_type); }
  @Get('slides') slides(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('slides', page, limit, true); }
  @Get('settings') settings() { return this.cms.settings(true); }
}

@Controller('admin/cms')
@UseGuards(SessionGuard, PermissionGuard)
export class CmsAdminController {
  constructor(private readonly cms: CmsService) {}

  @Get('contents') @RequirePermission('content.read') contents(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('contents', page, limit, false, query.content_type); }
  @Get('contents/:id') @RequirePermission('content.read') content(@Param('id', ParseIntPipe) id: number) { return this.cms.detail('contents', id, false); }
  @Post('contents') @RequirePermission('content.manage') @UseGuards(CsrfGuard)
  createContent(@Body() body: ContentDto, @Req() request: AdminRequest) {
    this.cms.validateContent(body);
    if (!body.slug || !body.content_type || !body.title || !body.body) throw new BadRequestException('Required content fields');
    return this.cms.create('contents', { ...body, is_published: body.is_published ?? false, published_at: body.is_published ? new Date() : null }, request.admin!.user.id);
  }
  @Patch('contents/:id') @RequirePermission('content.manage') @UseGuards(CsrfGuard)
  updateContent(@Param('id', ParseIntPipe) id: number, @Body() body: ContentDto, @Req() request: AdminRequest) {
    this.cms.validateContent(body);
    return this.cms.update('contents', id, { ...body, ...(body.is_published === true ? { published_at: new Date() } : body.is_published === false ? { published_at: null } : {}) }, request.admin!.user.id);
  }
  @Delete('contents/:id') @RequirePermission('content.manage') @UseGuards(CsrfGuard)
  deleteContent(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) { return this.cms.remove('contents', id, request.admin!.user.id); }

  @Get('resources') @RequirePermission('resources.read') resources(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('resource_links', page, limit, false, query.resource_type); }
  @Post('resources') @RequirePermission('resources.manage') @UseGuards(CsrfGuard)
  createResource(@Body() body: ResourceDto, @Req() request: AdminRequest) {
    this.cms.validateResource(body);
    if (!body.resource_type || !body.title || !body.url) throw new BadRequestException('Required resource fields');
    return this.cms.create('resource_links', body, request.admin!.user.id);
  }
  @Patch('resources/:id') @RequirePermission('resources.manage') @UseGuards(CsrfGuard)
  updateResource(@Param('id', ParseIntPipe) id: number, @Body() body: ResourceDto, @Req() request: AdminRequest) { this.cms.validateResource(body); return this.cms.update('resource_links', id, body, request.admin!.user.id); }
  @Delete('resources/:id') @RequirePermission('resources.manage') @UseGuards(CsrfGuard)
  deleteResource(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) { return this.cms.remove('resource_links', id, request.admin!.user.id); }

  @Get('menu') @RequirePermission('navigation.read') menu(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('menu_items', page, limit, false); }
  @Post('menu') @RequirePermission('navigation.manage') @UseGuards(CsrfGuard)
  createMenu(@Body() body: MenuDto, @Req() request: AdminRequest) { this.cms.validateMenu(body); if (!body.label || !body.target_url) throw new BadRequestException('Required menu fields'); return this.cms.create('menu_items', body, request.admin!.user.id); }
  @Patch('menu/:id') @RequirePermission('navigation.manage') @UseGuards(CsrfGuard)
  updateMenu(@Param('id', ParseIntPipe) id: number, @Body() body: MenuDto, @Req() request: AdminRequest) { this.cms.validateMenu(body); return this.cms.update('menu_items', id, body, request.admin!.user.id); }
  @Delete('menu/:id') @RequirePermission('navigation.manage') @UseGuards(CsrfGuard)
  deleteMenu(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) { return this.cms.remove('menu_items', id, request.admin!.user.id); }

  @Get('slides') @RequirePermission('slides.read') slides(@Query() query: PageDto) { const [page, limit] = pagination(query); return this.cms.list('slides', page, limit, false); }
  @Post('slides') @RequirePermission('slides.manage') @UseGuards(CsrfGuard)
  createSlide(@Body() body: SlideDto, @Req() request: AdminRequest) { if (!body.title || !body.media_asset_id) throw new BadRequestException('Required slide fields'); if (body.target_url && !this.cmsUrl(body.target_url)) throw new BadRequestException('Invalid URL'); if (!safeText(body.title) || (body.caption && !safeText(body.caption))) throw new BadRequestException('Invalid text'); return this.cms.create('slides', body, request.admin!.user.id); }
  @Patch('slides/:id') @RequirePermission('slides.manage') @UseGuards(CsrfGuard)
  updateSlide(@Param('id', ParseIntPipe) id: number, @Body() body: SlideDto, @Req() request: AdminRequest) { if (body.target_url && !this.cmsUrl(body.target_url)) throw new BadRequestException('Invalid URL'); if ((body.title && !safeText(body.title)) || (body.caption && !safeText(body.caption))) throw new BadRequestException('Invalid text'); return this.cms.update('slides', id, body, request.admin!.user.id); }
  @Delete('slides/:id') @RequirePermission('slides.manage') @UseGuards(CsrfGuard)
  deleteSlide(@Param('id', ParseIntPipe) id: number, @Req() request: AdminRequest) { return this.cms.remove('slides', id, request.admin!.user.id); }

  @Get('settings') @RequirePermission('settings.read') settings() { return this.cms.settings(false); }
  @Patch('settings') @RequirePermission('settings.manage') @UseGuards(CsrfGuard)
  updateSettings(@Body() body: SettingsDto, @Req() request: AdminRequest) {
    for (const value of Object.values(body)) if (typeof value === 'string' && !safeText(value)) throw new BadRequestException('Invalid text');
    if (body.social_links && (Object.keys(body.social_links).length > 10 || Object.values(body.social_links).some((url) => typeof url !== 'string' || !this.cmsUrl(url)))) throw new BadRequestException('Invalid social links');
    return this.cms.updateSettings(body, request.admin!.user.id);
  }
  private cmsUrl(value: string) { try { const url = new URL(value); return ['https:', 'http:'].includes(url.protocol) && !!url.hostname && !url.username && !url.password; } catch { return false; } }
}
