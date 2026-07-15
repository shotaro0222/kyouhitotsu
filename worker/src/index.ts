export interface Env {
  KYOUHITOTSU_DATA: KVNamespace;
}

import bundledFlowerData from './data/flower.json';

type FlowerEntry = {
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

function getTodayFlowerData(allData: FlowerEntry[]): FlowerEntry | undefined {
  const dayOfYear = getTodayDayOfYearInJst();
  return allData.find((item) => item.day === dayOfYear);
}

async function loadFlowerData(env: Env): Promise<FlowerEntry[]> {
  try {
    const kvData = await env.KYOUHITOTSU_DATA?.get('flower');
    if (kvData) {
      const parsed = JSON.parse(kvData) as FlowerEntry[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // KVのキー未投入/解析失敗時は同梱JSONにフォールバック
  }

  return bundledFlowerData as FlowerEntry[];
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    const url = new URL(request.url);
    if (url.pathname === '/api/flower') {
      try {
        const allData = await loadFlowerData(env);
        const todayData = getTodayFlowerData(allData);
        if (!todayData) {
          return new Response(JSON.stringify({ error: '該当なし' }), { status: 404, headers: corsHeaders });
        }
        return new Response(JSON.stringify(todayData), { status: 200, headers: corsHeaders });
      } catch {
        return new Response(JSON.stringify({ error: '解析失敗' }), { status: 500, headers: corsHeaders });
      }
    }
    return new Response('Not Found', { status: 404 });
  },
};