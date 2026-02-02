import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class StudentChangePasswordDto {
  @ApiProperty({ description: 'Nova senha para o estudante', example: 'NovaSenha123!' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}