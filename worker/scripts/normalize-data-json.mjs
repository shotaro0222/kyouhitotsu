import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataDir = path.resolve(__dirname, '../src/data');

function normalizeJsonArrayText(raw) {
  let normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();

  if (!normalized.startsWith('[') && normalized.startsWith('{')) {
    normalized = `[\n${normalized}\n]`;
  }

  if (normalized.startsWith('[') && !normalized.endsWith(']')) {
    normalized = `${normalized}\n]`;
  }

  normalized = normalized.replace(/}\s*{/g, '},\n{');
  normalized = normalized.replace(/]\s*\[/g, ',');
  normalized = normalized.replace(/,\s*]/g, ']');

  return normalized;
}

function isDailyEntryArray(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof item.day === 'number' &&
        typeof item.title === 'string' &&
        typeof item.description === 'string' &&
        typeof item.source === 'string'
    )
  );
}

async function run() {
  const files = (await readdir(dataDir)).filter((name) => name.endsWith('.json'));

  let changed = 0;
  let skipped = 0;
  for (const file of files) {
    const filePath = path.join(dataDir, file);
    const original = await readFile(filePath, 'utf8');

    if (!original.trim()) {
      skipped += 1;
      console.warn(`[skip-empty] ${file}`);
      continue;
    }

    const normalized = normalizeJsonArrayText(original);

    let parsed;
    try {
      parsed = JSON.parse(normalized);
    } catch (error) {
      skipped += 1;
      console.warn(`[skip-invalid-json] ${file}: ${error.message}`);
      continue;
    }

    if (!isDailyEntryArray(parsed)) {
      skipped += 1;
      console.warn(`[skip-unsupported-schema] ${file}`);
      continue;
    }

    const formatted = `${JSON.stringify(parsed, null, 2)}\n`;
    if (formatted !== original) {
      await writeFile(filePath, formatted, 'utf8');
      changed += 1;
      console.log(`[normalized] ${file}`);
    } else {
      console.log(`[ok] ${file}`);
    }
  }

  console.log(`done: ${files.length} files checked, ${changed} files updated, ${skipped} files skipped`);
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
