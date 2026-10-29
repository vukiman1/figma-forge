import { z } from 'zod';

const baseFields = {
  v: z.string(),
  id: z.string(),
  ts: z.number(),
  sessionId: z.string(),
};

export const RequestEnvelopeSchema = z.object({
  ...baseFields,
  kind: z.literal('req'),
  method: z.string(),
  params: z.unknown().optional(),
});

export const ResponseEnvelopeSchema = z.object({
  ...baseFields,
  kind: z.literal('res'),
  result: z.unknown().optional(),
});

export const ErrorEnvelopeSchema = z.object({
  ...baseFields,
  kind: z.literal('err'),
  error: z.object({
    code: z.string(),
    message: z.string(),
    data: z.unknown().optional(),
  }),
});

export const EventEnvelopeSchema = z.object({
  ...baseFields,
  kind: z.literal('evt'),
  method: z.string(),
  params: z.unknown().optional(),
});

export const EnvelopeSchema = z.discriminatedUnion('kind', [
  RequestEnvelopeSchema,
  ResponseEnvelopeSchema,
  ErrorEnvelopeSchema,
  EventEnvelopeSchema,
]);

export type RequestEnvelope = z.infer<typeof RequestEnvelopeSchema>;
export type ResponseEnvelope = z.infer<typeof ResponseEnvelopeSchema>;
export type ErrorEnvelope = z.infer<typeof ErrorEnvelopeSchema>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
export type Envelope = z.infer<typeof EnvelopeSchema>;
