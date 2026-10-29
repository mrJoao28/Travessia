import { All, Controller, Inject, Module, Req, Res, type DynamicModule } from '@nestjs/common';
import type { Request, Response } from 'express';

const PRODUCT_RUNTIME = Symbol('PRODUCT_RUNTIME');
export type ProductRuntime = { handle: (req: Request, res: Response) => Promise<void> };

@Controller('v1')
export class ApiController {
  constructor(@Inject(PRODUCT_RUNTIME) private readonly runtime: ProductRuntime) {}
  @All('{*path}')
  async handle(@Req() req: Request, @Res() res: Response) { await this.runtime.handle(req, res); }
}

@Module({})
export class AppModule {
  static register(runtime: ProductRuntime): DynamicModule {
    return { module: AppModule, controllers: [ApiController], providers: [{ provide: PRODUCT_RUNTIME, useValue: runtime }] };
  }
}
