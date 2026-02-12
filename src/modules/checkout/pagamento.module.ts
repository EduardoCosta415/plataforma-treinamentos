import { Module } from '@nestjs/common';
import { PrismaModule } from '../../infra/prisma/prisma.module';
import { CheckoutDevController } from './checkout.dev.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CheckoutDevController],
})
export class CheckoutModule {}
