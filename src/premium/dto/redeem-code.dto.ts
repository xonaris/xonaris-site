import { IsString, IsNotEmpty, Matches } from 'class-validator';

export class RedeemCodeDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/^XONA-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, {
    message: 'Format de code invalide (attendu: XONA-XXXX-XXXX-XXXX)',
  })
  code: string;
}
