import { Body, Controller, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { UserRole } from '@prisma/client';
import { CheckoutService } from './pagamento.service';
import { CreateCheckoutDto } from './dto/create.checkout.dto';

@Controller('checkout')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class CheckoutController {
  constructor(private readonly service: CheckoutService) {}

  @Post('orders')
  @Roles(UserRole.STUDENT)
  async create(@Req() req: any, @Body() dto: CreateCheckoutDto) {
    const user = req.user;

    if (!user?.sub) {
      throw new ForbiddenException('Usuário inválido');
    }

    return this.service.createOrder(
      user.sub,
      dto.courseIds,
      dto.billingType,
    );
  }
}
