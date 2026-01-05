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

document.getElementById('start-btn').onclick = async () => {
    const activeBtns = document.querySelectorAll('.team-toggle-btn.active');
    state.teams = Array.from(activeBtns).map(btn => ({
        name: document.getElementById(`name-${btn.dataset.id}`).value || 'チーム',
        score: 0, misses: 0, rank: 0
    }));

    if (state.teams.length === 0) return alert('チームを1つ以上ONにしてください');

    await requestWakeLock();
    document.getElementById('setup-screen').classList.add('hidden');
    document.getElementById('game-screen').classList.remove('hidden');
    
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
    // 履歴保存
    state.history.push(JSON.stringify({
        teams: JSON.parse(JSON.stringify(state.teams)), 
        turn: state.turn, 
        winners: state.winners
    }));
    
    let t = state.teams[state.turn];
    if (p === 0) {
        // ミスカウントを最大3回までに制限
        if (t.misses < 3) {
            t.misses++;
            if (t.misses === 3) {
                showToast("失格ですが続けて頑張りましょう！");
            }
        }
    } else {
        t.score += p;
        t.misses = 0; // スコア獲得でミスリセット
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
    if (state.teams.every(t => t.rank > 0)) { render(); return; }
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
        let remainingHtml = t.rank > 0 ? `<div class="remaining" style="visibility:hidden">残り 0</div>` : `<div class="remaining">残り ${50 - t.score}</div>`;

        card.innerHTML = `
            ${medalHtml}
            <div class="team-name">${t.name}</div>
            <div class="points">${t.score}</div>
            ${remainingHtml}
            <div class="miss-count">${t.misses >= 1 ? '✕'.repeat(t.misses) : ''}</div>
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
    setTimeout(() => e.remove(), 3000); // メッセージを長めに表示
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
    if (confirm("ゲームを終了して設定画面に戻りますか？")) location.reload();
}
