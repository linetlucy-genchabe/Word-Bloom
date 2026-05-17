// ── Toast notifications ────────────────────────────────────────────────────
function showToast(msg, type = 'info', duration = 2800) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'toastOut 0.3s ease forwards';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// ── Timer ring ─────────────────────────────────────────────────────────────
class TimerRing {
  constructor(el, totalSeconds, onTick, onEnd) {
    this.el = el;
    this.total = totalSeconds;
    this.remaining = totalSeconds;
    this.onTick = onTick;
    this.onEnd = onEnd;
    this.interval = null;
    const r = 32;
    this.circumference = 2 * Math.PI * r;
    el.innerHTML = `
      <svg width="80" height="80" viewBox="0 0 80 80">
        <circle cx="40" cy="40" r="${r}" fill="none" stroke="#E8E0F5" stroke-width="6"/>
        <circle id="timer-arc" cx="40" cy="40" r="${r}" fill="none"
          stroke="#C46A38" stroke-width="6"
          stroke-dasharray="${this.circumference}"
          stroke-dashoffset="0"
          stroke-linecap="round"/>
      </svg>
      <div class="timer-num" id="timer-num">${this._fmt(totalSeconds)}</div>`;
    this.arc = el.querySelector('#timer-arc');
    this.num = el.querySelector('#timer-num');
  }
  _fmt(s) {
    const m = Math.floor(s / 60), sec = s % 60;
    return m > 0 ? `${m}:${sec.toString().padStart(2,'0')}` : `${s}`;
  }
  start() {
    this.interval = setInterval(() => {
      this.remaining--;
      const pct = this.remaining / this.total;
      this.arc.style.strokeDashoffset = this.circumference * (1 - pct);
      this.num.textContent = this._fmt(this.remaining);
      if (this.remaining <= 10) this.el.classList.add('urgent');
      if (this.onTick) this.onTick(this.remaining);
      if (this.remaining <= 0) { clearInterval(this.interval); if (this.onEnd) this.onEnd(); }
    }, 1000);
  }
  stop() { clearInterval(this.interval); }
}

// ── Letter tile renderer ───────────────────────────────────────────────────
function renderLetters(letters, containerId) {
  const rack = document.getElementById(containerId);
  if (!rack) return;
  rack.innerHTML = '';
  letters.forEach((l, i) => {
    const tile = document.createElement('div');
    tile.className = 'letter-tile';
    tile.style.animationDelay = `${i * 0.06}s`;
    tile.textContent = l;
    rack.appendChild(tile);
  });
}

// ── Found words renderer ───────────────────────────────────────────────────
function addFoundWord(word, bonus, containerId = 'found-words') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const span = document.createElement('span');
  span.className = `found-word${bonus ? ' bonus' : ''}`;
  span.textContent = word + (bonus ? ' ★' : '');
  container.appendChild(span);
}

// ── Score display ──────────────────────────────────────────────────────────
function updateScore(score, id = 'score-display') {
  const el = document.getElementById(id);
  if (el) { el.textContent = score; el.classList.add('fade-in'); setTimeout(() => el.classList.remove('fade-in'), 500); }
}

// ── Progress bar ───────────────────────────────────────────────────────────
function updateProgress(found, total) {
  const bar = document.getElementById('progress-fill');
  const label = document.getElementById('progress-label');
  if (bar) bar.style.width = `${Math.min(100, (found / total) * 100)}%`;
  if (label) label.textContent = `${found} / ${total} words`;
}

// ── Shake input ────────────────────────────────────────────────────────────
function shakeInput(id = 'word-input') {
  const el = document.getElementById(id);
  if (!el) return;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 400);
}

// ── Scoreboard renderer ────────────────────────────────────────────────────
function renderScoreboard(players, myId, containerId = 'scoreboard') {
  const container = document.getElementById(containerId);
  if (!container) return;
  const sorted = Object.entries(players).sort((a, b) => b[1].score - a[1].score);
  container.innerHTML = '';
  sorted.forEach(([pid, p], i) => {
    const row = document.createElement('div');
    row.className = `score-row${i === 0 ? ' top' : ''}`;
    const initials = p.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
    row.innerHTML = `
      <div class="score-avatar">${initials}</div>
      <div style="flex:1">
        <div class="score-name">${p.name}${pid === myId ? ' (you)' : ''}</div>
        <div class="score-words">${p.count || 0} word${(p.count || 0) !== 1 ? 's' : ''}</div>
      </div>
      <div class="score-pts">${p.score}</div>
    `;
    container.appendChild(row);
  });
}

// ── Generic fetch helper ───────────────────────────────────────────────────
async function api(url, body = null) {
  const opts = { headers: { 'Content-Type': 'application/json' } };
  if (body) { opts.method = 'POST'; opts.body = JSON.stringify(body); }
  else { opts.method = 'GET'; }
  const res = await fetch(url, opts);
  return res.json();
}

// ── Avatar colour from name ────────────────────────────────────────────────
function avatarColor(name) {
  const colors = ['#C9B8E8','#F0A97A','#FDDEC8','#E8E0F5','#A48FD4'];
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffffffff;
  return colors[Math.abs(h) % colors.length];
}
