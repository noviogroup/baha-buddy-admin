/**
 * bahamas.com → Supabase + Airtable image scraper
 *
 * Phase 1: Scrapes hero images for 16 Bahamas islands from bahamas.com CDN,
 * uploads to Supabase place-gallery bucket, inserts place_photos rows,
 * and attaches images to Airtable Islands records.
 *
 * Usage: node scraper.js
 * Requires: SUPABASE_SERVICE_KEY and AIRTABLE_API_KEY env vars (or set inline below)
 */

'use strict';

const puppeteer = require('puppeteer-core');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

// ─────────────────────────────────────────────
// CONFIG (read from env or fallback to hardcoded for local admin use)
// ─────────────────────────────────────────────
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://cxcfymhoncysyloutvkh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN4Y2Z5bWhvbmN5c3lsb3V0dmtoIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MTE3MDM1NSwiZXhwIjoyMDY2NzQ2MzU1fQ.YgcPHEgpXYLe1cTzK7DTMnZjSAlrBacadN4mllN8cN8';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY || '';
const AIRTABLE_BASE_ID = 'appTZubz6FdnaEQ8h';
const AIRTABLE_ISLANDS_TABLE = 'tblAOzJFQRTJxUbhC';
const AIRTABLE_ISLAND_IMAGE_FIELD = 'fldQWrSUo6zMxrpeO';
const CHROME_PATH = process.env.CHROME_PATH ||
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const RATE_LIMIT_MS = 2000;
const BUCKET = 'place-gallery';
const TMP_DIR = path.join(__dirname, '.tmp');

// ─────────────────────────────────────────────
// ISLAND MANIFEST
// Maps bahamas.com slug → Supabase island ID + Airtable record ID
// Airtable record IDs: only for records missing an Island Image
// ─────────────────────────────────────────────
const ALL_ISLANDS = [
  {
    name: 'Nassau & Paradise Island',
    slug: 'nassau-and-paradise-island',
    supabaseId: 'f8a11b33-f212-4bcc-bf41-ee01fb312eb1',
    airtableId: null, // already has image: recLpWHN0t4FGj2Sa
  },
  {
    name: 'The Abacos',
    slug: 'abaco',
    supabaseId: '3e7f2ef9-4f6e-4a3a-aee4-15496c7ed196',
    airtableId: 'recqp3NrOpYrFKmGf', // Abaco — missing image
  },
  {
    name: 'Acklins & Crooked Island',
    slug: 'acklins-and-crooked-island',
    supabaseId: '5fa1e8c2-8b01-45bd-8df7-8ad098322d05',
    airtableId: null, // not in Airtable Islands
  },
  {
    name: 'Andros',
    slug: 'andros',
    supabaseId: '36583422-a250-49b4-8e2b-15dacae27ac0',
    airtableId: 'recwyl0zewU3my4OJ', // missing image
  },
  {
    name: 'The Berry Islands',
    slug: 'berry-islands',
    supabaseId: 'db4a7dce-2420-4303-a139-e87d4549073c',
    airtableId: null,
  },
  {
    name: 'Bimini',
    slug: 'bimini',
    supabaseId: 'ff5a27be-df41-4a65-b645-8619b49ce32c',
    airtableId: 'rec7maDjHGcNUpACw', // missing image
  },
  {
    name: 'Cat Island',
    slug: 'cat-island',
    supabaseId: '4e459aa1-7d13-4a4f-b0e9-8c63793a8b5f',
    airtableId: 'recV9qwOubA2Dpt82', // missing image
  },
  {
    name: 'Eleuthera & Harbour Island',
    slug: 'eleuthera',
    supabaseId: 'b00c524a-2718-40ad-9573-80e57a315349',
    airtableId: null, // already has image: recjOn3FoFTDwD8o4 (Eleuthera) + recb7hmHpajRpakqy (Harbour Island)
  },
  {
    name: 'The Exumas',
    slug: 'exuma',
    supabaseId: '9936a4eb-7009-4080-8e99-627edc6524f3',
    airtableId: null, // already has image: rec8IWLZT8rbpTV1J
  },
  {
    name: 'Freeport — Grand Bahama Island',
    slug: 'grand-bahama',
    supabaseId: 'fcddbe92-2229-41f7-a809-ed512f54e793',
    airtableId: null, // already has image: recbbZYiI02u3bYkT
  },
  {
    name: 'Inagua',
    slug: 'inagua',
    supabaseId: '03b9e5e3-79ee-4147-b1f1-b6bbde3fa67d',
    airtableId: null,
  },
  {
    name: 'Long Island',
    slug: 'long-island',
    supabaseId: '88d36cc3-d321-4195-ad1f-f13e133e675a',
    airtableId: 'recIzeVw2rmm6K2VY', // missing image
  },
  {
    name: 'Mayaguana',
    slug: 'mayaguana',
    supabaseId: '5303784e-100d-4bab-989e-b99d8b866a04',
    airtableId: null,
  },
  {
    name: 'Ragged Island',
    slug: 'ragged-island',
    supabaseId: 'fd6b37ca-b50f-47aa-a4af-983bc4e8fbc3',
    airtableId: null,
  },
  {
    name: 'Rum Cay',
    slug: 'rum-cay',
    supabaseId: '01315b7e-2ef9-470c-9ecd-5b2ecb2377ae',
    airtableId: null,
  },
  {
    name: 'San Salvador',
    slug: 'san-salvador',
    supabaseId: 'ccd6d312-e7e0-455f-ad2b-156a57471c6f',
    airtableId: 'recLdmeMDAzKpf4Wi', // missing image
  },
];

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function downloadUrl(url) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const lib = url.startsWith('https') ? https : http;
    lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 BahaBuddy-Scraper/1.0' } }, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        return downloadUrl(res.headers.location).then(resolve).catch(reject);
      }
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

async function supabaseRequest(method, path, body, contentType = 'application/json') {
  const url = `${SUPABASE_URL}${path}`;
  const opts = {
    method,
    headers: {
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
      'Content-Type': contentType,
    },
  };
  if (body) {
    if (Buffer.isBuffer(body)) {
      opts.body = body;
    } else {
      opts.body = JSON.stringify(body);
    }
  }

  const res = await fetch(url, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase ${method} ${path} → ${res.status}: ${text}`);
  }
  const ct = res.headers.get('content-type') || '';
  if (ct.includes('application/json')) return res.json();
  return res.text();
}

async function airtableRequest(method, path, body) {
  if (!AIRTABLE_API_KEY) throw new Error('AIRTABLE_API_KEY not set');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${path}`;
  const res = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Airtable ${method} ${path} → ${res.status}: ${text}`);
  }
  return res.json();
}

async function uploadToSupabase(imageBuffer, storagePath, mimeType = 'image/jpeg') {
  const ct = mimeType.includes('png') ? 'image/png' : mimeType.includes('webp') ? 'image/webp' : 'image/jpeg';
  await supabaseRequest(
    'POST',
    `/storage/v1/object/${BUCKET}/${storagePath}`,
    imageBuffer,
    ct
  );
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${storagePath}`;
}

async function checkExistingPhoto(supabaseIslandId) {
  const data = await supabaseRequest(
    'GET',
    `/rest/v1/place_photos?place_id=eq.${supabaseIslandId}&place_type=eq.island&source=eq.bahamas.com&select=id,url`
  );
  return Array.isArray(data) && data.length > 0 ? data[0] : null;
}

async function insertPlacePhoto(supabaseIslandId, publicUrl, islandName) {
  return supabaseRequest('POST', '/rest/v1/place_photos', {
    place_id: supabaseIslandId,
    place_type: 'island',
    url: publicUrl,
    thumbnail_url: publicUrl,
    caption: `${islandName} hero image`,
    source: 'bahamas.com',
    sort_order: 1,
  });
}

async function patchAirtableImage(recordId, publicUrl, filename) {
  return airtableRequest('PATCH', `${AIRTABLE_ISLANDS_TABLE}/${recordId}`, {
    fields: {
      [AIRTABLE_ISLAND_IMAGE_FIELD]: [{ url: publicUrl, filename }],
    },
  });
}

// ─────────────────────────────────────────────
// PUPPETEER: extract hero image URL from bahamas.com island page
// Uses response interception — DO NOT call setRequestInterception(false)
// just close the page when done.
// ─────────────────────────────────────────────
async function extractHeroImageUrl(page, islandSlug) {
  const targetUrl = `https://www.bahamas.com/islands/${islandSlug}`;
  console.log(`  → Navigating to ${targetUrl}`);

  // Collect tambourine CDN image URLs from network responses
  const imageUrls = new Set();
  await page.setRequestInterception(true);

  page.on('request', req => {
    try { req.continue(); } catch (_) {}
  });

  page.on('response', response => {
    const url = response.url();
    if (url.includes('tambourine.com') && /\.(jpg|jpeg|png|webp)/i.test(url)) {
      imageUrls.add(url);
    }
  });

  try {
    await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    // Give JS time to render images
    await sleep(5000);
  } catch (navErr) {
    // If navigation "times out" but page did partially load, try DOM extraction anyway
    if (!navErr.message.includes('net::ERR')) {
      console.log(`  ⚠️  Navigation soft-timeout, trying DOM extraction...`);
    } else {
      throw navErr;
    }
  }

  // Also extract from DOM (lazy-loaded or CSS background images)
  let domImages = [];
  try {
    domImages = await page.evaluate(() => {
      const found = new Set();

      // Standard img tags
      document.querySelectorAll('img').forEach(el => {
        [el.src, el.dataset.src, el.dataset.lazySrc].forEach(s => {
          if (s && s.includes('tambourine')) found.add(s);
        });
        // srcset
        if (el.srcset) {
          el.srcset.split(',').forEach(part => {
            const url = part.trim().split(' ')[0];
            if (url.includes('tambourine')) found.add(url);
          });
        }
      });

      // Picture sources
      document.querySelectorAll('source').forEach(el => {
        const srcset = el.srcset || el.dataset.srcset || '';
        srcset.split(',').forEach(part => {
          const url = part.trim().split(' ')[0];
          if (url.includes('tambourine')) found.add(url);
        });
      });

      // CSS background-image
      document.querySelectorAll('*').forEach(el => {
        const style = window.getComputedStyle(el);
        const bg = style.backgroundImage || '';
        if (bg.includes('tambourine')) {
          const match = bg.match(/url\(["']?([^"')]+tambourine[^"')]+)["']?\)/);
          if (match) found.add(match[1]);
        }
        // Also check inline style attribute
        const inlineStyle = el.getAttribute('style') || '';
        if (inlineStyle.includes('tambourine')) {
          const match2 = inlineStyle.match(/url\(["']?([^"')]+tambourine[^"')]+)["']?\)/);
          if (match2) found.add(match2[1]);
        }
      });

      return [...found];
    });
  } catch (domErr) {
    console.log(`  ⚠️  DOM extraction error: ${domErr.message}`);
  }

  const allFound = [...new Set([...imageUrls, ...domImages])];
  console.log(`  → Found ${allFound.length} CDN image URLs`);

  if (allFound.length === 0) return null;

  // Filter noise (fonts, icons, tiny thumbnails)
  const candidates = allFound.filter(u => {
    const lower = u.toLowerCase();
    return !lower.includes('/font') && !lower.includes('.ttf') &&
           !lower.includes('.woff') && !lower.includes('logo') &&
           !lower.includes('icon') && !lower.includes('favicon') &&
           /\.(jpg|jpeg|png|webp)/i.test(lower);
  });

  if (candidates.length === 0) return allFound[0];

  // Prefer largest-looking URL (some CDNs embed size in URL like /800x600/)
  // Sort: URLs with larger dimension numbers first, else just take first
  candidates.sort((a, b) => {
    const dimA = (a.match(/(\d{3,4})x(\d{3,4})/) || [0, 0, 0]).slice(1).reduce((x, y) => x * y, 1);
    const dimB = (b.match(/(\d{3,4})x(\d{3,4})/) || [0, 0, 0]).slice(1).reduce((x, y) => x * y, 1);
    return dimB - dimA;
  });

  return candidates[0];
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  console.log('🚀 bahamas.com → Supabase + Airtable scraper starting...\n');

  const browser = await puppeteer.launch({
    executablePath: CHROME_PATH,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  const results = { success: [], failed: [], skipped: [] };

  for (const island of ALL_ISLANDS) {
    console.log(`\n📍 Processing: ${island.name} (${island.slug})`);

    try {
      // Check if we already have a bahamas.com photo for this island
      const existing = await checkExistingPhoto(island.supabaseId);
      if (existing) {
        console.log(`  ✓ Already in place_photos: ${existing.url}`);
        results.skipped.push(island.name);
        continue;
      }

      // Launch page
      const page = await browser.newPage();
      await page.setViewport({ width: 1440, height: 900 });
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      const heroUrl = await extractHeroImageUrl(page, island.slug);
      await page.close();

      if (!heroUrl) {
        console.log(`  ⚠️  No hero image found for ${island.name}`);
        results.failed.push({ name: island.name, reason: 'No image found on page' });
        await sleep(RATE_LIMIT_MS);
        continue;
      }

      console.log(`  → Hero image URL: ${heroUrl.substring(0, 80)}...`);

      // Download image
      const imageBuffer = await downloadUrl(heroUrl);
      const ext = (heroUrl.match(/\.(jpg|jpeg|png|webp)/i) || ['', 'jpg'])[1].toLowerCase();
      const mimeType = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';

      console.log(`  → Downloaded ${imageBuffer.length} bytes`);

      // Upload to Supabase storage
      const storagePath = `bahamas-com/islands/${island.slug}/hero.${ext}`;
      const publicUrl = await uploadToSupabase(imageBuffer, storagePath, mimeType);
      console.log(`  ✓ Uploaded to Supabase: ${publicUrl}`);

      // Insert into place_photos
      await insertPlacePhoto(island.supabaseId, publicUrl, island.name);
      console.log(`  ✓ Inserted into place_photos`);

      // Update Airtable if needed
      if (island.airtableId && AIRTABLE_API_KEY) {
        await patchAirtableImage(island.airtableId, publicUrl, `${island.slug}-hero.${ext}`);
        console.log(`  ✓ Updated Airtable record ${island.airtableId}`);
      } else if (island.airtableId && !AIRTABLE_API_KEY) {
        console.log(`  ⚠️  Airtable update skipped — AIRTABLE_API_KEY not set. URL: ${publicUrl}`);
      }

      results.success.push({ name: island.name, url: publicUrl });

    } catch (err) {
      console.error(`  ✗ Error: ${err.message}`);
      results.failed.push({ name: island.name, reason: err.message });
    }

    await sleep(RATE_LIMIT_MS);
  }

  await browser.close();

  console.log('\n─────────────────────────────────────────');
  console.log('RESULTS:');
  console.log(`  ✓ Success:  ${results.success.length} islands`);
  console.log(`  ✓ Skipped:  ${results.skipped.length} islands (already in DB)`);
  console.log(`  ✗ Failed:   ${results.failed.length} islands`);

  if (results.success.length > 0) {
    console.log('\nSuccessfully processed:');
    results.success.forEach(r => console.log(`  • ${r.name}: ${r.url}`));
  }
  if (results.failed.length > 0) {
    console.log('\nFailed:');
    results.failed.forEach(r => console.log(`  • ${r.name}: ${r.reason}`));
  }

  const reportPath = path.join(__dirname, 'scrape-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\nFull report: ${reportPath}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
