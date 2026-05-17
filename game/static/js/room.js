// ── Multiplayer room logic ─────────────────────────────────────────────────
let timer = null;
let gameActive = false;
let foundCount = 0;
let totalWords = 0;
let pollInterval = null;

const ROOM_CODE   = window.__ROOM_CODE__;
const PLAYER_ID   = window.__PLAYER_ID__;
const IS_HOST     = window.__IS_HOST__;

// ── Poll room state (for waiting room + live scoreboard) ───────────────────
function startPolling(onUpdate) {
  pollInterval = setInterval(async () => {
    const data = await api(`/api/room/state/?code=${ROOM_CODE}`);
    if (data.error) return;
    onUpdate(data);
  }, 2500);
}

function stopPolling() {
  if (pollInterval) clearInterval(pollInterval);
}

// ── Waiting room ───────────────────────────────────────────────────────────
async function initWaitingRoom() {
  const levelCards = document.querySelectorAll('.level-card');
  levelCards.forEach(card => {
    card.addEventListener('click', () => {
      levelCards.forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  startPolling(data => {
    // refresh player list
    const list = document.getElementById('player-list');
    if (list) {
      list.innerHTML = Object.values(data.players).map(p => `
        <div class="player-item">
          <div class="score-avatar" style="background: ${avatarColor(p.name)}">${p.name.slice(0,2).toUpperCase()}</div>
          <span style="font-weight:500">${p.name}</span>
          ${data.host === PLAYER_ID && p.name ? '' : ''}
        </div>`).join('');
    }
    document.getElementById('player-count').textContent = Object.keys(data.players).length;

    // host sees start button; non-host sees "waiting..."
    if (!IS_HOST && data.state === 'playing') {
      stopPolling();
      // host started — load game
      loadGameFromState(data);
    }
  });
}

async function startMultiGame() {
  const level = document.querySelector('.level-card.active')?.dataset.level || 'easy';
  const data = await api('/api/room/start/', { code: ROOM_CODE, player_id: PLAYER_ID, level });
  if (data.error) { showToast(data.error, 'error'); return; }
  stopPolling();
  loadGame(data);
}

function loadGameFromState(stateData) {
  // Non-host joins mid-game; fetch fresh state for letters
  fetch(`/api/room/state/?code=${ROOM_CODE}`)
    .then(r => r.json())
    .then(data => {
      const fakeStartData = {
        letters: data.letters,
        count: data.puzzle_count,
        time: 120,
        level: data.level,
        min_len: 3,
      };
      loadGame(fakeStartData);
    });
}

function loadGame(data) {
  totalWords = data.count;
  foundCount = 0;
  gameActive = true;

  document.getElementById('waiting-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

  renderLetters(data.letters, 'letter-rack');
  document.getElementById('meta-level').textContent = data.level;
  document.getElementById('meta-count').textContent = `${data.count} words`;
  document.getElementById('word-input').focus();

  // Timer
  const timerEl = document.getElementById('timer-ring');
  if (timer) timer.stop();
  timer = new TimerRing(timerEl, data.time,
    () => { pollScoreboard(); },
    () => { gameActive = false; showToast("Time's up!", 'error', 1500); setTimeout(endGame, 1600); }
  );
  timer.start();

  // live scoreboard polling
  startPolling(state => {
    if (state.state === 'ended') { stopPolling(); return; }
    renderScoreboard(state.players, PLAYER_ID);
  });
}

async function pollScoreboard() {
  const data = await api(`/api/room/state/?code=${ROOM_CODE}`);
  if (data.players) renderScoreboard(data.players, PLAYER_ID);
}

async function shuffleLetters() {
  const data = await api('/api/room/shuffle/', { code: ROOM_CODE });
  if (data.letters) renderLetters(data.letters, 'letter-rack');
}

async function submitWord() {
  if (!gameActive) return;
  const input = document.getElementById('word-input');
  const word = input.value.trim();
  if (!word) return;
  input.value = '';

  const data = await api('/api/room/submit/', { code: ROOM_CODE, player_id: PLAYER_ID, word });

  if (data.status === 'correct') {
    foundCount++;
    addFoundWord(data.word, data.bonus);
    updateScore(data.score);
    updateProgress(foundCount, totalWords);

    if (data.stolen) {
      showToast(`"${data.word}" — already found by someone! No points.`, 'info');
    } else if (data.bonus) {
      showToast(`🌟 BONUS! All letters used!`, 'bonus');
    } else {
      showToast(`✓ "${data.word}" +${data.word.length} pts`, 'success');
    }

    if (data.scoreboard) renderScoreboard(data.scoreboard, PLAYER_ID);
  } else if (data.status === 'duplicate') {
    showToast('Already found!', 'info'); shakeInput();
  } else if (data.status === 'short') {
    showToast(data.msg, 'info'); shakeInput();
  } else {
    showToast('Not in the list', 'error'); shakeInput();
  }
}

async function endGame() {
  stopPolling();
  if (timer) timer.stop();
  gameActive = false;

  const data = await api('/api/room/end/', { code: ROOM_CODE });

  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('result-screen').classList.remove('hidden');

  const resultsEl = document.getElementById('results-list');
  const medals = ['🥇','🥈','🥉'];
  const rankClass = ['gold','silver','bronze'];

  resultsEl.innerHTML = data.results.map((p, i) => `
    <div class="result-row">
      <div class="result-rank ${rankClass[i] || ''}">${medals[i] || (i+1)}</div>
      <div style="flex:1">
        <div style="font-weight:600;font-size:1rem">${p.name}</div>
        <div class="result-words">${p.words.map(w => `<span class="result-word-tag">${w}</span>`).join('') || '<span style="color:var(--muted);font-size:0.82rem">No words found</span>'}</div>
      </div>
      <div>
        <div class="score-pts">${p.score} pts</div>
        <div class="score-words">${p.count} words</div>
      </div>
    </div>`).join('');

  if (data.results[0]) {
    document.getElementById('mvp-name').textContent = `${data.results[0].name} wins! 🎉`;
  }

  const missed = data.all_words.filter(w => !data.results.flatMap(r => r.words).map(x => x.toUpperCase()).includes(w.toUpperCase()));
  document.getElementById('missed-words').innerHTML = missed.map(w => `<span class="missed-word">${w}</span>`).join('') || '<span style="color:var(--muted)">None missed!</span>';
}

// ── Keyboard ───────────────────────────────────────────────────────────────
document.getElementById('word-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitWord();
});

// ── Init ───────────────────────────────────────────────────────────────────
initWaitingRoom();
