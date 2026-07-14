document.addEventListener('DOMContentLoaded', async () => {
    // 1. URLから id を取得する（例: ?id=flower）
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    // 画面の文字を書き換えるための要素を取得
    const titleEl = document.getElementById('type-title');
    const nameEl = document.getElementById('main-name');
    const messageEl = document.getElementById('message-text');

    // IDがない場合の処理
    if (!id) {
        nameEl.textContent = '作品が見つかりません';
        messageEl.textContent = 'QRコードまたはNFCタグから正しいURLでアクセスしてください。';
        return;
    }

    try {
        // 2. 作成したAPIからデータを取得する
        // encodeURIComponentを使用してIDをサニタイズ（安全性の向上）
        const apiUrl = `https://kyouhitotsu.kyouhitotsu-dev.workers.dev/api/today?id=${encodeURIComponent(id)}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('データの取得に失敗しました');
        }

        // JSONデータをJavaScriptで使える形式に変換
        const data = await response.json();

        // 3. 画面のテキストをデータの中身に書き換える
        titleEl.textContent = data.title;     // "今日の花"
        nameEl.textContent = data.name;       // "ひまわり"
        messageEl.textContent = data.message; // "あなたらしく咲く日です"

        // 4. ブラウザタブのタイトルも動的に変更する
        document.title = `${data.name} | きょうひとつ`;

        // 5. アニメーションを付与してふわっと表示させる
        // （テキストが書き換わった瞬間にクラスを追加してアニメーションを開始）
        titleEl.classList.add('fade-in');
        nameEl.classList.add('fade-in');
        messageEl.classList.add('fade-in');

    } catch (error) {
        // エラー時の表示
        nameEl.textContent = '読み込みエラー';
        messageEl.textContent = 'データが見つからないか、通信に失敗しました。';
    }
});