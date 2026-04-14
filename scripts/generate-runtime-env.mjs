import { config as loadDotEnv } from 'dotenv';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

loadDotEnv({ path: resolve('.env') });

const apiBaseUrlRaw = process.env.API_BASE_URL ?? '';
const apiBaseUrl = (apiBaseUrlRaw.trim() || '').replace(/\/+$/, '');

const outputPath = resolve('src/app/config/runtime-env.ts');
mkdirSync(dirname(outputPath), { recursive: true });

const content = `export const runtimeEnv = {
  apiBaseUrl: '${apiBaseUrl}',
} as const;
`;

writeFileSync(outputPath, content, { encoding: 'utf8' });
console.log(`runtime-env generated: ${outputPath}`);
