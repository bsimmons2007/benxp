// Defines every card in the game.
//
// NUMERIC STATS are tuned for a 480×800 arena where vertical cover gaps are ~75px.
// speed  = pixels per second of movement
// range  = pixels — unit attacks anything within this radius
// damage = raw HP removed per hit
// attackSpeed = attacks per second
//
// count = how many unit bodies spawn when this card is played (Wraith Squad = 3, etc.)
// Special cards (Nova Grenade, Shock Pulse) have count:0 — they trigger an effect, not a persistent body.

const UNITS = {

  // ── Cost 1 ─────────────────────────────────────────────────────────────────

  spark: {
    id: 'spark', name: 'Spark', role: 'scout',
    cost: 1, count: 1,
    hp: 80, damage: 8, attackSpeed: 1.0,
    speed: 80, range: 38,
    coverSeeker: true,
    captureMultiplier: 2.0,
    shape: 'circle', radius: 8,
    tint: null,               // uses faction color
    special: null,
  },

  volt: {
    id: 'volt', name: 'Volt', role: 'ranged',
    cost: 1, count: 1,
    hp: 70, damage: 10, attackSpeed: 1.2,
    speed: 42, range: 160,
    coverSeeker: true,
    captureMultiplier: 1.0,
    shape: 'triangle', radius: 10,
    tint: null,
    special: null,
  },

  // ── Cost 2 ─────────────────────────────────────────────────────────────────

  decoyDrone: {
    id: 'decoyDrone', name: 'Decoy Drone', role: 'utility',
    cost: 2, count: 1,
    hp: 400, damage: 0, attackSpeed: 0,
    speed: 0, range: 0,
    captureMultiplier: 0,
    aggroRadius: 200,         // all enemy units within this radius are forced to target this drone
    shape: 'circle', radius: 14,
    tint: 0xffff00,           // yellow to stand out as a decoy
    special: 'aggroMagnet',
  },

  novaGrenade: {
    id: 'novaGrenade', name: 'Nova Grenade', role: 'aoe',
    cost: 2, count: 0,        // not a persistent unit — it's a projectile effect
    hp: 0, damage: 120, attackSpeed: 0,
    speed: 0, range: 0,
    captureMultiplier: 0,
    blastRadius: 80,
    denialDurationMs: 4000,   // area denial zone lingers this long after impact
    shape: 'diamond', radius: 10,
    tint: 0xff8800,
    special: 'aoeProjectile',
  },

  wraithSquad: {
    id: 'wraithSquad', name: 'Wraith Squad', role: 'ranged',
    cost: 2, count: 3,        // one card, three bodies spawned side by side
    hp: 60, damage: 8, attackSpeed: 1.0,
    speed: 42, range: 120,
    coverSeeker: true,
    captureMultiplier: 1.0,
    shape: 'triangle', radius: 9,
    tint: null,
    special: null,
  },

  // ── Cost 3 ─────────────────────────────────────────────────────────────────

  ironclad: {
    id: 'ironclad', name: 'Ironclad', role: 'tank',
    cost: 3, count: 1,
    hp: 600, damage: 40, attackSpeed: 0.8,
    speed: 28, range: 44,
    captureMultiplier: 1.0,
    shape: 'square', radius: 16,
    tint: null,
    special: null,
  },

  // ── Cost 4 ─────────────────────────────────────────────────────────────────

  vex: {
    id: 'vex', name: 'Vex', role: 'bruiser',
    cost: 4, count: 1,
    hp: 220, damage: 35, attackSpeed: 1.0,
    speed: 44, range: 44,
    coverSeeker: true,
    captureMultiplier: 1.5,
    shape: 'pentagon', radius: 13,   // bruiser = pentagon
    tint: null,
    special: null,
  },

  pulse: {
    id: 'pulse', name: 'Pulse', role: 'utility',
    cost: 4, count: 1,
    hp: 250, damage: 20, attackSpeed: 1.0,
    speed: 42, range: 44,
    coverSeeker: true,
    captureMultiplier: 1.0,
    healRadius: 80,           // heals all friendly units within this radius
    healPerSecond: 15,
    riftReviveRadius: 80,     // must be within this range to revive a downed Rift
    shape: 'diamond', radius: 12,    // utility = diamond
    tint: 0x88ff88,           // soft green tint to signal healer
    special: 'aoeHeal',
  },

  rift: {
    id: 'rift', name: 'Rift', role: 'bruiser',
    cost: 4, count: 1,
    hp: 280, damage: 38, attackSpeed: 1.0,
    speed: 44, range: 44,
    coverSeeker: true,
    captureMultiplier: 1.0,
    downedDurationMs: 3000,   // stays at 1 HP in "downed" state this long; revives if Pulse is near
    shape: 'pentagon', radius: 13,   // bruiser = pentagon
    tint: null,
    special: 'lastStand',
  },

  shard: {
    id: 'shard', name: 'Shard', role: 'threat',
    cost: 4, count: 1,
    hp: 160, damage: 55, attackSpeed: 1.0,
    speed: 56, range: 44,
    captureMultiplier: 1.0,
    lifestealPercent: 0.30,   // heals for 30% of the killing blow's damage on each kill
    shape: 'star', radius: 13,       // threat = jagged star — looks dangerous
    tint: 0xff44ff,           // magenta — visually marks it as dangerous
    special: 'lifesteal',
  },

  echo: {
    id: 'echo', name: 'Echo', role: 'utility',
    cost: 4, count: 1,
    hp: 240, damage: 22, attackSpeed: 1.0,
    speed: 42, range: 120,
    coverSeeker: true,
    captureMultiplier: 1.0,
    auraRadius: 100,
    damageBoostPerStack: 0.10, // each stack adds 10% damage to all nearby friendlies
    stackIntervalMs: 3000,     // gains a new stack every 3 seconds alive
    shape: 'diamond', radius: 12,    // utility = diamond
    tint: 0xffdd44,            // gold — signals utility/aura role
    special: 'damageAura',
  },

  // ── Cost 6 ─────────────────────────────────────────────────────────────────

  siegeMech: {
    id: 'siegeMech', name: 'Siege Mech', role: 'tank',
    cost: 6, count: 1,
    hp: 900, damage: 80, attackSpeed: 0.6,
    speed: 20, range: 50,
    captureMultiplier: 1.0,
    spinUpDelayMs: 2000,      // waits 2 seconds before its first attack — window to burst it down
    splashRadius: 60,         // deals full damage to all units within this radius on each hit
    shape: 'square', radius: 20,
    tint: null,
    special: 'splashDamage',
  },

  // ── Special cards (non-troop, no persistent body) ──────────────────────────

  shockPulse: {
    id: 'shockPulse', name: 'Shock Pulse', role: 'special',
    cost: 3, count: 0,
    hp: 0, damage: 0, attackSpeed: 0,
    speed: 0, range: 0,
    captureMultiplier: 0,
    stunRadius: 100,
    stunDurationMs: 2000,
    shape: 'diamond', radius: 10,
    tint: 0x88ddff,
    special: 'stunGrenade',
  },

  sentryTower: {
    id: 'sentryTower', name: 'Sentry Tower', role: 'special',
    cost: 5, count: 1,
    hp: 400, damage: 25, attackSpeed: 1.2,
    speed: 0, range: 180,    // stationary — placed at a fixed position
    captureMultiplier: 0,
    shape: 'square', radius: 14,
    tint: 0xaaaaff,
    special: 'stationary',
  },
};

// The 12 cards in a player's deck if they haven't customised it yet.
// Shock Pulse and Sentry Tower replace two unit slots when chosen.
const DEFAULT_DECK = [
  'spark', 'volt', 'decoyDrone', 'novaGrenade',
  'wraithSquad', 'ironclad', 'vex', 'pulse',
  'rift', 'shard', 'echo', 'siegeMech',
];
