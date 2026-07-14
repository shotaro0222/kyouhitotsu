// KVのバインディング（接続名）を定義します
export interface Env {
  KYOUHITOTSU_KV: KVNamespace;
}

// CORS（別ドメインからのアクセス許可）用の共通ヘッダーを定義
const corsHeaders = {
  'Content-Type': 'application/json; charset=utf-8',
  'Access-Control-Allow-Origin': '*', // すべてのアクセス元を許可
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    
    // 【重要追加】ブラウザからの「OPTIONS」リクエスト（事前確認）にOKを返す
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders
      });
    }

    const url = new URL(request.url);

    // エンドポイントが /api/today の場合のみ処理する
    if (url.pathname === '/api/today') {
      // URLのクエリパラメータから id を取得 (?id=flower など)
      const id = url.searchParams.get('id');

      // IDが指定されていない場合はエラーを返す
      if (!id) {
        return new Response(JSON.stringify({ error: 'IDが指定されていません' }), {
          status: 400,
          headers: corsHeaders // エラー時にもCORSヘッダーを付与
        });
      }

      // KVからデータを取得 (キーのフォーマットは "item:xxx" と想定)
      const kvKey = `item:${id}`;
      const kvData = await env.KYOUHITOTSU_KV.get(kvKey);

      // KVにデータが見つからない場合
      if (!kvData) {
        return new Response(JSON.stringify({ error: 'データが見つかりません' }), {
          status: 404,
          headers: corsHeaders // エラー時にもCORSヘッダーを付与
        });
      }

      // 取得したデータ(JSON文字列を想定)をそのまま返す
      return new Response(kvData, {
        status: 200,
        headers: corsHeaders // 成功時にもCORSヘッダーを付与
      });
    }

    // 存在しないURLへのアクセス
    return new Response(JSON.stringify({ error: 'Not Found' }), {
      status: 404,
      headers: corsHeaders // エラー時にもCORSヘッダーを付与
    });
  },
};