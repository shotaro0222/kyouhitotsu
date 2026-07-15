export interface Env {
  KYOUHITOTSU_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    if (url.pathname === '/api/flower') {
      const kvData = await env.KYOUHITOTSU_DATA.get('flower');

      if (!kvData) {
        return new Response(JSON.stringify({ error: 'データが見つかりません' }), { status: 404, headers: corsHeaders });
      }

      try {
        const allData = JSON.parse(kvData);

        // 日本時間での現在時刻を取得
        const jstString = new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' });
        const today = new Date(jstString);
        
        // 1月1日からの経過日数を計算（元旦＝1）
        const startOfYear = new Date(today.getFullYear(), 0, 0);
        const diff = today.getTime() - startOfYear.getTime();
        const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));

        // dayの数値が一致するデータを配列から検索
        const todayData = allData.find((item: any) => item.day === dayOfYear);

        if (!todayData) {
          return new Response(JSON.stringify({ error: '今日のデータがありません' }), { status: 404, headers: corsHeaders });
        }

        return new Response(JSON.stringify(todayData), { status: 200, headers: corsHeaders });

      } catch (error) {
        return new Response(JSON.stringify({ error: 'データの解析に失敗しました' }), { status: 500, headers: corsHeaders });
      }
    }

    return new Response(JSON.stringify({ error: 'Not Found' }), { status: 404, headers: corsHeaders });
  },
};