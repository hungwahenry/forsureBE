// Opaque cursor for backwards-in-time message pagination.
// Format: base64(`${createdAtMs}:${messageId}`).

export interface MessageCursor {
  createdAtMs: number;
  id: string;
}

export function encodeMessageCursor(c: MessageCursor): string {
  return Buffer.from(`${c.createdAtMs}:${c.id}`, 'utf8').toString('base64url');
}

export function decodeMessageCursor(raw: string): MessageCursor | null {
  try {
    const decoded = Buffer.from(raw, 'base64url').toString('utf8');
    const idx = decoded.indexOf(':');
    if (idx <= 0) return null;
    const createdAtMs = Number(decoded.slice(0, idx));
    const id = decoded.slice(idx + 1);
    if (!Number.isFinite(createdAtMs) || !id) return null;
    return { createdAtMs, id };
  } catch {
    return null;
  }
}
