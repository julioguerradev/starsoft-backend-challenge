import { applyDecorators } from '@nestjs/common';

/**
 * Decorator customizado para padronizar respostas da API
 * Pode ser expandido para incluir documentação Swagger no futuro
 */
export function ApiResponse(_options: {
  status: number;
  description: string;
  type?: unknown;
}) {
  return applyDecorators();
}

/**
 * Decorator para respostas de sucesso
 */
export function ApiSuccessResponse(
  description: string = 'Operação realizada com sucesso',
) {
  return ApiResponse({ status: 200, description });
}

/**
 * Decorator para respostas de criação
 */
export function ApiCreatedResponse(
  description: string = 'Recurso criado com sucesso',
) {
  return ApiResponse({ status: 201, description });
}

/**
 * Decorator para respostas de erro
 */
export function ApiErrorResponse(
  description: string = 'Erro ao processar requisição',
) {
  return ApiResponse({ status: 400, description });
}
