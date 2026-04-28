import { v7 as uuidv7 } from 'uuid';

/**
 * Generate a prefixed, time-sortable ID.
 *
 * @example
 *   createId('usr') // 'usr_01913f4d6e8a7c1eb8d3a4c2f5a1e9b7'
 *   createId('act') // 'act_01913f4d6e8a7c1eb8d3a4c2f5a1e9b7'
 *
 * The body is a UUIDv7 with dashes stripped — sortable by creation time, safe
 * to use as a Postgres primary key, and instantly recognisable in logs.
 */
export function createId(prefix: string): string {
  return `${prefix}_${uuidv7().replace(/-/g, '')}`;
}
