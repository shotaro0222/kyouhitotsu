async function loadContent(id) {
    const titleEl = document.getElementById('type-title');
    const nameEl = document.getElementById('main-name');
    const messageEl = document.getElementById('message-text');

    try {
        const apiUrl = `/api/${id}`;
        const response = await fetch(apiUrl);

        if (!response.ok) {
            throw new Error('データの取得に失敗しました');
        }

        const data = await response.json();

        titleEl.textContent = data.typeTitle ?? 'きょうひとつ';
        nameEl.textContent = data.title;          // 例: "今日の花言葉"
        messageEl.textContent = data.description; // 例: "クリスマス・ローズの花言葉は..."

    } catch (error) {
        nameEl.textContent = '読み込みエラー';
        messageEl.textContent = '本日のデータが見つからないか、通信に失敗しました。';
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    const urlParams = new URLSearchParams(window.location.search);
    let id = urlParams.get('id');

    const titleEl = document.getElementById('type-title');
    const nameEl = document.getElementById('main-name');
    const messageEl = document.getElementById('message-text');

    if (!id) {
        nameEl.textContent = '作品が見つかりません';
        messageEl.textContent = 'QRコードから正しいURLでアクセスしてください。';
        return;
    }

    // state に id を保存して、popstate イベントで復元可能にする
    const initialState = { id, timestamp: Date.now() };
    history.replaceState(initialState, '', window.location.pathname);

    await loadContent(id);
});

// ブラウザの戻るボタンで URL が戻された時、保存された id から内容を復元
window.addEventListener('popstate', async (event) => {
    if (event.state && event.state.id) {
        const id = event.state.id;
        await loadContent(id);
    }
});