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

async function loadData(env: Env, key: string, bundledData: DailyEntry[]): Promise<DailyEntry[]> {
  try {
    const kvData = await env.KYOUHITOTSU_DATA?.get(key);
    if (kvData) {
      const parsed = JSON.parse(kvData) as DailyEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
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
        const allData = await loadData(env, config.kvKey, config.bundledData);
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