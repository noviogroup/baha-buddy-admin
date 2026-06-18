#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_COLUMNS = [
  'address',
  'description',
  'property_type',
  'gallery_images',
  'amenities',
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const env = {};
  for (const line of fs.readFileSync(filePath, 'utf8').split(/\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    let value = trimmed.slice(idx + 1).trim();
    const first = value.charCodeAt(0);
    const last = value.charCodeAt(value.length - 1);
    if ((first === 34 && last === 34) || (first === 39 && last === 39)) {
      value = value.slice(1, -1);
    }
    env[key] = value;
  }
  return env;
}

const fileEnv = loadEnvFile(path.join(process.cwd(), '.env.local'));
const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. Run from Baha-Buddy-Admin or export both env vars.',
  );
  process.exit(2);
}

const url = new URL('/rest/v1/trip_accommodations', supabaseUrl);
url.searchParams.set('select', REQUIRED_COLUMNS.join(','));
url.searchParams.set('limit', '0');

const response = await fetch(url, {
  headers: {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
  },
});

if (!response.ok) {
  const body = await response.text();
  console.error(
    `trip_accommodations canonical stay columns are not ready. HTTP ${response.status}: ${body}`,
  );
  process.exit(1);
}

console.log(
  `trip_accommodations canonical stay columns verified: ${REQUIRED_COLUMNS.join(', ')}`,
);
