document.addEventListener('DOMContentLoaded', async () => {
    // URLからIDを取得 (例: ?id=flower)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');

    const titleEl = document.getElementById('type-title');
    const nameEl = document.getElementById('main-name');
    const messageEl = document.getElementById('message-text');

    if (!id) {
        nameEl.textContent = '作品が見つかりません';
        messageEl.textContent = 'QRコードから正しいURLでアクセスしてください。';
        return;
    }

    try {
        // 同じドメイン内のAPIを呼び出す (例: /api/flower)
        const apiUrl = `/api/${id}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('データの取得に失敗しました');
        }

        const data = await response.json();

        // 画面のテキストを書き換える
        // 今回のflower.jsonに合わせて表示
        titleEl.textContent = id === 'flower' ? '今日の花' : 'きょうひとつ';
        nameEl.textContent = data.name;       // 例: "ひまわり"
        messageEl.textContent = data.message; // 例: "あなたらしく咲く日です"

    } catch (error) {
        nameEl.textContent = '読み込みエラー';
        messageEl.textContent = '本日のデータが見つからないか、通信に失敗しました。';
    }
});