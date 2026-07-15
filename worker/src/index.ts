export interface Env {
  // wrangler.toml で設定した binding 名と一致させます
  KYOUHITOTSU_DATA: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // どの画面からでもAPIを叩けるようにCORSヘッダーを用意
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json; charset=utf-8',
    };

    // エンドポイント: /api/flower
    if (url.pathname === '/api/flower') {
      // 1. KVから365日分のデータを一括取得
      const kvData = await env.KYOUHITOTSU_DATA.get('flower');

      if (!kvData) {
        return new Response(JSON.stringify({ error: 'データが見つかりません' }), {
          status: 404,
          headers: corsHeaders
        });
      }

      try {
        // 文字列(JSON)をJavaScriptのオブジェクトに変換
        const allData = JSON.parse(kvData);

        // 2. 日本時間で「今日の日付」を取得 (例: "07-15")
        const today = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        const dateKey = `${month}-${day}`; 

        // 3. 365日分のデータから「今日」のデータを抽出
        // ※ JSONが { "07-15": { "name": "ひまわり", ... } } という構造であることを想定しています
        const todayData = allData[dateKey];

        if (!todayData) {
          return new Response(JSON.stringify({ error: '今日のデータがありません' }), {
            status: 404,
            headers: corsHeaders
          });
        }

        // 4. 今日のデータだけを返す
        return new Response(JSON.stringify(todayData), {
          status: 200,
          headers: corsHeaders
        });

      } catch (error) {
        return new Response(JSON.stringify({ error: 'データの解析に失敗しました' }), {
          status: 500,
          headers: corsHeaders
        });
      }
    }

    // 存在しないURLへのアクセス
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: corsHeaders
    });
  },
};