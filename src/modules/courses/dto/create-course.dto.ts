import { IsOptional, IsString, MinLength, IsUrl } from 'class-validator';

/**
 * DTO = Data Transfer Object
 *
 * Define e valida o formato do BODY
 * recebido ao criar um curso.
 *
 * ✔ Segurança
 * ✔ Padronização
 * ✔ Clareza de contrato entre front e back
 */
export class CreateCourseDto {
  /**
   * Título do curso
   * Ex: "Angular Completo"
   */
  @IsString()
  @MinLength(3)
  title: string;

  /**
   * Descrição opcional do curso
   */
  @IsOptional()
  @IsString()
  description?: string;

  /**
   * URL da imagem de capa do curso
   * (usada para visualização no front)
   *
   * Por enquanto usamos URL externa.
   * No futuro isso pode virar upload.
   */
  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
