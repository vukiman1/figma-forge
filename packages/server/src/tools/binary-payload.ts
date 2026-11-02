export interface BinaryCarrier {
  base64?: string | null | undefined;
  bytes?: Uint8Array | undefined;
}

export const binaryPayload = (carrier: BinaryCarrier): Buffer | null => {
  if (carrier.bytes !== undefined) return Buffer.from(carrier.bytes);
  const base64 = carrier.base64;
  return base64 === undefined || base64 === null ? null : Buffer.from(base64, 'base64');
};
