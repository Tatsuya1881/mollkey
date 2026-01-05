let state = {
    teams: [], turn: 0, history: [], winners: 0
};

let wakeLock = null;

async function requestWakeLock() {
    try { if ('wakeLock' in navigator) wakeLock = await navigator.wakeLock.request('screen'); } catch (err) {}
}

function speak(text) {
    if ('speechSynthesis' in window) {
        const uttr = new SpeechSynthesisUtterance(text);
        uttr.lang = 'ja-JP';
        uttr.rate = 1.3;
        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(uttr);
    }
}

// ON/OFFボタンの切り替えイベント
document.querySelectorAll('.team-toggle-btn').forEach(btn => {
    btn.onclick = () => {
        btn.classList.toggle('active');
        const isActive = btn.classList.contains('active');
        btn.innerText = isActive ? "ON" : "OFF";
        
        const input = document.getElementById(`name-${btn.dataset.id}`);
        input.disabled = !isActive;
        input.style.opacity = isActive ? "1" : "0.5";
    };
});

// 開始ボタンの処理
document.getElementById('start-btn').onclick = async () => {
    // .activeクラスを持つボタンのみを抽出
    const activeBtns = document.querySelectorAll('.team-toggle-btn.active');
    
    state.teams = Array.from(activeBtns).map(btn => {
        const id = btn.dataset.id;
        return {
            name: document.getElementById(`name-${id}`).value,
            score: 0, misses: 0, rank: 0
        };
    });

    if (state.teams.length === 0) {
        alert('チームを1つ以上ONにしてください');
        return;
    }

    await requestWakeLock();
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
    // キーパッド生成
    const pad = document.getElementById('num-pad');
    pad.innerHTML = ''; 
    for (let i = 1; i <= 12; i++) {
        const b = document.createElement('button');
        b.innerText = i;
        b.onclick = () => addScore(i);
        pad.appendChild(b);
    }
    render();
};

function addScore(p) {
    state.history.push(JSON.stringify({teams: state.teams, turn: state.turn, winners: state.winners}));
    
    let t = state.teams[state.turn];
    if (p === 0) {
        t.misses++;
        if (t.misses >= 3) {
            t.score = 0;
            t.rank = 99; // 失格
            showToast(`${t.name} 3回ミスで失格！`);
        }
    } else {
        t.score += p;
        t.misses = 0;
    }

    speak(`${t.name}、${t.score}点`);

    if (t.score === 50) {
        state.winners++;
        t.rank = state.winners;
        showToast(`${t.name} 50点達成！`);
    } else if (t.score > 50) {
        t.score = 25;
        showToast(`${t.name} オーバー！25点へ戻ります`);
    }

    moveNextTurn();
}

function moveNextTurn() {
    // 全員が終了（ランクあり）なら終了
    if (state.teams.every(t => t.rank > 0)) { render(); return; }
    
    // 次の未終了プレイヤーを探す
    do {
        state.turn = (state.turn + 1) % state.teams.length;
    } while (state.teams[state.turn].rank > 0);
    render();
}

function selectTeam(index) {
    if (state.teams[index].rank > 0) return; 
    state.turn = index;
    render();
}

function render() {
    const sb = document.getElementById('scoreboard');
    sb.innerHTML = '';
    const medals = ["", "🥇", "🥈", "🥉"]; 
    
    state.teams.forEach((t, i) => {
        const card = document.createElement('div');
        card.className = `score-card ${i === state.turn ? 'active' : ''}`;
        card.onclick = () => selectTeam(i);
        
        let medalHtml = (t.rank >= 1 && t.rank <= 3) ? `<div class="medal">${medals[t.rank]}</div>` : '';
        if (t.rank === 99) medalHtml = `<div class="medal">❌</div>`;
        
        let remainingHtml = t.rank > 0 ? `<div class="remaining" style="visibility:hidden">残り 0</div>` : `<div class="remaining">残り ${50 - t.score}</div>`;

        card.innerHTML = `
            ${medalHtml}
            <div class="team-name">${t.name}</div>
            <div class="points">${t.score}</div>
            ${remainingHtml}
            <div class="miss-count">${t.misses >= 1 ? '✕'.repeat(Math.min(t.misses, 3)) : ''}</div>
        `;
        sb.appendChild(card);
    });
}

function showToast(m) {
    const c = document.getElementById('toast-container');
    const e = document.createElement('div');
    e.className = 'toast';
    e.innerText = m;
    c.appendChild(e);
    setTimeout(() => e.remove(), 2000);
}

function undo() {
    if (state.history.length > 0) {
        const last = JSON.parse(state.history.pop());
        state.teams = last.teams;
        state.turn = last.turn;
        state.winners = last.winners;
        render();
    }
}

function resetGame() {
    if (confirm("ゲームを終了して設定に戻りますか？")) location.reload();
}