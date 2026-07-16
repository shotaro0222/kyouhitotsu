export interface Env {
  KYOUHITOTSU_DATA: KVNamespace;
}

import bundledFlowerData from './data/flower.json';
import bundledFortuneData from './data/fortune.json';
import bundledMoonData from './data/moon.json';

type DailyEntry = {
  day: number;
  title: string;
  description: string;
  source: string;
};

function getTodayDayOfYearInJst(): number {
  const jstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
  const start = new Date(jstDate.getFullYear(), 0, 0);
  const diff = jstDate.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function getTodayData(allData: DailyEntry[]): DailyEntry | undefined {
  const dayOfYear = getTodayDayOfYearInJst();
  return allData.find((item) => item.day === dayOfYear);
}

function isDailyEntryArray(value: unknown): value is DailyEntry[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        typeof item === 'object' &&
        typeof (item as DailyEntry).day === 'number' &&
        typeof (item as DailyEntry).title === 'string' &&
        typeof (item as DailyEntry).description === 'string' &&
        typeof (item as DailyEntry).source === 'string'
    )
  );
}

function normalizeJsonArrayText(raw: string): string {
  let normalized = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').trim();

  if (!normalized.startsWith('[') && normalized.startsWith('{')) {
    normalized = `[\n${normalized}\n]`;
  }

  if (normalized.startsWith('[') && !normalized.endsWith(']')) {
    normalized = `${normalized}\n]`;
  }

  // 手編集で起こりやすい "}{" の境界を ",{" に補正
  normalized = normalized.replace(/}\s*{/g, '},\n{');
  normalized = normalized.replace(/,\s*]/g, ']');

  return normalized;
}

function parseDailyEntries(raw: string): { entries: DailyEntry[]; normalizedText: string; repaired: boolean } | null {
  const originalTrimmed = raw.trim();

  try {
    const parsed = JSON.parse(originalTrimmed) as unknown;
    if (!isDailyEntryArray(parsed)) {
      return null;
    }
    return { entries: parsed, normalizedText: originalTrimmed, repaired: false };
  } catch {
    const normalizedText = normalizeJsonArrayText(raw);
    try {
      const parsed = JSON.parse(normalizedText) as unknown;
      if (!isDailyEntryArray(parsed)) {
        return null;
      }
      return { entries: parsed, normalizedText, repaired: true };
    } catch {
      return null;
    }
  }
}

async function loadData(env: Env, key: string, bundledData: DailyEntry[], ctx: ExecutionContext): Promise<DailyEntry[]> {
  try {
    const kvData = await env.KYOUHITOTSU_DATA?.get(key);
    if (kvData) {
      const parsedResult = parseDailyEntries(kvData);
      if (parsedResult && parsedResult.entries.length > 0) {
        if (parsedResult.repaired) {
          // 読み込み時に壊れたJSONを自動修復してKVへ書き戻す
          ctx.waitUntil(env.KYOUHITOTSU_DATA.put(key, parsedResult.normalizedText));
        }
        return parsedResult.entries;
      }
    }
  } catch {
    // KVのキー未投入/解析失敗時は同梱JSONにフォールバック
  }

  return bundledData;
}

const endpointConfig: Record<string, { title: string; kvKey: string; bundledData: DailyEntry[] }> = {
  flower: {
    title: '今日の花',
    kvKey: 'flower',
    bundledData: bundledFlowerData as DailyEntry[],
  },
  fortune: {
    title: '今日の運勢',
    kvKey: 'fortune',
    bundledData: bundledFortuneData as DailyEntry[],
  },
  moon: {
    title: '今日の月',
    kvKey: 'moon',
    bundledData: bundledMoonData as DailyEntry[],
  },
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/(flower|fortune|moon)$/);
    if (match) {
      const key = match[1];
      const config = endpointConfig[key];
      try {
        const allData = await loadData(env, config.kvKey, config.bundledData, ctx);
        const todayData = getTodayData(allData);
        if (!todayData) {
          return new Response(JSON.stringify({ error: '該当なし' }), { status: 404, headers: corsHeaders });
        }
        return new Response(
          JSON.stringify({
            ...todayData,
            typeTitle: config.title,
          }),
          { status: 200, headers: corsHeaders }
        );
      } catch {
        return new Response(JSON.stringify({ error: '解析失敗' }), { status: 500, headers: corsHeaders });
      }
    }
    return new Response('Not Found', { status: 404 });
  },
};