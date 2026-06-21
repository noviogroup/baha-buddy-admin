#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';

const REQUIRED_TABLES = {
  communication_events: ['id', 'user_id', 'type', 'category', 'title', 'body', 'channels', 'idempotency_key', 'status'],
  communication_deliveries: ['id', 'event_id', 'user_id', 'channel', 'status', 'provider', 'target', 'attempted_at'],
};

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
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || fileEnv.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fileEnv.SUPABASE_SERVICE_ROLE_KEY;
const internalSecret = process.env.INTERNAL_API_SECRET || fileEnv.INTERNAL_API_SECRET;

let failed = false;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
  failed = true;
}

if (!internalSecret) {
  console.error('INTERNAL_API_SECRET: missing. Admin email resend will be disabled.');
  failed = true;
} else {
  console.log('INTERNAL_API_SECRET: present');
}

if (supabaseUrl && serviceRoleKey) {
  for (const [table, columns] of Object.entries(REQUIRED_TABLES)) {
    const url = new URL(`/rest/v1/${table}`, supabaseUrl);
    url.searchParams.set('select', columns.join(','));
    url.searchParams.set('limit', '1');

    const response = await fetch(url, {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    });

    if (!response.ok) {
      failed = true;
      const body = await response.text();
      console.error(`${table}: ${response.status} ${response.statusText}`);
      console.error(body);
    } else {
      console.log(`${table}: OK`);
    }
  }

  if (internalSecret) {
    const functionResponse = await fetch(`${supabaseUrl}/functions/v1/send-communication`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
        'x-internal-secret': internalSecret,
      },
      body: JSON.stringify({}),
    });
    const body = await functionResponse.text();
    if (functionResponse.status === 400 && body.includes('user_id is required')) {
      console.log('send-communication function: reachable');
    } else {
      failed = true;
      console.error(`send-communication function: unexpected ${functionResponse.status}`);
      console.error(body);
    }
  }
}

if (failed) {
  console.error('Admin communications readiness check failed.');
  process.exit(1);
}

console.log('Admin communications readiness verified.');
