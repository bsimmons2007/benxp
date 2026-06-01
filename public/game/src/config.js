// Central source of truth for every layout, balance, and visual constant.
// Everything in the codebase reads from here — change a value once, it propagates everywhere.

const ARENA = {
  width:  480,
  height: 800,
};

// X center pixel of each lane. Index 0=left, 1=right.
// Each lane is exactly half the arena width — they share the centre line at x=240
// with no gap and no gutters, so the two lanes fill the full 480px width.
const LANE_CENTERS = [120, 360];
const LANE_WIDTH   = 240;

// Y center pixel of every structural row.
// Symmetric around the midpoint at y=400 so the battlefield reads as balanced.
// All rows are spaced 60px apart, perfectly symmetric around the midpoint.
// playerBase sits at y=625 — 3px above the HUD panel at y=645 — so the
// player turret and base remain fully visible above the card-hand overlay.
const ROW_Y = {
  enemyBase:    25,
  enemyTurret:  85,
  enemyCover3:  145,   // furthest from midpoint, closest to enemy base
  enemyCover2:  205,
  enemyCover1:  265,   // closest to midpoint — first barrier a player unit hits
  midpoint:     325,
  playerCover1: 385,   // closest to midpoint — first barrier an enemy unit hits
  playerCover2: 445,
  playerCover3: 505,   // furthest from midpoint, closest to player base
  playerTurret: 565,
  playerBase:   625,
};

// Maps coverIndex (0=closest to midpoint, 2=closest to own base) to a ROW_Y key.
// Used to find the Y position of any cover without hardcoding coordinates everywhere.
const COVER_ROWS = {
  player: ['playerCover1', 'playerCover2', 'playerCover3'],
  enemy:  ['enemyCover1',  'enemyCover2',  'enemyCover3'],
};

// HP for damageable structures only. Covers have no HP — they are captured, not destroyed.
const STRUCTURE_HP = {
  turret: 820,   // tank (~Ironclad) reaches ~85% before dying; no solo non-tank
  base:   2000,
};

// Turret and base auto-attack stats
const STRUCTURE_ATTACK = {
  turretDamage:       40,
  turretRange:        200,
  baseDamage:         40,
  baseRange:          120,
  turretFireRateMs:   1800,   // 1.8 s per spec
  baseFireRateMs:     1000,   // 1.0 s per spec
};

// Cover capture ownership states
const COVER_STATE = {
  neutral: 'neutral',
  player:  'player',
  enemy:   'enemy',
};

// Visual dimensions in pixels
const SIZES = {
  cover:       { w: 100, h: 22 },  // bunker wide enough for 2 units side-by-side (~20px each + margins)
  turret:      26,                  // hexagon outer radius
  base:        { w: 200, h: 34 },  // centered mid-size structure — NOT full canvas width
  hpBarTurret: { w: 110, h: 5 },
  hpBarBase:   { w: 160, h: 7 },
};

// Phaser hex integers (0xRRGGBB).
// Alien desert planet — bioluminescent teal faction vs deep crimson faction.
// Law, not suggestion. HP never uses red — that is enemy faction only.
const COLORS = {
  // ── Player faction (bioluminescent teal) ────────────────────────────────────
  player:         0x1a5a52,  // player glow — bioluminescent teal
  playerDim:      0x0e3a3a,  // player primary — deep blue-teal fill
  playerBright:   0x2a7a6a,  // brightest player accent — used sparingly

  // ── Enemy faction (deep crimson) ────────────────────────────────────────────
  enemy:          0x5a1a1a,  // enemy glow — deep crimson
  enemyDim:       0x3a0e0e,  // enemy primary — blood red fill
  enemyBright:    0x7a2a2a,  // brightest enemy accent

  // ── Cover barriers ──────────────────────────────────────────────────────────
  coverNeutral:   0x1a2620,  // dark mossy stone — unowned cover
  coverTrim:      0x243830,  // slightly lighter edge suggesting organic growth

  // ── Arena surface & background ──────────────────────────────────────────────
  background:     0x0a0d0e,  // near-black alien rock — the void of the desert floor
  laneFloor:      0x131f1c,  // dark teal-rock lane surface
  biolume:        0x0d2a22,  // bioluminescent vein threading through rock
  biolumeGlow:    0x0a3028,  // soft teal glow of bioluminescent life

  // ── HP bars — green palette only, never red ─────────────────────────────────
  hpFull:         0x1a6a30,  // bright bioluminescent green — healthy
  hpMid:          0x4a7a20,  // yellow-green — mid health
  hpLow:          0x4a3a10,  // dark amber/olive — low health (NOT red)
  hpBack:         0x0a1208,  // near-black green — depleted portion

  // ── Text ────────────────────────────────────────────────────────────────────
  textPrimary:    0xb8d8cc,  // soft cold teal-white — all UI labels
  textDim:        0x3a5a50,  // muted teal-gray — secondary labels
  textBright:     0xd8f0e0,  // brightest text — critical readouts only

  // ── Legacy aliases kept for backward compatibility ───────────────────────────
  laneSep:        0x1a2a28,  // used nowhere visible now but kept safe
};

// Energy regeneration rules
// Normal phase:      1 energy per 3 seconds (0.333/s)
// Double Power phase: 1 energy per 1.5 seconds (0.667/s) — starts at 60s remaining
const ENERGY = {
  max:                  10,
  regenNormal:          1 / 3,    // per second
  regenDoublePower:     1 / 1.5,  // per second — kicks in at doublePowerThreshold
  doublePowerThreshold: 60,       // seconds remaining on match timer
  startAmount:          5,
};

// Match timing in seconds
const MATCH = {
  durationSeconds:         180,   // 3-minute match
  ultimateChargeSeconds:   90,    // time for ultimate to reach full charge
  suddenDeathSeconds:      45,    // sudden death duration after timer expires tied
};

// Structure point values used for win/loss scoring at time expiry
const STRUCTURE_POINTS = {
  turret: 1,
  base:   3,   // instant win — destroying the base ends the match immediately
};

// How long a unit must stand on a cover to capture it (milliseconds)
const CAPTURE_TIME_MS = 8000;

// How long an enemy must stand on a FRIENDLY cover to strip the claim before
// the 8-second capture window begins (milliseconds)
const RECAPTURE_STRIP_MS = 2000;

// Cover capture progress decay — once the last captor leaves, progress holds
// for DELAY_MS then slowly drains back to zero.
const COVER_DECAY = {
  delayMs:   3000,       // 3 s idle before decay begins
  ratePerMs: 1 / 20000,  // 20 s to fully drain from 100 %
};
