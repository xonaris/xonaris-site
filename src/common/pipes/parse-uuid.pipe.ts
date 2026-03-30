import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validates that a parameter is a valid UUID v4 string.
 * Use as: @Param('id', ParseUuidPipe) id: string
 */
@Injectable()
export class ParseUuidPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    if (!UUID_REGEX.test(value)) {
      throw new BadRequestException('Identifiant invalide : format UUID attendu');
    }
    return value;
  }
}
