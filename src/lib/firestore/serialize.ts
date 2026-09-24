import { Timestamp } from 'firebase/firestore';

/**
 * Recursively converts Firebase Firestore values (Timestamps, undefined) into
 * JSON-safe values (ISO strings / dropped keys) so documents can be typed.
 */
export function deserializeValue(value: unknown): unknown {
  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (Array.isArray(value)) {
    return value.map(deserializeValue);
  }
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      if (val === undefined) continue;
      out[key] = deserializeValue(val);
    }
    return out;
  }
  return value;
}

export function deserializeDoc<T>(doc: Record<string, unknown>): T {
  return deserializeValue(doc) as T;
}

/**
 * Prepares a partial object for writing to Firestore, dropping undefined
 * values and leaving Timestamps as-is.
 */
export function serializeValue(value: unknown): unknown {
  if (value === undefined) return undefined;
  if (Array.isArray(value)) {
    const arr = value.map(serializeValue).filter((v) => v !== undefined);
    return arr.length > 0 ? arr : [];
  }
  if (value && typeof value === 'object' && !(value instanceof Timestamp) && !(value instanceof Date)) {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      const cleaned = serializeValue(val);
      if (cleaned !== undefined) out[key] = cleaned;
    }
    return out;
  }
  return value;
}

export function serializeForWrite<T>(value: T): Record<string, unknown> {
  return serializeValue(value) as Record<string, unknown>;
}

export function toISODate(input: string | number | Date | Timestamp | undefined): string {
  if (!input) return new Date().toISOString();
  if (input instanceof Timestamp) return input.toDate().toISOString();
  if (input instanceof Date) return input.toISOString();
  return new Date(input).toISOString();
}