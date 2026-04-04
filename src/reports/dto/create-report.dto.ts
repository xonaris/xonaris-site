import { IsString, IsUUID, IsNotEmpty, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsString()
  @IsUUID()
  channel_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
