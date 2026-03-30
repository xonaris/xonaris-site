import { IsString, IsNotEmpty, IsOptional, MaxLength, MinLength, Matches } from 'class-validator';

export class ValidateRegisterDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(20)
  @Matches(/^[a-zA-Z0-9_]+$/, { message: 'Lettres, chiffres et _ uniquement' })
  pseudo: string;

  @IsString()
  @IsNotEmpty()
  captcha_token: string;

  @IsString()
  @IsOptional()
  @MaxLength(20)
  ref?: string;
}

export class CheckPseudoDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(20)
  pseudo: string;
}

export class CheckReferralDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(20)
  code: string;
}
