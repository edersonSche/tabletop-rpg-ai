import { PipeTransform, Injectable, BadRequestException, ArgumentMetadata } from '@nestjs/common';
import { ZodSchema } from 'zod';

// NestJS WebSocket decorators set numeric type values at runtime (despite Paramtype being strings):
// @ConnectedSocket() = 0, @MessageBody() = 3, @WsAck() = 13
// HTTP @Body() = 6. Only types 3 (WS PAYLOAD) and 6 (HTTP BODY) should be validated.
const BODY_TYPES = new Set([3, 6]);

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private schema?: ZodSchema) {}

  transform(value: unknown, metadata?: ArgumentMetadata) {
    if (!this.schema) return value;

    // Skip validation for non-body parameters (@ConnectedSocket, @WsAck, @Query, @Param, etc.)
    const type = metadata?.type as unknown as number | undefined;
    if (type !== undefined && !BODY_TYPES.has(type)) {
      return value;
    }

    const result = this.schema.safeParse(value);
    if (!result.success) {
      const message = result.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      throw new BadRequestException(message);
    }
    return result.data;
  }
}
