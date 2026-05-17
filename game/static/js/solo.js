// ── Solo game logic ────────────────────────────────────────────────────────
let timer = null;
let gameActive = false;
let foundCount = 0;
let totalWords = 0;
let hintsUsed = 0;
let currentScore = 0;

async function startGame() {
  const level = document.querySelector('.level-card.active')?.dataset.level || 'easy';
  const data = await api('/api/solo/start/', { level });
  if (data.error) { showToast(data.error, 'error'); return; }

  gameActive = true;
  foundCount = 0;
  hintsUsed = 0;
  currentScore = 0;
  totalWords = data.count;

  document.getElementById('found-words').innerHTML = '';
  document.getElementById('word-input').value = '';
  updateScore(0);
  updateProgress(0, totalWords);
  renderLetters(data.letters, 'letter-rack');

  document.getElementById('meta-level').textContent = data.level;
  document.getElementById('meta-minlen').textContent = `${data.min_len}+ letters`;
  document.getElementById('meta-count').textContent = `${data.count} words`;

  document.getElementById('start-screen').classList.add('hidden');
  document.getElementById('game-screen').classList.remove('hidden');

  document.getElementById('word-input').focus();

  // timer
  const timerEl = document.getElementById('timer-ring');
  if (timer) timer.stop();
  timer = new TimerRing(timerEl, data.time,
    (rem) => { /* tick */ },
    () => { gameActive = false; showToast("Time's up!", 'error', 1500); setTimeout(endGame, 1600); }
  );
  timer.start();
}

async function shuffleLetters() {
  const data = await api('/api/solo/shuffle/', {});
  if (data.letters) renderLetters(data.letters, 'letter-rack');
}

async function submitWord() {
  if (!gameActive) return;
  const input = document.getElementById('word-input');
  const word = input.value.trim();
  if (!word) return;
  input.value = '';

  const data = await api('/api/solo/submit/', { word });

  if (data.status === 'correct') {
    foundCount++;
    currentScore = data.score;
    addFoundWord(data.word, data.bonus);
    updateScore(data.score);
    updateProgress(foundCount, totalWords);
    showToast(data.bonus ? `🌟 BONUS! "${data.word}" — All letters!` : `✓ "${data.word}" +${data.word.length} pts`, data.bonus ? 'bonus' : 'success');
    if (foundCount >= totalWords) { gameActive = false; showToast('🎉 All words found!', 'success', 2000); setTimeout(endGame, 2100); }
  } else if (data.status === 'duplicate') {
    showToast('Already found!', 'info'); shakeInput();
  } else if (data.status === 'short') {
    showToast(data.msg, 'info'); shakeInput();
  } else {
    showToast('Not in the list', 'error'); shakeInput();
  }
}

async function useHint() {
  if (!gameActive || hintsUsed >= 3) return;
  hintsUsed++;
  const btn = document.getElementById('hint-btn');
  btn.textContent = `Hint (${3 - hintsUsed} left)`;
  if (hintsUsed >= 3) btn.disabled = true;

  // show first letter of a random unfound word
  const data = await api('/api/solo/end/', {});
  const found = data.found.map(w => w.toUpperCase());
  const unfound = data.all_words.filter(w => !found.includes(w.toUpperCase()));
  if (!unfound.length) { showToast('No more hints available!', 'info'); return; }
  const pick = unfound[Math.floor(Math.random() * unfound.length)].toUpperCase();
  const hintLetters = pick.split('').map((l, i) => i === 0 ? `<span class="hint-letter">${l}</span>` : `<span class="hint-letter" style="opacity:0.3">?</span>`).join('');
  showToast(`Hint: ${pick.length}-letter word starting with ${pick[0]}`, 'info', 4000);
}

async function endGame() {
  if (timer) timer.stop();
  gameActive = false;
  const data = await api('/api/solo/end/', {});

  document.getElementById('game-screen').classList.add('hidden');
  document.getElementById('result-screen').classList.remove('hidden');

  document.getElementById('result-score').textContent = data.score;
  document.getElementById('result-found').textContent = data.found.length;
  document.getElementById('result-total').textContent = data.total;

  const pct = Math.round((data.found.length / data.total) * 100);
  document.getElementById('result-pct').textContent = `${pct}%`;

  const foundEl = document.getElementById('result-found-words');
  foundEl.innerHTML = data.found.map(w => `<span class="found-word">${w}</span>`).join('');

  const missed = data.all_words.filter(w => !data.found.map(f => f.toUpperCase()).includes(w.toUpperCase()));
  const missedEl = document.getElementById('result-missed-words');
  missedEl.innerHTML = missed.map(w => `<span class="missed-word">${w}</span>`).join('');

  // medal
  let medal = '🌱';
  if (pct >= 90) medal = '🏆';
  else if (pct >= 70) medal = '🥇';
  else if (pct >= 50) medal = '🥈';
  else if (pct >= 30) medal = '🥉';
  document.getElementById('result-medal').textContent = medal;
}

function playAgain() {
  document.getElementById('result-screen').classList.add('hidden');
  document.getElementById('start-screen').classList.remove('hidden');
}

// ── Level selection ────────────────────────────────────────────────────────
document.querySelectorAll('.level-card').forEach(card => {
  card.addEventListener('click', () => {
    document.querySelectorAll('.level-card').forEach(c => c.classList.remove('active'));
    card.classList.add('active');
  });
});

// ── Keyboard submit ────────────────────────────────────────────────────────
document.getElementById('word-input')?.addEventListener('keydown', e => {
  if (e.key === 'Enter') submitWord();
});
