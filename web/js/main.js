document.addEventListener('DOMContentLoaded', async () => {
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
        const apiUrl = `/api/${id}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('データの取得に失敗しました');
        }

        const data = await response.json();

        // 実際のJSONフォーマット（title, description）に合わせて画面にセット
        titleEl.textContent = id === 'flower' ? '今日の花' : 'きょうひとつ';
        nameEl.textContent = data.title;          // 例: "今日の花言葉"
        messageEl.textContent = data.description; // 例: "クリスマス・ローズの花言葉は..."

    } catch (error) {
        nameEl.textContent = '読み込みエラー';
        messageEl.textContent = '本日のデータが見つからないか、通信に失敗しました。';
    }
});