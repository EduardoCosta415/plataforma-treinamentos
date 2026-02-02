import { Body, Controller, Post, Req, UseGuards, ForbiddenException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { StudentChangePasswordDto } from './dto/student-change-password.dto';

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  // ✅ ADMIN
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // ✅ ALUNO (email + senha)
  @Post('student/login')
  loginStudent(@Body() dto: StudentLoginDto) {
    return this.auth.loginStudent(dto.email, dto.password);
  }

  // ✅ ALUNO troca senha (JWT)
  @UseGuards(AuthGuard('jwt'))
  @Post('student/change-password')
  changeStudentPassword(@Req() req: any, @Body() dto: StudentChangePasswordDto) {
    if (req.user?.role !== 'STUDENT') {
      throw new ForbiddenException('Acesso negado');
    }

    return this.auth.changeStudentPassword(req.user.userId, dto.newPassword);
  }
}
