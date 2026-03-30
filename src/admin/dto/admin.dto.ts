import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsInt,
  Min,
  Max,
  IsEnum,
  MaxLength,
  IsUrl,
  Matches,
} from 'class-validator';
import { ReportStatus } from '@prisma/client';

// ── CHANNELS ─────────────────────────────────

export class CreateChannelDto {
  @IsString() @IsNotEmpty() @MaxLength(100) name: string;
  @IsString() @IsNotEmpty() @MaxLength(100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets' }) slug: string;
  @IsString() @IsOptional() @MaxLength(2048) hls_url?: string;
  @IsString() @IsNotEmpty() @MaxLength(50) category: string;
  @IsString() @IsOptional() @IsUrl({}, { message: 'URL du logo invalide' }) @MaxLength(2048) logo_url?: string;
  @IsBoolean() @IsOptional() is_active?: boolean;
  @IsBoolean() @IsOptional() is_premium?: boolean;
  @IsInt() @IsOptional() @Min(0) sort_order?: number;
}

export class UpdateChannelDto {
  @IsString() @IsOptional() @MaxLength(100) name?: string;
  @IsString() @IsOptional() @MaxLength(100) @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'Le slug doit contenir uniquement des lettres minuscules, chiffres et tirets' }) slug?: string;
  @IsString() @IsOptional() @MaxLength(2048) hls_url?: string;
  @IsString() @IsOptional() @MaxLength(50) category?: string;
  @IsString() @IsOptional() @MaxLength(2048) logo_url?: string;
  @IsBoolean() @IsOptional() is_active?: boolean;
  @IsBoolean() @IsOptional() is_premium?: boolean;
  @IsInt() @IsOptional() @Min(0) sort_order?: number;
}

// ── PREMIUM CODES ────────────────────────────

export class GeneratePremiumCodesDto {
  @IsInt() @Min(1) @Max(100) count: number;
  @IsInt() @Min(1) @Max(365) duration_days: number;
}

// ── REPORTS ──────────────────────────────────

export class UpdateReportDto {
  @IsEnum(ReportStatus) status: ReportStatus;
  @IsString() @IsOptional() @MaxLength(500) admin_response?: string;
}

// ── USERS ────────────────────────────────────

export class BanUserDto {
  @IsString() @IsNotEmpty() @MaxLength(500) reason: string;
}

// ── MAINTENANCE ──────────────────────────────

export class MaintenanceDto {
  @IsBoolean() active: boolean;
  @IsString() @IsOptional() @MaxLength(500) reason?: string;
}

// ── NEWS ─────────────────────────────────────

export class CreateNewsDto {
  @IsString() @IsNotEmpty() @MaxLength(200) title: string;
  @IsString() @IsNotEmpty() @MaxLength(50000) content: string;
  @IsString() @IsOptional() @MaxLength(2048) image_url?: string;
}

export class UpdateNewsDto {
  @IsString() @IsOptional() @MaxLength(200) title?: string;
  @IsString() @IsOptional() @MaxLength(50000) content?: string;
  @IsString() @IsOptional() @MaxLength(2048) image_url?: string;
}

// ── CHANNEL SOURCES ──────────────────────────

export class CreateChannelSourceDto {
  @IsString() @IsNotEmpty() @MaxLength(100) label: string;
  @IsString() @IsNotEmpty() @MaxLength(2048) hls_url: string;
  @IsBoolean() @IsOptional() is_premium?: boolean;
  @IsInt() @IsOptional() @Min(0) sort_order?: number;
  @IsBoolean() @IsOptional() is_active?: boolean;
}

export class UpdateChannelSourceDto {
  @IsString() @IsOptional() @MaxLength(100) label?: string;
  @IsString() @IsOptional() @MaxLength(2048) hls_url?: string;
  @IsBoolean() @IsOptional() is_premium?: boolean;
  @IsInt() @IsOptional() @Min(0) sort_order?: number;
  @IsBoolean() @IsOptional() is_active?: boolean;
}

// ── SETTINGS ─────────────────────────────────

export class UpdateSettingDto {
  @IsString() @IsNotEmpty() @MaxLength(5000) value: string;
}

// ── ADS ──────────────────────────────────────

export class CreateAdDto {
  @IsString() @IsNotEmpty() @MaxLength(200) name: string;
  @IsString() @IsNotEmpty() @IsUrl({}, { message: 'URL de publicité invalide' }) @MaxLength(2048) url: string;
  @IsBoolean() @IsOptional() is_active?: boolean;
}

export class UpdateAdDto {
  @IsString() @IsOptional() @MaxLength(200) name?: string;
  @IsString() @IsOptional() @IsUrl({}, { message: 'URL de publicité invalide' }) @MaxLength(2048) url?: string;
  @IsBoolean() @IsOptional() is_active?: boolean;
}
