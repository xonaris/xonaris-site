import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class GetAdDto {
  @IsString() @IsNotEmpty() @IsUUID() channel_id: string;
}

export class ValidateAdDto {
  @IsString() @IsNotEmpty() @IsUUID() channel_id: string;
  @IsString() @IsNotEmpty() nonce: string;
}
