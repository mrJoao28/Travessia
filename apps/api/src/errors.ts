import { HttpException } from '@nestjs/common';
export function fail(status: number, code: string, message: string): never {
  throw new HttpException({ code, message }, status);
}
export const missing = (): never => fail(404, 'NOT_FOUND', 'Recurso indisponível.');
