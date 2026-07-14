// KVのバインディング（接続名）を定義します
// ※ wrangler.jsonc で設定した binding 名（例: KYOUHITOTSU_KV）に書き換えてください
export interface Env {
  KYOUHITOTSU_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // エンドポイントが /api/today の場合のみ処理する
    if (url.pathname === '/api/today') {
      // URLのクエリパラメータから id を取得 (?id=flower など)
      const id = url.searchParams.get('id');

      // IDが指定されていない場合はエラーを返す
      if (!id) {
        return new Response(JSON.stringify({ error: 'IDが指定されていません' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      // KVからデータを取得 (キーのフォーマットは "item:xxx" と想定)
      const kvKey = `item:${id}`;
      const kvData = await env.KYOUHITOTSU_KV.get(kvKey);

      // KVにデータが見つからない場合
      if (!kvData) {
        return new Response(JSON.stringify({ error: 'データが見つかりません' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json; charset=utf-8' }
        });
      }

      // 取得したデータ(JSON文字列を想定)をそのまま返す
      return new Response(kvData, {
        status: 200,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          // どこからでもAPIを叩けるようにCORSを設定（今後のWeb画面用）
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // 存在しないURLへのアクセス
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8' }
    });
  },
};