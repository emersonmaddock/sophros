import * as SecureStore from 'expo-secure-store';
import type { Direction } from './types';

const DIRECTIONS: ReadonlySet<Direction> = new Set(['off', 'read', 'readWrite']);

function keyFor(userId: string): string {
  return `healthkit.direction.${userId}`;
}

export async function loadDirection(userId: string): Promise<Direction> {
  const raw = await SecureStore.getItemAsync(keyFor(userId));
  if (raw && DIRECTIONS.has(raw as Direction)) return raw as Direction;
  return 'off';
}

export async function saveDirection(userId: string, direction: Direction): Promise<void> {
  await SecureStore.setItemAsync(keyFor(userId), direction);
}

export async function clearDirection(userId: string): Promise<void> {
  await SecureStore.deleteItemAsync(keyFor(userId));
}
