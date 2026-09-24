import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Loads KEY=VALUE pairs from `./.env.local` into process.env for Node scripts
 * (tsx), since Next.js only does this automatically for the app itself.
 */
export function loadEnv(path = '.env.local'): void {
  const envPath = resolve(process.cwd(), path);
  if (!existsSync(envPath)) {
    console.warn(`[loadEnv] ${envPath} not found; relying on existing process.env values.`);
    return;
  }
  const content = readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim();
    if (process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}