import { BadRequestException, ValidationPipe } from '@nestjs/common';

export function createValidationPipe(): ValidationPipe {
  return new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
    exceptionFactory: (errors) => new BadRequestException({
      code: 'VALIDATION_ERROR',
      details: errors.map((error) => ({
        field: error.property.slice(0, 64),
        message: Object.values(error.constraints ?? {})[0] ?? 'Invalid value',
      })),
    }),
  });
}
