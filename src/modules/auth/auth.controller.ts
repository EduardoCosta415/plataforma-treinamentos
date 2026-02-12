import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';

import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { StudentLoginDto } from './dto/student-login.dto';
import { StudentChangePasswordDto } from './dto/student-change-password.dto';
import { StudentRegisterDto } from './dto/student-register.dto';

@ApiTags('Autenticação')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  // ✅ ADMIN
  @Post('login')
  @ApiOperation({ summary: 'Login para administradores' })
  @ApiResponse({
    status: 201,
    description: 'Login bem-sucedido, retorna o token de acesso.',
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.email, dto.password);
  }

  // ✅ ALUNO (email + senha)
  @Post('student/login')
  @ApiOperation({ summary: 'Login para estudantes' })
  @ApiResponse({
    status: 201,
    description: 'Login bem-sucedido, retorna o token de acesso.',
  })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas.' })
  loginStudent(@Body() dto: StudentLoginDto) {
    return this.auth.loginStudent(dto.email, dto.password);
  }

  // ✅ ALUNO (cadastro via Landing) + autologin
  @Post('student/register')
  @ApiOperation({ summary: 'Cadastro para estudantes (Landing) + autologin' })
  @ApiResponse({
    status: 201,
    description: 'Cadastro bem-sucedido, retorna token de acesso.',
  })
  @ApiResponse({
    status: 400,
    description: 'Dados inválidos, email/CPF já cadastrado ou empresa inválida.',
  })
  registerStudent(@Body() dto: StudentRegisterDto) {
    return this.auth.registerStudent(dto);
  }

  // ✅ ALUNO troca senha (JWT)
  @UseGuards(AuthGuard('jwt'))
  @ApiBearerAuth()
  @Post('student/change-password')
  @ApiOperation({ summary: 'Estudante altera sua própria senha' })
  @ApiResponse({ status: 201, description: 'Senha alterada com sucesso.' })
  @ApiResponse({ status: 401, description: 'Não autorizado.' })
  @ApiResponse({
    status: 403,
    description: 'Acesso negado. Rota apenas para estudantes.',
  })
  changeStudentPassword(@Req() req: any, @Body() dto: StudentChangePasswordDto) {
    if (req.user?.role !== 'STUDENT') {
      throw new ForbiddenException('Acesso negado');
    }

    return this.auth.changeStudentPassword(req.user.sub, dto.newPassword);
  }
}
