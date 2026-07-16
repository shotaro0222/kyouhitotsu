export interface Env {
  KYOUHITOTSU_DATA: KVNamespace;
}

import bundledDataMap from './data/generated';

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
  // 配列の結合ミス "...][..." を1つの配列として補正
  normalized = normalized.replace(/]\s*\[/g, ',');
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

function buildTypeTitle(key: string): string {
  const knownTitles: Record<string, string> = {
    flower: '今日の花',
    fortune: '今日の運勢',
    moon: '今日の月',
    stone: '今日の石',
    color: '今日の色',
  };
  return knownTitles[key] ?? `今日の${key}`;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    const url = new URL(request.url);
    const match = url.pathname.match(/^\/api\/([a-z0-9_-]+)$/i);
    if (match) {
      const key = match[1].toLowerCase();
      const bundledData = bundledDataMap[key as keyof typeof bundledDataMap] as DailyEntry[] | undefined;
      if (!bundledData) {
        return new Response(JSON.stringify({ error: '作品が見つかりません' }), { status: 404, headers: corsHeaders });
      }

      try {
        const allData = await loadData(env, key, bundledData, ctx);
        const todayData = getTodayData(allData);
        if (!todayData) {
          return new Response(JSON.stringify({ error: '該当なし' }), { status: 404, headers: corsHeaders });
        }
        return new Response(
          JSON.stringify({
            ...todayData,
            typeTitle: buildTypeTitle(key),
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