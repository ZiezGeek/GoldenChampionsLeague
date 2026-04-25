// ============================================
//   GOLDEN CHAMPIONS LEAGUE - APP.JS
//   Firebase config + Teams + Fixtures Logic
// ============================================

// ── FIREBASE CONFIG (replace with your own) ──
const firebaseConfig = {
  apiKey: "AIzaSyBpTzJMNlnIkXYSc7HzJgB14Kvv2hB2edc",
  authDomain: "efootball-league-70d44.firebaseapp.com",
  databaseURL: "https://efootball-league-70d44-default-rtdb.firebaseio.com",
  projectId: "efootball-league-70d44",
  storageBucket: "efootball-league-70d44.firebasestorage.app",
  messagingSenderId: "1027946844235",
  appId: "1:1027946844235:web:d5345db0d5826b3e31fdce",
  measurementId: "G-EWHN9WKMZW"
};

// ── TEAMS ──
const TEAMS = [
  { id: "magolide", name: "Magolide Classic Stars FC", short: "MCS", cls: "team-magolide", abbr: "MCS" },
  { id: "ziezgeek", name: "ZiezGeek FC",               short: "ZZG", cls: "team-ziezgeek",  abbr: "ZZG" },
  { id: "tito",     name: "Tito FC",                   short: "TIT", cls: "team-tito",      abbr: "TIT" },
  { id: "siyababa", name: "Siyababa FC",               short: "SIY", cls: "team-siyababa",  abbr: "SIY" },
  { id: "nopain",   name: "No Pain No Gain FC",         short: "NPG", cls: "team-nopain",   abbr: "NPG" },
  { id: "sparta",   name: "Sparta Rotterdam",           short: "SPA", cls: "team-sparta",    abbr: "SPA" },
  { id: "prost",    name: "Pro ST FC",                  short: "PST", cls: "team-prost",     abbr: "PST" }
];

// ── FIXTURE SCHEDULE (Home & Away — each pair plays twice) ──
// Spread across this week (Mon–Sun). Gameweek 1 = home leg, Gameweek 2 = away leg.
function getWeekDates() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - (day === 0 ? 6 : day - 1));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

function fmtDate(d) {
  return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
}

function buildFixtures() {
  const dates = getWeekDates();
  const pairs = [];
  for (let i = 0; i < TEAMS.length; i++)
    for (let j = i + 1; j < TEAMS.length; j++)
      pairs.push([TEAMS[i], TEAMS[j]]);

  // 15 unique pairs → 30 matches total (home + away)
  // Distribute 15 per round, 2 rounds this week
  const gw1 = pairs.map(([h, a], idx) => ({
    id: `gw1_${h.id}_${a.id}`,
    gw: 1,
    home: h, away: a,
    date: fmtDate(dates[Math.floor(idx / 5) % 4]),      // Mon–Thu
    homeScore: null, awayScore: null, played: false
  }));

  const gw2 = pairs.map(([h, a], idx) => ({
    id: `gw2_${a.id}_${h.id}`,
    gw: 2,
    home: a, away: h,                                    // reversed
    date: fmtDate(dates[4 + Math.floor(idx / 8) % 3]),  // Fri–Sun
    homeScore: null, awayScore: null, played: false
  }));

  return [...gw1, ...gw2];
}

const BASE_FIXTURES = buildFixtures();

// ── COMPUTE TABLE ──
function computeTable(fixtures) {
  const table = {};
  TEAMS.forEach(t => {
    table[t.id] = { team: t, p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0, form: [] };
  });

  fixtures.forEach(f => {
    if (!f.played || f.homeScore === null || f.awayScore === null) return;
    const h = table[f.home.id];
    const a = table[f.away.id];
    const hs = Number(f.homeScore), as = Number(f.awayScore);

    h.p++; a.p++;
    h.gf += hs; h.ga += as; h.gd = h.gf - h.ga;
    a.gf += as; a.ga += hs; a.gd = a.gf - a.ga;

    if (hs > as) {
      h.w++; h.pts += 3; h.form.push("W");
      a.l++; a.form.push("L");
    } else if (as > hs) {
      a.w++; a.pts += 3; a.form.push("W");
      h.l++; h.form.push("L");
    } else {
      h.d++; h.pts++; h.form.push("D");
      a.d++; a.pts++; a.form.push("D");
    }
  });

  return Object.values(table).sort((a, b) =>
    b.pts - a.pts || b.gd - a.gd || b.gf - a.gf || a.team.name.localeCompare(b.team.name)
  );
}

// ── TEAM LOGO HTML ──
function logoHTML(team, size = "") {
  return `<div class="team-logo-container ${team.cls} ${size}">${team.abbr}</div>`;
}

// ── FIREBASE INIT ──
let db = null;
let fixtures = JSON.parse(JSON.stringify(BASE_FIXTURES)); // local copy

function initFirebase() {
  try {
    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    db = firebase.database();
    console.log("Firebase connected");
  } catch (e) {
    console.warn("Firebase not configured — using local data only.", e);
  }
}

// ── LOAD RESULTS FROM FIREBASE ──
async function loadResults() {
  if (!db) return fixtures;
  return new Promise(resolve => {
    db.ref("gcl_results").once("value", snap => {
      const data = snap.val() || {};
      fixtures = BASE_FIXTURES.map(f => {
        if (data[f.id]) {
          return { ...f, ...data[f.id], home: f.home, away: f.away };
        }
        return f;
      });
      resolve(fixtures);
    });
  });
}

// ── SAVE RESULT TO FIREBASE ──
async function saveResult(fixtureId, homeScore, awayScore) {
  const played = homeScore !== "" && awayScore !== "";
  const update = { homeScore: played ? Number(homeScore) : null, awayScore: played ? Number(awayScore) : null, played };
  if (db) await db.ref(`gcl_results/${fixtureId}`).update(update);
  const idx = fixtures.findIndex(f => f.id === fixtureId);
  if (idx > -1) Object.assign(fixtures[idx], update);
}

// ── LISTEN FOR REALTIME UPDATES ──
function listenResults(callback) {
  if (!db) return;
  db.ref("gcl_results").on("value", snap => {
    const data = snap.val() || {};
    fixtures = BASE_FIXTURES.map(f => {
      if (data[f.id]) return { ...f, ...data[f.id], home: f.home, away: f.away };
      return f;
    });
    callback(fixtures);
  });
}
