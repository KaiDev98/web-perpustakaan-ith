import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import { IsEmail, IsIn, IsInt, IsOptional, IsString, Matches, Max, MaxLength, Min, MinLength } from 'class-validator';
import type { Request } from 'express';
import { type AdminRequest, CsrfGuard, PermissionGuard, RequirePermission, SessionGuard } from '../auth/auth.guards.js';
import { RequestsService } from './requests.service.js';

const trimmed = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() : value;
const optional = ({ value }: { value: unknown }) => typeof value === 'string' ? value.trim() || null : value;
class LiteracyDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(160) requester_name!: string;
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(255) title!: string;
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(5000) description!: string;
  @Transform(optional) @IsOptional() @Matches(/^(?:\+?[1-9]\d{7,14}|08\d{7,12})$/) requester_whatsapp?: string | null;
  @Transform(optional) @IsOptional() @IsEmail() @MaxLength(254) requester_email?: string | null;
}
class ClearanceDto {
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(160) full_name!: string;
  @Transform(trimmed) @IsString() @MinLength(1) @MaxLength(32) nim!: string;
  @Type(() => Number) @IsInt() @Min(1) study_program_id!: number;
  @Transform(trimmed) @Matches(/^(?:\+?[1-9]\d{7,14}|08\d{7,12})$/) whatsapp!: string;
  @Transform(trimmed) @IsEmail() @MaxLength(254) email!: string;
}
class ListDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
  @IsOptional() @IsIn(['PROSES', 'SELESAI']) status?: 'PROSES' | 'SELESAI';
  @IsOptional() @Transform(trimmed) @IsString() @MaxLength(80) q?: string;
}
class StatusDto { @IsIn(['PROSES', 'SELESAI']) status!: 'PROSES' | 'SELESAI'; }

@Controller('public')
export class PublicRequestsController {
  constructor(private readonly service: RequestsService) {}
  @Get('study-programs') studyPrograms() { return this.service.studyPrograms(); }
  @Post('literacy-requests') literacy(@Body() body: LiteracyDto, @Req() request: Request) { return this.service.createLiteracy(body, request.ip ?? 'unknown'); }
  @Post('clearance-requests') clearance(@Body() body: ClearanceDto, @Req() request: Request) { return this.service.createClearance(body, request.ip ?? 'unknown'); }
}

@Controller('admin')
@UseGuards(SessionGuard, PermissionGuard)
export class AdminRequestsController {
  constructor(private readonly service: RequestsService) {}
  @Get('requests/summary') @RequirePermission('requests.summary.read') summary() { return this.service.summary(); }
  @Get('literacy-requests') @RequirePermission('requests.literacy.read') literacyList(@Query() query: ListDto) { return this.service.list('literacy', query.page ?? 1, query.limit ?? 20, query.status, query.q); }
  @Get('literacy-requests/:id') @RequirePermission('requests.literacy.read') literacyDetail(@Param('id', ParseIntPipe) id: number) { return this.service.detail('literacy', id); }
  @Patch('literacy-requests/:id/status') @RequirePermission('requests.literacy.status') @UseGuards(CsrfGuard)
  literacyStatus(@Param('id', ParseIntPipe) id: number, @Body() body: StatusDto, @Req() request: AdminRequest) { return this.service.changeStatus('literacy', id, body.status, request.admin!.user.id); }
  @Get('clearance-requests') @RequirePermission('requests.clearance.read') clearanceList(@Query() query: ListDto) { return this.service.list('clearance', query.page ?? 1, query.limit ?? 20, query.status, query.q); }
  @Get('clearance-requests/:id') @RequirePermission('requests.clearance.read') clearanceDetail(@Param('id', ParseIntPipe) id: number) { return this.service.detail('clearance', id); }
  @Patch('clearance-requests/:id/status') @RequirePermission('requests.clearance.status') @UseGuards(CsrfGuard)
  clearanceStatus(@Param('id', ParseIntPipe) id: number, @Body() body: StatusDto, @Req() request: AdminRequest) { return this.service.changeStatus('clearance', id, body.status, request.admin!.user.id); }
}
