import { BadRequestException } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/** Valida `data` contra o schema Zod; 400 com detalhes em caso de erro. */
export function parse<S extends ZodTypeAny>(schema: S, data: unknown): z.output<S> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new BadRequestException({
      message: 'Dados inválidos',
      issues: result.error.flatten(),
    });
  }
  return result.data;
}
