export interface Env {
  KYOUHITOTSU_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    const url = new URL(request.url);
    if (url.pathname === '/api/flower') {
      const kvData = await env.KYOUHITOTSU_DATA.get('flower');
      if (!kvData) return new Response(JSON.stringify({ error: 'データなし' }), { status: 404, headers: corsHeaders });

      try {
        const allData = JSON.parse(kvData);
        // 日本時間で今日の日付を計算
        const jstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        const start = new Date(jstDate.getFullYear(), 0, 0);
        const diff = jstDate.getTime() - start.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

        // データのdayと一致するものを探す
        const todayData = allData.find((item: any) => item.day === dayOfYear);
        return new Response(JSON.stringify(todayData || { error: '該当なし' }), { status: 200, headers: corsHeaders });
      } catch (e) {
        return new Response(JSON.stringify({ error: '解析失敗' }), { status: 500, headers: corsHeaders });
      }
    }
    return new Response('Not Found', { status: 404 });
  },
};