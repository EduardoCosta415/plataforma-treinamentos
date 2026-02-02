import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Controller('me')
export class AuthTestController {
  @UseGuards(AuthGuard('jwt'))
  @Get()
  me(@Req() req: any) {
    return req.user;
  }
}
