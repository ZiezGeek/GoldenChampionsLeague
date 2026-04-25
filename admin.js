// ============================================
//   GOLDEN CHAMPIONS LEAGUE - ADMIN.JS
//   PIN Auth + Result Entry Dashboard
// ============================================

const ADMIN_PIN = "020707";

// ── PIN LOGIN ──
function setupPinInput() {
  const inputs = document.querySelectorAll('.pin-digit');

  inputs.forEach((input, i) => {
    input.addEventListener('input', () => {
      input.value = input.value.replace(/\D/g, '').slice(-1);
      if (input.value && i < inputs.length - 1) inputs[i + 1].focus();
    });
    input.addEventListener('keydown', e => {
      if (e.key === 'Backspace' && !input.value && i > 0) {
        inputs[i - 1].focus();
        inputs[i - 1].value = '';
      }
    });
  });
}

function getPin() {
  return Array.from(document.querySelectorAll('.pin-digit')).map(i => i.value).join('');
}

function attemptLogin() {
  const pin = getPin();
  const errEl = document.getElementById('pinError');

  if (pin === ADMIN_PIN) {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminPanel').style.display = 'block';
    loadAdminFixtures();
  } else {
    errEl.style.display = 'block';
    errEl.textContent = 'Incorrect PIN. Try again.';
    document.querySelectorAll('.pin-digit').forEach(i => {
      i.value = '';
      i.style.borderColor = 'var(--red)';
    });
    document.querySelectorAll('.pin-digit')[0].focus();
    setTimeout(() => {
      errEl.style.display = 'none';
      document.querySelectorAll('.pin-digit').forEach(i => i.style.borderColor = '');
    }, 2000);
  }
}

function logout() {
  document.getElementById('loginScreen').style.display = 'flex';
  document.getElementById('adminPanel').style.display = 'none';
  document.querySelectorAll('.pin-digit').forEach(i => i.value = '');
  document.querySelectorAll('.pin-digit')[0].focus();
}

// ── RENDER ADMIN FIXTURES ──
function loadAdminFixtures() {
  const container = document.getElementById('adminFixtures');

  const byGW = { 1: [], 2: [] };
  fixtures.forEach(f => byGW[f.gw].push(f));

  container.innerHTML = [1, 2].map(gw => `
    <div class="gameweek-block">
      <div class="gameweek-label">Gameweek ${gw} · ${gw === 1 ? 'Home Leg' : 'Away Leg'}</div>
      ${byGW[gw].map(f => adminFixtureCard(f)).join('')}
    </div>`).join('');
}

function adminFixtureCard(f) {
  const hs = f.played ? f.homeScore : '';
  const as = f.played ? f.awayScore : '';
  const savedBadge = f.played
    ? `<span style="color:var(--gold);font-family:'Oswald',sans-serif;font-size:0.7rem;letter-spacing:2px;">✔ SAVED</span>`
    : '';

  return `
    <div class="fixture-admin-card" id="card-${f.id}">
      <div class="fixture-admin-teams">
        <div class="team-logo-container ${f.home.cls}">${f.home.abbr}</div>
        <span>${f.home.name}</span>
        <span style="color:var(--text-muted);margin:0 4px;">vs</span>
        <span>${f.away.name}</span>
        <div class="team-logo-container ${f.away.cls}">${f.away.abbr}</div>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
        <input type="number" min="0" max="99" class="score-input" id="hs-${f.id}"
               value="${hs}" placeholder="-" />
        <span style="font-family:'Bebas Neue';font-size:1.2rem;color:var(--text-muted)">–</span>
        <input type="number" min="0" max="99" class="score-input" id="as-${f.id}"
               value="${as}" placeholder="-" />
        <button class="btn-save" onclick="saveFixtureResult('${f.id}')">Save</button>
        ${f.played ? `<button class="btn-reset" onclick="resetFixtureResult('${f.id}')">Reset</button>` : ''}
        ${savedBadge}
      </div>
      <div style="font-family:'Oswald',sans-serif;font-size:0.7rem;color:var(--text-muted);letter-spacing:1px;">${f.date}</div>
    </div>`;
}

// ── SAVE RESULT ──
async function saveFixtureResult(fixtureId) {
  const hs = document.getElementById(`hs-${fixtureId}`).value;
  const as = document.getElementById(`as-${fixtureId}`).value;

  if (hs === '' || as === '') {
    showToast('Enter both scores first!', true);
    return;
  }

  await saveResult(fixtureId, hs, as);
  showToast('Result saved!');
  loadAdminFixtures();
}

// ── RESET RESULT ──
async function resetFixtureResult(fixtureId) {
  if (!confirm('Reset this result?')) return;
  if (db) await db.ref(`gcl_results/${fixtureId}`).remove();
  const idx = fixtures.findIndex(f => f.id === fixtureId);
  if (idx > -1) {
    fixtures[idx].played = false;
    fixtures[idx].homeScore = null;
    fixtures[idx].awayScore = null;
  }
  showToast('Result cleared.');
  loadAdminFixtures();
}

// ── TOAST ──
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.style.background = isError ? 'var(--red)' : 'var(--gold)';
  t.style.color = isError ? '#fff' : 'var(--black)';
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

// ── INIT ──
document.addEventListener('DOMContentLoaded', async () => {
  setupPinInput();
  initFirebase();
  await loadResults();
});
