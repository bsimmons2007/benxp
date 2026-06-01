// GameScene — owns all match state.
//
// File sections:
//   [INIT]            Scene setup, structure registries, deploy zone tracking
//   [BACKGROUND]      Stars, lane strips, midline
//   [ARENA]           Placing all 18 structures (12 covers, 4 turrets, 2 bases)
//   [DRAWING]         Primitive helpers — cover, turret hexagon, base rounded rect
//   [HP BARS]         Turret and base HP bars only — covers have NO HP
//   [COVERS]          Capture mechanic + deploy zone update logic
//   [UNITS]           Unit spawn + body graphics (Phase 4 & 9)
//   [UNIT TICK]       Movement, target acquisition, attacks, abilities
//   [PROJECTILES]     Turret bullets, Nova/Shock grenades, Orbital strike
//   [EFFECTS]         Denial zones, explosion graphics, death particles
//   [AI]              Smart AI tick (Phase 8)
//   [ULTIMATES]       Drop Pod + Orbital Strike (Phase 10)
//   [SOUND]           Web Audio tone bank (Phase 12)
//   [UPDATE]          Main loop
//   [DECK / HAND]
//   [ENERGY / TIMING]

// Counter-pick table — AI consults this when player deploys a card. Each key
// is a card id; the array lists the IDs of cards that hard-counter it in
// preference order.
const COUNTER_TABLE = {
  spark:       ['novaGrenade', 'shockPulse', 'ironclad'],
  volt:        ['ironclad', 'vex', 'rift'],
  decoyDrone:  ['volt', 'spark', 'wraithSquad'],
  novaGrenade: ['ironclad', 'rift', 'siegeMech'],
  wraithSquad: ['novaGrenade', 'shockPulse', 'siegeMech'],
  ironclad:    ['shard', 'vex', 'novaGrenade'],
  vex:         ['ironclad', 'pulse', 'rift'],
  pulse:       ['shard', 'vex', 'echo'],
  rift:        ['shard', 'siegeMech', 'novaGrenade'],
  shard:       ['ironclad', 'wraithSquad', 'decoyDrone'],
  echo:        ['spark', 'shard', 'shockPulse'],
  siegeMech:   ['novaGrenade', 'shard', 'shockPulse'],
  shockPulse:  ['ironclad', 'rift', 'siegeMech'],
  sentryTower: ['novaGrenade', 'vex', 'shard'],
};

// ─────────────────────────────────────────────────────────────────────────────
// Feature-encoding constants — defined once here so _buildStateVector never
// allocates new arrays on the hot path.
// ─────────────────────────────────────────────────────────────────────────────
const AI_ROLES      = ['scout','ranged','utility','aoe','tank','bruiser','threat','special'];
const AI_SPECIALS   = [null,'aggroMagnet','aoeProjectile','stunGrenade','lastStand',
                       'lifesteal','aoeHeal','damageAura','splashDamage','stationary'];
const AI_THREATS    = ['none','manageable','low','moderate','severe'];
const AI_STRATEGIES = ['balanced','rush_0','rush_1','split','defend','counterpush_0','counterpush_1'];
// Input size: 19(card) + 12(threat) + 5(lane) + 5(game) + 9(prev) + 7(strategy) = 57
const AI_INPUT_SIZE = 57;

// ─────────────────────────────────────────────────────────────────────────────
// NeuralNet — minimal 3-layer feedforward network for card-value estimation.
//
// Architecture: 57 inputs → 48 (ReLU) → 24 (ReLU) → 1 (sigmoid)
//
// Output is a quality score in [0, 1].  It is converted to a weight multiplier
// via:  mult = exp((score - 0.5) * 3.2)
//   score=0.50 → mult=1.00  (neutral — prior drives)
//   score=0.80 → mult=2.66  (boost)
//   score=0.20 → mult=0.38  (suppress)
//   score=1.00 → mult=5.00  (strong boost — override prior)
//   score=0.00 → mult=0.20  (strong suppress)
//
// The network learns CORRECTIONS to the hardcoded strategic prior, starting
// neutral (all outputs ≈0.5) so that early-game behavior is fully driven by
// the priors.  Over hundreds of games it gradually takes over.
// ─────────────────────────────────────────────────────────────────────────────
class NeuralNet {
  // sizes: [inputSize, hidden1, hidden2, outputSize]  e.g. [57, 48, 24, 1]
  // lr:    learning rate (0.008 is a good starting point for this game)
  constructor(sizes, lr = 0.008) {
    this.sizes = sizes;
    this.lr    = lr;
    this.W     = [];   // W[l]: Float64Array, row-major (fo × fi)
    this.b     = [];   // b[l]: Float64Array, length fo

    for (let l = 0; l < sizes.length - 1; l++) {
      const fi = sizes[l], fo = sizes[l + 1];
      // He init — optimal variance for ReLU hidden layers; fine for sigmoid too
      const scale = Math.sqrt(2 / fi);
      this.W.push(Float64Array.from({ length: fo * fi },
        () => (Math.random() * 2 - 1) * scale));
      this.b.push(new Float64Array(fo));   // biases start at 0
    }
  }

  // ── Forward pass ─────────────────────────────────────────────────────────
  // Returns the scalar output in [0, 1].
  // Stores pre-activations (z) and activations (a) so backward() can reuse them.
  forward(input) {
    const L = this.W.length;
    this._a = new Array(L + 1);
    this._z = new Array(L);
    this._a[0] = input instanceof Float64Array ? input : Float64Array.from(input);

    for (let l = 0; l < L; l++) {
      const fi = this.sizes[l], fo = this.sizes[l + 1];
      const W  = this.W[l],    b  = this.b[l];
      const x  = this._a[l];
      const z  = new Float64Array(fo);
      const a  = new Float64Array(fo);

      for (let i = 0; i < fo; i++) {
        let s = b[i];
        const row = i * fi;
        for (let j = 0; j < fi; j++) s += W[row + j] * x[j];
        z[i] = s;
      }
      this._z[l] = z;

      if (l === L - 1) {
        // Sigmoid output — clamp arg to avoid exp overflow on either extreme
        for (let i = 0; i < fo; i++) {
          const v = z[i] < -30 ? -30 : z[i] > 30 ? 30 : z[i];
          a[i] = 1 / (1 + Math.exp(-v));
        }
      } else {
        // ReLU hidden
        for (let i = 0; i < fo; i++) a[i] = z[i] > 0 ? z[i] : 0;
      }
      this._a[l + 1] = a;
    }
    return this._a[L][0];
  }

  // ── Backward pass ─────────────────────────────────────────────────────────
  // MSE loss w.r.t. target scalar.  Must call forward() first.
  // Gradient clipping at ±1 per weight prevents early-training blow-up.
  backward(target) {
    const L  = this.W.length;
    const lr = this.lr;

    // Output delta: dMSE/dz = (a - target) * a*(1-a)
    const aOut = this._a[L][0];
    let delta  = new Float64Array(1);
    delta[0]   = (aOut - target) * aOut * (1 - aOut);

    for (let l = L - 1; l >= 0; l--) {
      const fi    = this.sizes[l], fo = this.sizes[l + 1];
      const W     = this.W[l],    b  = this.b[l];
      const prevA = this._a[l];
      const prevZ = l > 0 ? this._z[l - 1] : null;

      // 1. Compute delta for the previous layer BEFORE touching W.
      //    (ReLU grad: pass through only where pre-activation > 0)
      const newDelta = l > 0 ? new Float64Array(fi) : null;
      if (newDelta && prevZ) {
        for (let j = 0; j < fi; j++) {
          if (prevZ[j] <= 0) continue;   // ReLU gate — dead neuron, no gradient
          let s = 0;
          for (let i = 0; i < fo; i++) s += W[i * fi + j] * delta[i];
          newDelta[j] = s;
        }
      }

      // 2. Update this layer's weights and biases.
      for (let i = 0; i < fo; i++) {
        const d   = delta[i];
        const row = i * fi;
        // Clip bias gradient
        b[i] -= lr * (d < -1 ? -1 : d > 1 ? 1 : d);
        for (let j = 0; j < fi; j++) {
          const g = d * prevA[j];
          W[row + j] -= lr * (g < -1 ? -1 : g > 1 ? 1 : g);
        }
      }
      delta = newDelta;
    }
  }

  // ── Batch training ────────────────────────────────────────────────────────
  // samples: array of { features: Float64Array|number[], target: number }
  // epochs:  how many full passes over the batch
  trainBatch(samples, epochs = 3) {
    for (let e = 0; e < epochs; e++) {
      // Fisher–Yates shuffle each epoch so order doesn't bias learning
      for (let i = samples.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = samples[i]; samples[i] = samples[j]; samples[j] = tmp;
      }
      for (const s of samples) {
        this.forward(s.features);
        this.backward(s.target);
      }
    }
  }

  // ── Persistence ───────────────────────────────────────────────────────────
  toJSON() {
    return {
      sizes: this.sizes,
      lr:    this.lr,
      W:     this.W.map(w => Array.from(w)),
      b:     this.b.map(b => Array.from(b)),
    };
  }

  static fromJSON(d) {
    const net = new NeuralNet(d.sizes, d.lr);
    net.W = d.W.map(a => Float64Array.from(a));
    net.b = d.b.map(a => Float64Array.from(a));
    return net;
  }
}

class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [INIT]
  // ═══════════════════════════════════════════════════════════════════════════

  init(data) {
    // Ultimate choice arrives from MenuScene. Default to Drop Pod if missing.
    this.playerUltimate = (data && data.playerUltimate) || 'dropPod';
    // Custom deck (must be exactly 12 cards) — fall back to DEFAULT_DECK.
    this.playerDeck = (data && data.playerDeck && data.playerDeck.length === 12)
      ? data.playerDeck
      : [...DEFAULT_DECK];
  }

  create() {
    this.structures = [];
    this.playerSideCovers = [[], []];
    this.enemySideCovers  = [[], []];
    this.playerTurrets = [];
    this.enemyTurrets  = [];
    this.playerBase    = null;
    this.enemyBase     = null;

    // Single Y value per faction — AND gate means BOTH lanes must capture a row
    // before the deploy line advances.
    // Starting position: turret row — players can deploy from their turret line
    // all the way back to their base without capturing anything.
    this.playerDeployY = ROW_Y.playerTurret;   // y=565
    this.enemyDeployY  = ROW_Y.enemyTurret;    // y=85

    this._drawBackground();
    this._drawLanes();
    this._buildArena();

    // ── Match state ──────────────────────────────────────────────────────────
    this.energy             = ENERGY.startAmount;
    this.matchTimeRemaining = MATCH.durationSeconds;
    this.ultimateCharge     = 0;
    this.ultimateUsed       = false;
    this.units              = [];
    this.projectiles        = [];
    this.denialZones        = [];
    this.selectedCardIndex  = null;

    this.deck = this._shuffleDeck([...this.playerDeck]);
    this.hand = [];
    this._fillHand();

    // ── AI state ─────────────────────────────────────────────────────────────
    // Load cross-session AI meta before building the ai object.
    this._loadAiMeta();

    this.ai = {
      energy:           ENERGY.startAmount,
      deck:             this._shuffleDeck([...DEFAULT_DECK]),
      hand:             [],
      ultimateCharge:   0,
      ultimateUsed:     false,
      ultimateType:     this.playerUltimate === 'dropPod' ? 'orbitalStrike' : 'dropPod',
      pendingDeployMs:  0,
      threatLanes:      [false, false],
      actionsThisMatch: [],

      // Counter-pick: id of the card the player most recently deployed.
      lastPlayerCard:   null,

      // Strategy system — AI commits to a direction for ~25 s instead of
      // reacting card-by-card.  Strategies: balanced | rush_0 | rush_1 |
      // split | defend | counterpush | tempo
      strategy:         'balanced',
      strategyTimer:    0,     // ms until next strategy evaluation

      // Previous card played by the AI — used in combo-aware weight keys.
      prevCard:         null,

      // Within-match opponent model — counts player deploys per lane.
      playerLaneBias:   [0, 0],

      // Per-card deploy counts for the player this match — fed into _aiMeta
      // player profile at match end so AI learns what the player likes to play.
      playerCardCounts: {},

      // Exploration: fraction of decisions that are deliberately random.
      // Starts at meta.explorationRate and can be forced lower mid-match.
      explorationRate:  this._aiMeta.explorationRate,
    };
    this._fillAiHand();

    this.matchOver         = false;
    this.matchMode         = 'normal';   // 'normal' | 'suddenDeath' | 'tiebreaker'
    this.suddenDeathActive = false;
    this.suddenDeathTimer  = 0;
    this.tiebreakerLocked  = false;

    // Turret firing-arc indicators — flash briefly then fade so the player gets
    // the range information on placement without permanent visual clutter.
    this._drawTurretArcs();

    // Audio context — created lazily on first sound to satisfy browser autoplay rules.
    this._audioCtx = null;

    // Neural network — loaded from localStorage, trained after each match.
    this._loadAiNet();

    // Auto-play: AI controls the player side too (spectate / bug-watch mode).
    this.autoPlayPlayer    = localStorage.getItem('arenaClash_autoplay_v1') === '1';
    this._autoPlayPendingMs = 0;
    // Roll a fresh personality each match so the AI trains against diverse styles.
    this._rollPlayerBotPersonality();

    this.scene.launch('UIScene');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [BACKGROUND]
  // ═══════════════════════════════════════════════════════════════════════════

  _drawBackground() {
    const g = this.add.graphics();

    // ── Ground base — near-black alien rock ─────────────────────────────────
    g.fillStyle(COLORS.background, 1);
    g.fillRect(0, 0, ARENA.width, ARENA.height);

    // ── Sky band (top 15% — ~120px) with stars only in this zone ─────────────
    const skyH = Math.round(ARENA.height * 0.15);   // ~120px

    // Horizon gradient — faint bioluminescent teal bleeding up from planet surface
    // (drawn as stacked horizontal strips fading from teal to sky)
    const horizY = ROW_Y.enemyBase - 10;   // just above enemy base (~15px)
    const gradBand = 40;
    for (let dy = 0; dy < gradBand; dy++) {
      const t = dy / gradBand;
      // lerp from 0x0d2a22 toward 0x0a0d0e
      const r = Math.round(0x0d + (0x0a - 0x0d) * t);
      const gn = Math.round(0x2a + (0x0d - 0x2a) * t);
      const b  = Math.round(0x22 + (0x0e - 0x22) * t);
      const hex = (r << 16) | (gn << 8) | b;
      g.fillStyle(hex, 1);
      g.fillRect(0, horizY - gradBand + dy, ARENA.width, 1);
    }

    // Stars — single-pixel dots, SKY ONLY (y < skyH)
    for (let i = 0; i < 60; i++) {
      g.fillStyle(0xb8d8cc, Phaser.Math.FloatBetween(0.15, 0.4));
      g.fillRect(
        Phaser.Math.Between(0, ARENA.width),
        Phaser.Math.Between(0, skyH),
        1, 1
      );
    }

    // ── Mesa silhouettes on horizon (flat-topped shapes in near-black) ────────
    const mesaColor = 0x0d1510;
    const mesaDefs = [
      { x: 20,  w: 90,  h: 75 },
      { x: 90,  w: 60,  h: 55 },
      { x: 130, w: 100, h: 90 },
      { x: 280, w: 80,  h: 65 },
      { x: 350, w: 110, h: 80 },
      { x: 420, w: 55,  h: 45 },
    ];
    g.fillStyle(mesaColor, 1);
    for (const m of mesaDefs) {
      const baseY = horizY;
      g.fillRect(m.x, baseY - m.h, m.w, m.h);
    }

    // ── Bioluminescent ground veins — organic curved lines ────────────────────
    // 10 irregular curved paths across the lane surfaces
    const veinSeeds = [
      { sx: 50,  sy: 200, ex: 200, ey: 350, mx: 120, my: 260 },
      { sx: 80,  sy: 450, ex: 220, ey: 580, mx: 100, my: 510 },
      { sx: 30,  sy: 650, ex: 180, ey: 700, mx: 90,  my: 670 },
      { sx: 200, sy: 120, ex: 280, ey: 300, mx: 230, my: 200 },
      { sx: 160, sy: 380, ex: 230, ey: 550, mx: 185, my: 460 },
      { sx: 280, sy: 200, ex: 430, ey: 310, mx: 360, my: 240 },
      { sx: 310, sy: 420, ex: 460, ey: 560, mx: 390, my: 480 },
      { sx: 320, sy: 640, ex: 450, ey: 730, mx: 380, my: 680 },
      { sx: 100, sy: 300, ex: 170, ey: 440, mx: 140, my: 370 },
      { sx: 370, sy: 150, ex: 470, ey: 280, mx: 420, my: 210 },
    ];
    for (const v of veinSeeds) {
      g.lineStyle(1, COLORS.biolume, 0.55);
      g.beginPath();
      g.moveTo(v.sx, v.sy);
      g.lineTo(v.mx, v.my);   // approximate bezier via two line segments
      g.lineTo(v.ex, v.ey);
      g.strokePath();
      // Spore-like dot clusters along the vein
      g.fillStyle(COLORS.biolume, 0.4);
      g.fillCircle(v.mx, v.my, 1.5);
      g.fillCircle((v.sx + v.mx) / 2, (v.sy + v.my) / 2, 1);
    }

    // ── Purple mineral veins — straighter, geometric fractures ────────────────
    const mineralColor = 0x3a2a5a;
    const mineralVeins = [
      { x1: 40,  y1: 160, x2: 120, y2: 220 },
      { x1: 200, y1: 480, x2: 260, y2: 540 },
      { x1: 340, y1: 300, x2: 420, y2: 350 },
      { x1: 100, y1: 600, x2: 160, y2: 660 },
      { x1: 300, y1: 120, x2: 380, y2: 170 },
    ];
    for (const m of mineralVeins) {
      g.lineStyle(1, mineralColor, 0.45);
      g.beginPath();
      g.moveTo(m.x1, m.y1);
      g.lineTo(m.x2, m.y2);
      g.strokePath();
      // Branch at a sharp angle
      const mx = (m.x1 + m.x2) / 2;
      const my = (m.y1 + m.y2) / 2;
      g.beginPath();
      g.moveTo(mx, my);
      g.lineTo(mx + 18, my - 12);
      g.strokePath();
    }

    // ── Neutral midpoint line ─────────────────────────────────────────────────
    g.lineStyle(1, 0x1a2620, 0.6);
    g.beginPath();
    g.moveTo(0, ROW_Y.midpoint);
    g.lineTo(ARENA.width, ROW_Y.midpoint);
    g.strokePath();
    this.add.text(ARENA.width / 2, ROW_Y.midpoint - 1, '— NEUTRAL —', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', letterSpacing: 3,
    }).setOrigin(0.5, 1).setAlpha(0.8);
  }

  _drawLanes() {
    const g = this.add.graphics();
    // Single unified arena surface — the two lanes share one continuous field.
    // Covers act as bunker obstacles within this open space.
    g.fillStyle(COLORS.laneFloor, 1);
    g.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  // Midline drawn inside _drawBackground; this is a no-op kept for call-site compatibility.

  // ═══════════════════════════════════════════════════════════════════════════
  // [ARENA]
  // ═══════════════════════════════════════════════════════════════════════════

  _buildArena() {
    this.enemyBase = this._makeStructure('base', 'enemy', null,
      ARENA.width / 2, ROW_Y.enemyBase);

    for (let lane = 0; lane < LANE_CENTERS.length; lane++) {
      const cx = LANE_CENTERS[lane];

      this.enemyTurrets[lane] = this._makeStructure('turret', 'enemy', lane,
        cx, ROW_Y.enemyTurret);

      for (let i = 0; i < 3; i++) {
        this.enemySideCovers[lane][i] = this._makeCover('enemy', lane, i,
          cx, ROW_Y[COVER_ROWS.enemy[i]]);
      }
      for (let i = 0; i < 3; i++) {
        this.playerSideCovers[lane][i] = this._makeCover('player', lane, i,
          cx, ROW_Y[COVER_ROWS.player[i]]);
      }

      this.playerTurrets[lane] = this._makeStructure('turret', 'player', lane,
        cx, ROW_Y.playerTurret);
    }

    this.playerBase = this._makeStructure('base', 'player', null,
      ARENA.width / 2, ROW_Y.playerBase);
  }

  // When a turret is destroyed its tile becomes a capturable cover.
  // Visually: the hexagon fades to rubble-grey, a small cover stub appears below it.
  _convertTurretToCover(turret) {
    if (turret.convertedToCover) return;
    turret.convertedToCover = true;

    // Draw rubble overlay — alien rock fragments with cracked bioluminescent veins.
    const rg = this.add.graphics();
    const r  = SIZES.turret;
    rg.fillStyle(0x111a18, 1);
    rg.fillPoints(this._hexVertices(turret.x, turret.y, r * 0.9), true);
    rg.lineStyle(1, 0x1a2620, 0.9);
    rg.strokePoints(this._hexVertices(turret.x, turret.y, r * 0.9), true);
    // Cracked bioluminescent veins — damaged, still glowing faintly
    const crackColor = turret.owner === 'player' ? 0x0d2a22 : 0x2a0e0e;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 / 4) * i + 0.3;
      const x1 = turret.x + Math.cos(angle) * 4;
      const y1 = turret.y + Math.sin(angle) * 4;
      const x2 = turret.x + Math.cos(angle) * r * 0.6;
      const y2 = turret.y + Math.sin(angle) * r * 0.6;
      rg.lineStyle(1, crackColor, 0.7);
      rg.beginPath(); rg.moveTo(x1, y1); rg.lineTo(x2, y2); rg.strokePath();
    }
    // Turret sprite itself: darken and mute
    turret.sprite.setAlpha(0.25);

    const cover = this._makeCover(turret.owner, turret.lane, -1, turret.x, turret.y);
    cover.isTurretTile = true;
    cover.fromTurret   = turret;

    // Insert this cover into the appropriate lane array so capture chain
    // and deploy-zone logic sees it.  It sits "beyond" the 3 normal covers
    // on the owner's side — effectively extending the chain by one slot.
    if (turret.owner === 'player') {
      this.playerTurretCovers = this.playerTurretCovers || [null, null];
      this.playerTurretCovers[turret.lane] = cover;
    } else {
      this.enemyTurretCovers = this.enemyTurretCovers || [null, null];
      this.enemyTurretCovers[turret.lane] = cover;
    }
  }

  _makeCover(boardSide, lane, coverIndex, x, y) {
    const sprite = this._drawCover(x, y);
    return {
      type:             'cover',
      boardSide,
      owner:            COVER_STATE.neutral,
      lane,
      coverIndex,
      x, y,
      sprite,
      captureProgress:  0,
      stripProgress:    0,
      capturingFaction: null,
      progressGfx:      this.add.graphics(),
    };
  }

  _makeStructure(type, owner, lane, x, y) {
    const maxHp = STRUCTURE_HP[type];
    let sprite;
    if (type === 'turret') sprite = this._drawTurret(x, y, owner);
    if (type === 'base')   sprite = this._drawBase(x, y, owner);

    const hpBar = this._makeHpBar(x, y, type, owner);
    const structure = {
      type, owner, lane, x, y,
      hp: maxHp, maxHp, sprite, hpBar,
      lastTurretShotMs: 0,
      lastBaseShotMs:   0,
      stunRemainingMs:  0,
      hpBarVisible:     type !== 'base',  // base HP bar hidden until first hit
    };
    this.structures.push(structure);
    return structure;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [DRAWING]
  // ═══════════════════════════════════════════════════════════════════════════

  // Draws the cover initial graphic — always neutral on spawn.
  _drawCover(x, y) {
    const g = this.add.graphics();
    this._paintCoverNeutral(g, x, y);
    return g;
  }

  // Paints the neutral cover style onto a graphics object.
  _paintCoverNeutral(g, x, y) {
    const { w, h } = SIZES.cover;
    g.clear();
    // Shadow / depth beneath bunker
    g.fillStyle(0x060d0b, 0.6);
    g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, 4);
    // Main bunker body — dark mossy stone
    g.fillStyle(0x1e2e28, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    // Highlight top face — lighter stone surface
    g.fillStyle(0x243830, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h * 0.45, 4);
    // Border
    g.lineStyle(1, 0x2a3e34, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    // Bioluminescent moss seam along the top
    g.fillStyle(0x0d2a22, 0.35);
    g.fillRect(x - w / 2 + 6, y - h / 2 + 2, w - 12, 3);
  }

  // Paints the captured cover style for player or enemy.
  _paintCoverOwned(g, x, y, faction) {
    const { w, h } = SIZES.cover;
    g.clear();
    const fillColor   = faction === 'player' ? 0x0d2e2a : 0x2e0d0d;
    const topColor    = faction === 'player' ? 0x12423c : 0x421212;
    const borderColor = faction === 'player' ? 0x1a5a52 : 0x5a1a1a;
    const glowColor   = faction === 'player' ? 0x1a5a52 : 0x5a1a1a;
    // Shadow
    g.fillStyle(0x060d0b, 0.6);
    g.fillRoundedRect(x - w / 2 + 2, y - h / 2 + 3, w, h, 4);
    // Soft outer glow
    g.lineStyle(6, glowColor, 0.22);
    g.strokeRoundedRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 5);
    // Main body
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    // Top face
    g.fillStyle(topColor, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h * 0.45, 4);
    // Crisp border
    g.lineStyle(1.5, borderColor, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 4);
    // Faction glow seam
    g.fillStyle(glowColor, 0.40);
    g.fillRect(x - w / 2 + 6, y - h / 2 + 2, w - 12, 3);
  }

  _redrawCover(cover, colorOrFaction) {
    const { x, y } = cover;
    // Accept a faction string or a raw color int (for flash effects).
    if (colorOrFaction === 'player' || colorOrFaction === 'enemy') {
      this._paintCoverOwned(cover.sprite, x, y, colorOrFaction);
    } else if (colorOrFaction === COVER_STATE.neutral
            || colorOrFaction === 0x1a2620
            || colorOrFaction === COLORS.coverNeutral) {
      this._paintCoverNeutral(cover.sprite, x, y);
    } else {
      // Raw color — used for capture flash (white) then final state
      const { w, h } = SIZES.cover;
      cover.sprite.clear();
      cover.sprite.fillStyle(colorOrFaction, 0.95);
      cover.sprite.fillRoundedRect(x - w / 2, y - h / 2, w, h, 3);
      cover.sprite.lineStyle(1, colorOrFaction, 0.5);
      cover.sprite.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 3);
    }
  }

  // Faint sector showing each turret's attack range — shown briefly on match
  // start then fades out so the arena stays clean during gameplay.
  _drawTurretArcs() {
    const turretList = [
      ...this.playerTurrets.map(t => ({ turret: t, isPlayer: true })),
      ...this.enemyTurrets.map(t => ({ turret: t, isPlayer: false })),
    ];
    for (const { turret, isPlayer } of turretList) {
      const g = this.add.graphics();
      const color = isPlayer ? 0x1a5a52 : 0x5a1a1a;
      const startA = isPlayer ? Math.PI : 0;
      const endA   = isPlayer ? 0 : Math.PI;
      g.fillStyle(color, 0.10);
      g.lineStyle(1, color, 0.25);
      g.beginPath();
      g.moveTo(turret.x, turret.y);
      g.arc(turret.x, turret.y, STRUCTURE_ATTACK.turretRange, startA, endA, false);
      g.closePath();
      g.fillPath();
      g.strokePath();
      // Fade out after 1.5 s and then destroy — arcs are informational only.
      this.tweens.add({
        targets: g,
        alpha: 0,
        duration: 700,
        delay: 1500,
        onComplete: () => g.destroy(),
      });
    }
  }

  _drawTurret(x, y, faction) {
    const g = this.add.graphics();
    const r = SIZES.turret;
    const isPlayer = faction === 'player';
    const bodyFill   = isPlayer ? 0x0e3a3a : 0x3a0e0e;
    const circuitCol = isPlayer ? 0x1a5a52 : 0x5a1a1a;
    const edgeCol    = isPlayer ? 0x0d4a42 : 0x4a1212;
    const glowCol    = isPlayer ? 0x1a5a52 : 0x5a1a1a;

    const outerVerts = this._hexVertices(x, y, r);

    // Ambient glow bloom — organic bioluminescence around the stone hex
    g.fillStyle(glowCol, 0.12);
    g.fillPoints(this._hexVertices(x, y, r + 7), true);

    // Hex body — carved alien rock
    g.fillStyle(bodyFill, 1);
    g.fillPoints(outerVerts, true);

    // Outer edge stroke
    g.lineStyle(2, edgeCol, 1);
    g.strokePoints(outerVerts, true);

    // Circuit etchings — thin angular lines like alien writing
    g.lineStyle(1, circuitCol, 0.65);
    // Three short angular circuit lines across the face
    g.beginPath(); g.moveTo(x - r * 0.5, y - r * 0.2); g.lineTo(x - r * 0.1, y - r * 0.55); g.strokePath();
    g.beginPath(); g.moveTo(x + r * 0.5, y - r * 0.2); g.lineTo(x + r * 0.1, y - r * 0.55); g.strokePath();
    g.beginPath(); g.moveTo(x - r * 0.3, y + r * 0.2); g.lineTo(x + r * 0.3, y + r * 0.2);  g.strokePath();
    g.beginPath(); g.moveTo(x,            y + r * 0.2); g.lineTo(x,            y - r * 0.55); g.strokePath();

    // Center "eye" — small dot
    g.fillStyle(circuitCol, 0.9);
    g.fillCircle(x, y, 3.5);
    g.fillStyle(0x0a0d0e, 1);
    g.fillCircle(x, y, 1.5);

    return g;
  }

  _drawBase(x, y, faction) {
    const { w, h } = SIZES.base;
    const g = this.add.graphics();
    const isPlayer   = faction === 'player';
    const bodyFill   = isPlayer ? 0x0e3a3a : 0x3a0e0e;
    const borderCol  = isPlayer ? 0x1a5a52 : 0x5a1a1a;
    const glowCol    = isPlayer ? 0x1a5a52 : 0x5a1a1a;
    const circuitCol = isPlayer ? 0x0d4a42 : 0x4a1212;

    // Outer glow bloom — most prominent glow on the field
    g.fillStyle(glowCol, 0.18);
    g.fillRoundedRect(x - w / 2 - 8, y - h / 2 - 8, w + 16, h + 16, 10);

    // Body — carved alien rock fortress
    g.fillStyle(bodyFill, 1);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 6);

    // Circuit etching across the face — more complex than turrets
    g.lineStyle(1, circuitCol, 0.8);
    // Horizontal circuit bars
    g.beginPath(); g.moveTo(x - w * 0.35, y - h * 0.2); g.lineTo(x + w * 0.35, y - h * 0.2); g.strokePath();
    g.beginPath(); g.moveTo(x - w * 0.35, y + h * 0.15); g.lineTo(x + w * 0.35, y + h * 0.15); g.strokePath();
    // Vertical connectors
    g.beginPath(); g.moveTo(x - w * 0.2, y - h * 0.2); g.lineTo(x - w * 0.2, y + h * 0.15); g.strokePath();
    g.beginPath(); g.moveTo(x + w * 0.2, y - h * 0.2); g.lineTo(x + w * 0.2, y + h * 0.15); g.strokePath();
    // Small corner nodes
    g.fillStyle(circuitCol, 0.9);
    g.fillCircle(x - w * 0.2, y - h * 0.2, 2);
    g.fillCircle(x + w * 0.2, y - h * 0.2, 2);
    g.fillCircle(x - w * 0.2, y + h * 0.15, 2);
    g.fillCircle(x + w * 0.2, y + h * 0.15, 2);

    // Border
    g.lineStyle(2, borderCol, 1);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 6);

    const label = faction === 'player' ? 'PLAYER BASE' : 'ENEMY BASE';
    this.add.text(x, y, label, {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(1);
    return g;
  }

  _hexVertices(cx, cy, r) {
    return this._polyVertices(cx, cy, r, 6, -Math.PI / 6);
  }

  _polyVertices(cx, cy, r, sides, startAngle = 0) {
    const verts = [];
    for (let i = 0; i < sides; i++) {
      const angle = (Math.PI * 2 / sides) * i + startAngle;
      verts.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    return verts;
  }

  _octVertices(cx, cy, r) {
    return this._polyVertices(cx, cy, r, 8, -Math.PI / 8);
  }

  _starVertices(cx, cy, outerR, innerR, points) {
    const verts = [];
    for (let i = 0; i < points * 2; i++) {
      const angle = (Math.PI / points) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? outerR : innerR;
      verts.push({ x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) });
    }
    return verts;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [HP BARS]
  // ═══════════════════════════════════════════════════════════════════════════

  _makeHpBar(x, y, type, owner) {
    const { w: bw, h: bh } = type === 'base' ? SIZES.hpBarBase : SIZES.hpBarTurret;
    const halfHeight = type === 'base' ? SIZES.base.h / 2 : SIZES.turret;
    const gap  = 3;
    const barY = owner === 'enemy'
      ? y + halfHeight + gap
      : y - halfHeight - gap - bh;
    const barX = x - bw / 2;

    const bg = this.add.graphics();
    bg.fillStyle(COLORS.hpBack, 0.9);
    bg.fillRoundedRect(barX, barY, bw, bh, 2);
    // Very faint border
    bg.lineStyle(1, 0x080e06, 0.8);
    bg.strokeRoundedRect(barX, barY, bw, bh, 2);

    const fill = this.add.graphics();
    fill.fillStyle(COLORS.hpFull, 1);
    fill.fillRoundedRect(barX, barY, bw, bh, 2);

    // HP number text — small, muted, beside the bar
    const textY = owner === 'enemy' ? barY + bh + 1 : barY - 1;
    const hpText = this.add.text(x, textY, '', {
      fontSize: '7px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50',
    }).setOrigin(0.5, owner === 'enemy' ? 0 : 1).setDepth(2);

    // Base HP bars start hidden — revealed on first damage.
    if (type === 'base') {
      bg.setVisible(false);
      fill.setVisible(false);
      hpText.setVisible(false);
    }

    return { bg, fill, hpText, barX, barY, bw, bh };
  }

  refreshHpBar(structure) {
    const { hpBar, hp, maxHp } = structure;
    const ratio = Math.max(0, hp / maxHp);
    const fillColor = ratio > 0.5 ? COLORS.hpFull
                    : ratio > 0.25 ? COLORS.hpMid
                    :                 COLORS.hpLow;
    hpBar.fill.clear();
    if (ratio > 0) {
      hpBar.fill.fillStyle(fillColor, 1);
      hpBar.fill.fillRoundedRect(hpBar.barX, hpBar.barY, hpBar.bw * ratio, hpBar.bh, 2);
    }
    // Update numeric label
    if (hpBar.hpText) {
      hpBar.hpText.setText(`${Math.round(Math.max(0, hp))} / ${maxHp}`);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [COVERS]
  // ═══════════════════════════════════════════════════════════════════════════

  captureCover(cover, faction) {
    cover.owner            = faction;
    cover.captureProgress  = 0;
    cover.capturingFaction = null;
    this._refreshCaptureBar(cover);

    this._captureFlash(cover, faction);
    this.updateDeployZones();
    this._playSound('capture');

    // Spawn a tiny scatter of spore particles on capture
    this._spawnCaptureParticles(cover, faction);
  }

  // Draws the in-progress capture bar across the bottom edge of a cover sprite.
  // Called every time captureProgress changes and once on capture-complete (clears).
  _refreshCaptureBar(cover) {
    const g = cover.progressGfx;
    g.clear();
    if (cover.captureProgress <= 0 || cover.capturingFaction === null) return;
    const { w, h } = SIZES.cover;
    // Soft feathered sweep — the bioluminescent fill spreading through alien moss
    const color = cover.capturingFaction === 'player' ? COLORS.player : COLORS.enemy;
    const barW = w * Math.min(1, cover.captureProgress);
    const barX = cover.x - w / 2;
    const barY = cover.y + h / 2 - 4;
    // Background of progress trough
    g.fillStyle(0x0a0d0e, 0.7);
    g.fillRect(barX, barY, w, 4);
    // Fill
    g.fillStyle(color, 0.85);
    g.fillRect(barX, barY, barW, 4);
    // Feathered leading edge
    if (barW > 4) {
      g.fillStyle(color, 0.4);
      g.fillRect(barX + barW - 4, barY, 4, 4);
    }
  }

  _captureFlash(cover, faction) {
    // Brief white flash, then settle to new owner's alien-rock style.
    const flashColor = faction === 'player' ? 0x2a9a7a : 0x9a2a2a;
    this._redrawCover(cover, flashColor);
    this.time.delayedCall(300, () => {
      this._redrawCover(cover, faction);
    });
  }

  // 4–5 tiny spore particles float upward from the cover on capture
  _spawnCaptureParticles(cover, faction) {
    const glowColor = faction === 'player' ? 0x2a9a7a : 0x9a2a2a;
    const count = Phaser.Math.Between(4, 6);
    for (let i = 0; i < count; i++) {
      const px = cover.x + Phaser.Math.Between(-30, 30);
      const py = cover.y + Phaser.Math.Between(-4, 4);
      const p = this.add.graphics();
      p.fillStyle(glowColor, 0.9);
      p.fillCircle(px, py, 1.5);
      this.tweens.add({
        targets: p,
        y:       py - Phaser.Math.Between(12, 20),
        alpha:   0,
        duration: 600,
        delay:    i * 60,
        onComplete: () => p.destroy(),
      });
    }
  }

  getDeployY(faction) {
    return faction === 'player' ? this.playerDeployY : this.enemyDeployY;
  }

  // AND gate: deploy zone only advances when BOTH lanes have a row captured.
  // Capture chain for player (base→enemy): playerCover3→2→1, enemyCover1→2→3
  // Capture chain for enemy  (base→player): enemyCover3→2→1, playerCover1→2→3
  updateDeployZones() {
    const etc  = this.enemyTurretCovers  || [null, null];
    const ptc  = this.playerTurretCovers || [null, null];

    const playerChain = [
      [this.playerSideCovers[0][2], this.playerSideCovers[1][2]],
      [this.playerSideCovers[0][1], this.playerSideCovers[1][1]],
      [this.playerSideCovers[0][0], this.playerSideCovers[1][0]],
      [this.enemySideCovers[0][0],  this.enemySideCovers[1][0]],
      [this.enemySideCovers[0][1],  this.enemySideCovers[1][1]],
      [this.enemySideCovers[0][2],  this.enemySideCovers[1][2]],
    ];
    const playerChainYs = [
      ROW_Y.playerCover3, ROW_Y.playerCover2, ROW_Y.playerCover1,
      ROW_Y.enemyCover1,  ROW_Y.enemyCover2,  ROW_Y.enemyCover3,
    ];
    // Extend chain with enemy turret tiles if they exist.
    if (etc[0] && etc[1]) {
      playerChain.push([etc[0], etc[1]]);
      playerChainYs.push(ROW_Y.enemyTurret);
    }

    // Start from turret row — captured rows push the line further forward.
    this.playerDeployY = ROW_Y.playerTurret;
    for (let i = 0; i < playerChain.length; i++) {
      if (playerChain[i][0].owner === 'player' && playerChain[i][1].owner === 'player') {
        this.playerDeployY = playerChainYs[i];
      } else {
        break;
      }
    }

    const enemyChain = [
      [this.enemySideCovers[0][2],  this.enemySideCovers[1][2]],
      [this.enemySideCovers[0][1],  this.enemySideCovers[1][1]],
      [this.enemySideCovers[0][0],  this.enemySideCovers[1][0]],
      [this.playerSideCovers[0][0], this.playerSideCovers[1][0]],
      [this.playerSideCovers[0][1], this.playerSideCovers[1][1]],
      [this.playerSideCovers[0][2], this.playerSideCovers[1][2]],
    ];
    const enemyChainYs = [
      ROW_Y.enemyCover3, ROW_Y.enemyCover2, ROW_Y.enemyCover1,
      ROW_Y.playerCover1, ROW_Y.playerCover2, ROW_Y.playerCover3,
    ];
    // Extend with player turret tiles if they exist.
    if (ptc[0] && ptc[1]) {
      enemyChain.push([ptc[0], ptc[1]]);
      enemyChainYs.push(ROW_Y.playerTurret);
    }

    this.enemyDeployY = ROW_Y.enemyTurret;
    for (let i = 0; i < enemyChain.length; i++) {
      if (enemyChain[i][0].owner === 'enemy' && enemyChain[i][1].owner === 'enemy') {
        this.enemyDeployY = enemyChainYs[i];
      } else {
        break;
      }
    }
  }

  // Cover capture order: a faction can only capture cover i if all covers in that lane
  // with a smaller "distance to enemy" have already been captured by that faction.
  // Capture order for player: starts capturing own-side cover 2, then 1, then 0, then enemy 0, 1, 2.
  // Or — more simply — must capture the first cover the unit physically reaches.
  // Implementation: for the player to start capturing a cover, every cover between
  // their deploy zone and the cover must already be owned (no skipping).
  _canCapture(cover, faction) {
    if (cover.owner === faction) return false;

    // Turret-tile cover: capturable once the capturing faction has taken all 3
    // normal enemy-side covers in this lane (the cover is right in front of the base).
    if (cover.isTurretTile) {
      const lane = cover.lane;
      if (faction === 'player') {
        return this.enemySideCovers[lane].every(c => c.owner === 'player');
      } else {
        return this.playerSideCovers[lane].every(c => c.owner === 'enemy');
      }
    }

    const lane = cover.lane;
    // Build the ordered list of covers from the faction's base toward enemy base.
    // For player: playerSide covers from index 2..0 then enemySide covers 0..2 (going up Y).
    // For enemy:  enemySide covers from index 2..0 then playerSide covers 0..2 (going down Y).
    let chain;
    if (faction === 'player') {
      chain = [
        this.playerSideCovers[lane][2],
        this.playerSideCovers[lane][1],
        this.playerSideCovers[lane][0],
        this.enemySideCovers[lane][0],
        this.enemySideCovers[lane][1],
        this.enemySideCovers[lane][2],
      ];
    } else {
      chain = [
        this.enemySideCovers[lane][2],
        this.enemySideCovers[lane][1],
        this.enemySideCovers[lane][0],
        this.playerSideCovers[lane][0],
        this.playerSideCovers[lane][1],
        this.playerSideCovers[lane][2],
      ];
    }
    const idx = chain.indexOf(cover);
    if (idx < 0) return false;
    // Every prior cover in the chain must already be owned by this faction.
    for (let i = 0; i < idx; i++) {
      if (chain[i].owner !== faction) return false;
    }
    return true;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [UNITS] — spawn + body graphics
  // ═══════════════════════════════════════════════════════════════════════════

  // Public entry point: spawns a unit card for a faction at a lane.
  // Used by UIScene drag-drop and AI deployment. Returns true if spawned.
  spawnCard(cardId, faction, lane, overridePos) {
    const def = UNITS[cardId];
    if (!def) return false;

    // Non-troop cards trigger effects instead of placing a body.
    if (def.special === 'aoeProjectile') {
      this._fireAoeProjectile(def, faction, overridePos);
      this._playSound('deploy');
      return true;
    }
    if (def.special === 'stunGrenade') {
      this._fireStunGrenade(def, faction, overridePos);
      this._playSound('deploy');
      return true;
    }

    const count = def.count || 1;
    const baseX = LANE_CENTERS[lane];
    const baseY = overridePos
      ? overridePos.y
      : this.getDeployY(faction);

    // Wraith Squad: 3 bodies spaced horizontally
    for (let i = 0; i < count; i++) {
      const offsetX = (count > 1) ? (i - (count - 1) / 2) * 22 : 0;
      const spawnX = (overridePos ? overridePos.x : baseX) + offsetX;
      const spawnY = baseY;
      this._spawnUnitBody(def, faction, lane, spawnX, spawnY);
    }
    this._playSound('deploy');

    // ── Opponent modelling — record player deploy for AI to react to ─────────
    if (faction === 'player' && this.ai) {
      this.ai.playerLaneBias[lane] = (this.ai.playerLaneBias[lane] || 0) + 1;
      this.ai.playerCardCounts[cardId] = (this.ai.playerCardCounts[cardId] || 0) + 1;
    }

    return true;
  }

  _spawnUnitBody(def, faction, lane, x, y) {
    const color = def.tint !== null ? def.tint : COLORS[faction];
    const gfx = this.add.graphics();
    this._drawUnitShape(gfx, def, color, x, y, 1);

    // Stack-count text for Echo (created lazily so non-Echo units don't pay the cost).
    let stackText = null;
    if (def.special === 'damageAura') {
      stackText = this.add.text(x, y - 18, '0', {
        fontSize: '10px', fontFamily: 'monospace', fontStyle: 'bold', color: '#ffdd44',
      }).setOrigin(0.5, 0.5).setDepth(2);
    }

    const unit = {
      def,
      faction,
      lane,
      x, y,
      spawnX:    x,          // original X — used for lateral drift limit
      hp:        def.hp,
      maxHp:     def.hp,
      gfx,
      stackText,
      // Combat scheduling
      lastAttackMs:    0,
      spinUpRemaining: def.special === 'splashDamage' ? def.spinUpDelayMs : 0,
      // Capture progress only meaningful when standing on a cover
      capturingCover:  null,
      // Stun timer
      stunRemainingMs: 0,
      // Echo aura
      echoStacks:      0,
      echoStackTimer:  0,
      // Shard kill bookkeeping handled inline in attack code
      // Rift downed-state
      isDowned:        false,
      downedRemainMs:  0,
      // Forced target override (Decoy Drone aggro magnet)
      forcedTarget:    null,
      // Stationary flag for Decoy Drone / Sentry Tower
      stationary:      def.special === 'aggroMagnet' || def.special === 'stationary',
      // Current target (cached so we don't reselect every frame unnecessarily)
      target:          null,
    };

    this.units.push(unit);
    return unit;
  }

  // Draws the unit shape onto a graphics object at (x, y). `alpha` lets us dim
  // downed Rifts. The graphics object is reused per-frame: caller should .clear() first.
  _drawUnitShape(gfx, def, color, x, y, alpha) {
    gfx.clear();
    // Determine faction by comparing the green channel vs red channel:
    // Player teal (0x1a5a52): G=0x5a > R=0x1a → isPlayer=true
    // Enemy crimson (0x5a1a1a): G=0x1a < R=0x5a → isPlayer=false
    // Also handle custom tints: check unit faction via COLORS comparison.
    const R = (color >> 16) & 0xff;
    const G = (color >>  8) & 0xff;
    const isPlayer = G >= R;   // green-dominant → player teal; red-dominant → enemy crimson
    const unitFill   = isPlayer ? 0x0e4240 : 0x421010;
    const strokeCol  = isPlayer ? 0x1a5a52 : 0x5a1a1a;
    const glowCol    = isPlayer ? 0x1a5a52 : 0x5a1a1a;
    // Use tint override when the unit definition specifies one (Decoy, Sentry, etc.)
    const bodyColor  = (def.tint !== null && def.tint !== undefined) ? def.tint : unitFill;

    const r = def.radius;

    // Bioluminescent ground contact glow — soft circle beneath unit
    gfx.fillStyle(glowCol, 0.15 * alpha);
    gfx.fillCircle(x, y + r * 0.4, r * 1.4);

    gfx.fillStyle(bodyColor, alpha);
    switch (def.shape) {
      case 'circle':
        gfx.fillCircle(x, y, r);
        gfx.lineStyle(1.5, strokeCol, 0.85 * alpha);
        gfx.strokeCircle(x, y, r);
        break;
      case 'square': {
        // Octagon for tanks
        const oct = this._octVertices(x, y, r);
        gfx.fillPoints(oct, true);
        gfx.lineStyle(1.5, strokeCol, 0.85 * alpha);
        gfx.strokePoints(oct, true);
        break;
      }
      case 'triangle': {
        // Point in movement direction
        const dir = isPlayer ? -1 : 1;   // player units move up (negative Y)
        gfx.fillTriangle(x, y + dir * r, x - r, y - dir * r * 0.5, x + r, y - dir * r * 0.5);
        gfx.lineStyle(1.5, strokeCol, 0.85 * alpha);
        gfx.strokeTriangle(x, y + dir * r, x - r, y - dir * r * 0.5, x + r, y - dir * r * 0.5);
        break;
      }
      case 'diamond': {
        const diam = [
          { x, y: y - r }, { x: x + r, y }, { x, y: y + r }, { x: x - r, y },
        ];
        gfx.fillPoints(diam, true);
        gfx.lineStyle(1.5, strokeCol, 0.85 * alpha);
        gfx.strokePoints(diam, true);
        break;
      }
      case 'pentagon': {
        const pent = this._polyVertices(x, y, r, 5, -Math.PI / 2);
        gfx.fillPoints(pent, true);
        gfx.lineStyle(1.5, strokeCol, 0.85 * alpha);
        gfx.strokePoints(pent, true);
        break;
      }
      case 'star': {
        // Jagged star for Shard
        const star = this._starVertices(x, y, r, r * 0.5, 5);
        gfx.fillPoints(star, true);
        gfx.lineStyle(1.5, strokeCol, 0.85 * alpha);
        gfx.strokePoints(star, true);
        break;
      }
      default:
        // Fallback circle
        gfx.fillCircle(x, y, r);
        gfx.lineStyle(1.5, strokeCol, 0.85 * alpha);
        gfx.strokeCircle(x, y, r);
    }
    // Tiny HP pip background above unit (hidden until damaged — shown by _repaintUnit fill)
    if (def.hp > 0 && def.special !== 'aoeProjectile' && def.special !== 'stunGrenade') {
      const hpW = r * 2;
      gfx.fillStyle(COLORS.hpBack, 0.85);
      gfx.fillRect(x - hpW / 2, y - r - 6, hpW, 2);
    }
  }

  // Repaint a unit at its current position (called when it moves or HP changes).
  _repaintUnit(unit) {
    const color = unit.def.tint !== null ? unit.def.tint : COLORS[unit.faction];
    const alpha = unit.isDowned ? 0.4 : 1;
    this._drawUnitShape(unit.gfx, unit.def, color, unit.x, unit.y, alpha);

    // Health overlay on top of the pip baseline — hidden when at full HP
    if (unit.def.hp > 0 && !unit.isDowned && unit.hp < unit.maxHp) {
      const ratio = Math.max(0, unit.hp / unit.maxHp);
      const r = unit.def.radius;
      const hpW = r * 2;
      const fillColor = ratio > 0.5 ? COLORS.hpFull
                      : ratio > 0.25 ? COLORS.hpMid
                      :                 COLORS.hpLow;
      unit.gfx.fillStyle(fillColor, 1);
      unit.gfx.fillRect(unit.x - hpW / 2, unit.y - r - 6, hpW * ratio, 2);
    }

    if (unit.stackText) {
      unit.stackText.setPosition(unit.x, unit.y - unit.def.radius - 16);
      unit.stackText.setText(String(unit.echoStacks));
      unit.stackText.setVisible(unit.echoStacks > 0);
    }
  }

  _destroyUnit(unit, killer) {
    // Death particles
    this._spawnDeathParticles(unit.x, unit.y,
      unit.def.tint !== null ? unit.def.tint : COLORS[unit.faction]);

    unit.gfx.destroy();
    if (unit.stackText) unit.stackText.destroy();
    const idx = this.units.indexOf(unit);
    if (idx >= 0) this.units.splice(idx, 1);

    // Shard lifesteal — on kill, heal killer for a portion of damage dealt.
    if (killer && killer.def.special === 'lifesteal') {
      const heal = killer.def.damage * killer.def.lifestealPercent;
      killer.hp = Math.min(killer.maxHp, killer.hp + heal);
    }

    this._playSound('death');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [UNIT TICK] — movement, target acquisition, attacks, abilities
  // ═══════════════════════════════════════════════════════════════════════════

  _tickUnits(delta) {
    // Snapshot list because units can be removed mid-iteration.
    const allUnits = this.units.slice();

    // Echo aura stack timers — gain a stack every stackIntervalMs.
    for (const u of allUnits) {
      if (u.def.special === 'damageAura' && !u.isDowned) {
        u.echoStackTimer += delta;
        if (u.echoStackTimer >= u.def.stackIntervalMs) {
          u.echoStackTimer -= u.def.stackIntervalMs;
          u.echoStacks += 1;
        }
      }
    }

    // Decoy Drone aggro forcing — find all decoys, attach themselves as forced targets
    // to nearby enemies of their faction.
    for (const u of allUnits) u.forcedTarget = null;
    for (const decoy of allUnits) {
      if (decoy.def.special !== 'aggroMagnet' || decoy.isDowned) continue;
      const radius = decoy.def.aggroRadius;
      for (const other of allUnits) {
        if (other.faction === decoy.faction) continue;
        if (other.def.damage <= 0) continue;
        const dx = other.x - decoy.x;
        const dy = other.y - decoy.y;
        if (dx * dx + dy * dy <= radius * radius) {
          other.forcedTarget = decoy;
        }
      }
    }

    // Pulse passive heal — every Pulse heals friendlies within healRadius.
    for (const healer of allUnits) {
      if (healer.def.special !== 'aoeHeal' || healer.isDowned) continue;
      const hps   = healer.def.healPerSecond * (delta / 1000);
      const rSq   = healer.def.healRadius * healer.def.healRadius;
      for (const other of allUnits) {
        if (other.faction !== healer.faction) continue;
        if (other.isDowned) {
          // Pulse revives a downed Rift within riftReviveRadius.
          const dx = other.x - healer.x;
          const dy = other.y - healer.y;
          const reviveR = healer.def.riftReviveRadius;
          if (dx * dx + dy * dy <= reviveR * reviveR && other.def.special === 'lastStand') {
            other.isDowned       = false;
            other.downedRemainMs = 0;
            other.hp             = other.maxHp * 0.30;
            this._repaintUnit(other);
          }
          continue;
        }
        if (other.hp >= other.maxHp) continue;
        const dx = other.x - healer.x;
        const dy = other.y - healer.y;
        if (dx * dx + dy * dy <= rSq) {
          other.hp = Math.min(other.maxHp, other.hp + hps);
        }
      }
    }

    // Denial zones from Nova Grenade — damage units inside.
    this._tickDenialZones(delta, allUnits);

    // Per-unit tick: stun, downed timer, movement, capture, combat.
    for (const u of allUnits) {
      if (this.units.indexOf(u) < 0) continue;  // already destroyed this frame

      // Stun timer
      if (u.stunRemainingMs > 0) {
        u.stunRemainingMs = Math.max(0, u.stunRemainingMs - delta);
        this._repaintUnit(u);
        continue;
      }

      // Rift downed timer
      if (u.isDowned) {
        u.downedRemainMs -= delta;
        if (u.downedRemainMs <= 0) {
          // Time ran out — die for real.
          this._destroyUnit(u, null);
        }
        continue;
      }

      // Spin-up delay (Siege Mech can't attack until done, but it can move).
      if (u.spinUpRemaining > 0) {
        u.spinUpRemaining = Math.max(0, u.spinUpRemaining - delta);
      }

      // Find target (structure > forced > nearest enemy)
      this._acquireTarget(u);

      // Movement: walk forward in lane unless stationary or in attack range of target.
      this._tickMovement(u, delta);

      // Capture cover progress.
      this._tickCapture(u, delta);

      // Attacks.
      this._tickAttack(u, delta);

      this._repaintUnit(u);
    }
  }

  // Determine the best target for a unit, store it in u.target.
  _acquireTarget(u) {
    if (u.def.damage <= 0) { u.target = null; return; }

    // Forced target (Decoy Drone) takes priority if it's still alive.
    if (u.forcedTarget && this.units.indexOf(u.forcedTarget) >= 0 && !u.forcedTarget.isDowned) {
      u.target = u.forcedTarget;
      return;
    }

    const enemyFaction = u.faction === 'player' ? 'enemy' : 'player';
    let best     = null;
    let bestDist = Infinity;
    const range  = u.def.range;

    // 1. Structures in same lane (cover not damageable, but turret/base are).
    //    Also: covers belonging to the enemy block movement and act as targets.
    //    Per spec target priority is structures > high-threat > nearest enemy.
    //    We treat enemy-owned covers/turrets/base in the unit's lane as primary targets.
    for (const s of this.structures) {
      if (s.owner !== enemyFaction) continue;
      if (s.hp <= 0) continue;
      // Only same-lane turrets count; bases span both lanes and always count.
      if (s.type === 'turret' && s.lane !== u.lane) continue;
      // Base spans the full arena width — use nearest-edge horizontal distance so
      // units in either lane correctly register as adjacent to the base even though
      // they are laterally offset from its centre point.
      const halfBaseW = s.type === 'base' ? SIZES.base.w / 2 : 0;
      const dx = s.type === 'base'
        ? Math.max(0, Math.abs(u.x - s.x) - halfBaseW)
        : s.x - u.x;
      const dy = s.y - u.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d <= range && d < bestDist) {
        bestDist = d;
        best     = s;
      }
    }

    if (best) { u.target = best; return; }

    // 2. Nearest enemy unit in range.
    for (const other of this.units) {
      if (other.faction === u.faction) continue;
      if (other.isDowned) continue;
      const dx = other.x - u.x;
      const dy = other.y - u.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d <= range && d < bestDist) {
        bestDist = d;
        best     = other;
      }
    }
    u.target = best;
  }

  _tickMovement(u, delta) {
    if (u.stationary) return;
    if (u.def.speed <= 0) return;

    // ── Capturing units are rooted to their cover ─────────────────────────────
    // Ranged units can still fire (handled by _tickAttack) but may not walk away.
    if (u.capturingCover) {
      const c = u.capturingCover;
      u.y = c.y;
      // Units pick a side of the bunker — first unit goes left, second goes right.
      // _coverSlot is assigned once when capture begins (in captureCover).
      const slotX = c.x + (u._coverSlot === 1 ? 25 : -25);
      if (Math.abs(u.x - slotX) > 2) {
        u.x += Math.sign(slotX - u.x) *
               Math.min(Math.abs(slotX - u.x), 40 * (delta / 1000));
      }
      return;
    }

    // ── Determine speed multiplier ────────────────────────────────────────────
    // Ranged units (range > 80px) slow to 60% while actively firing.
    // Melee units stop entirely when target is in attack range.
    const isRanged = u.def.range > 80;
    if (u.target) {
      const dx = u.target.x - u.x;
      const dy = u.target.y - u.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      if (d <= u.def.range) {
        if (!isRanged) return;   // melee: hold
        // ranged: continue at 60 % below
      }
    }
    const speedMult = (isRanged && u.target) ? 0.6 : 1.0;

    // ── Lateral drift toward off-lane targets ─────────────────────────────────
    // Units can drift up to 80px from their spawn X to chase nearby enemies.
    const MAX_DRIFT  = 80;
    const aggroRange = isRanged ? u.def.range : 60;   // melee aggro = 60px
    let   driftX     = null;

    if (u.target) {
      // Already have a target — drift toward it laterally (capped by MAX_DRIFT).
      driftX = Phaser.Math.Clamp(u.target.x, u.spawnX - MAX_DRIFT, u.spawnX + MAX_DRIFT);
    } else {
      // No in-range target: scan aggro zone for an off-lane enemy to drift toward.
      let nearestD = Infinity;
      for (const other of this.units) {
        if (other.faction === u.faction || other.isDowned) continue;
        const dx = other.x - u.x;
        const dy = other.y - u.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d < aggroRange && d < nearestD) {
          nearestD = d;
          driftX   = Phaser.Math.Clamp(other.x, u.spawnX - MAX_DRIFT, u.spawnX + MAX_DRIFT);
        }
      }
    }

    // Apply lateral drift (half movement speed laterally).
    if (driftX !== null && Math.abs(u.x - driftX) > 2) {
      const lateralStep = u.def.speed * speedMult * (delta / 1000) * 0.5;
      u.x += Math.sign(driftX - u.x) * Math.min(lateralStep, Math.abs(driftX - u.x));
    } else if (driftX === null && Math.abs(u.x - u.spawnX) > 2) {
      // No target: drift back to spawn lane.
      const returnStep = 25 * (delta / 1000);
      u.x += Math.sign(u.spawnX - u.x) * Math.min(returnStep, Math.abs(u.spawnX - u.x));
    }

    // ── Forward (Y) movement ──────────────────────────────────────────────────
    const dir  = u.faction === 'player' ? -1 : 1;
    const newY = u.y + dir * u.def.speed * speedMult * (delta / 1000);

    // ── Cover blocking ────────────────────────────────────────────────────────
    // Only cover-seeker units stop at capturable covers.
    // Tanks, ranged, AOE, threats walk straight through.
    if (u.def.coverSeeker) {
      const lane      = u.lane;
      const allCovers = [...this.playerSideCovers[lane], ...this.enemySideCovers[lane]];
      if (this.playerTurretCovers && this.playerTurretCovers[lane]) allCovers.push(this.playerTurretCovers[lane]);
      if (this.enemyTurretCovers  && this.enemyTurretCovers[lane])  allCovers.push(this.enemyTurretCovers[lane]);

      // ── Queued behind a full cover ─────────────────────────────────────────
      // If this unit is waiting for a slot at a cover that was previously full,
      // check whether to take a slot, advance, or keep holding position.
      if (u._waitingForCover) {
        const c = u._waitingForCover;
        // Release: cover is now ours, OR it's no longer capturable (ordering changed).
        if (c.owner === u.faction || !this._canCapture(c, u.faction)) {
          u._waitingForCover = null;
          // Fall through to the normal cover loop below so this frame still checks
          // whether the unit should stop at the next cover.
        } else {
          const alreadyHere = this.units.filter(
            v => v !== u && v.faction === u.faction && v.capturingCover === c
          );
          if (alreadyHere.length < 2) {
            // A slot just opened — step up and take it.
            const takenSlots = new Set(alreadyHere.map(v => v._coverSlot));
            u._coverSlot     = takenSlots.has(0) ? 1 : 0;
            u.y              = c.y;
            u.capturingCover = c;
            u._waitingForCover = null;
            return;
          }
          // Still full — release the queue so the unit continues forward.
          u._waitingForCover = null;
          // Fall through to normal cover loop below.
        }
      }

      for (const c of allCovers) {
        if (c.owner === u.faction) continue;
        if (!this._canCapture(c, u.faction)) continue;
        if (Math.abs(u.x - c.x) > 100) continue;

        const crossingDown = dir ===  1 && u.y <= c.y && newY >= c.y - 4;
        const crossingUp   = dir === -1 && u.y >= c.y && newY <= c.y + 4;
        if (crossingDown || crossingUp) {
          // Only hold if fewer than 2 friendly units already on this cover.
          const alreadyHere = this.units.filter(
            v => v !== u && v.faction === u.faction && v.capturingCover === c
          );
          if (alreadyHere.length < 2) {
            // Assign a bunker slot: slot 0 = left side, slot 1 = right side.
            const takenSlots = new Set(alreadyHere.map(v => v._coverSlot));
            u._coverSlot     = takenSlots.has(0) ? 1 : 0;
            u.y              = c.y;
            u.capturingCover = c;   // set NOW so next unit in same frame sees slot taken
            return;
          }
          // Cover full — let the unit pass through and keep advancing.
          break;
        }
      }
    }

    u.y = Phaser.Math.Clamp(newY, 10, ARENA.height - 10);
  }

  _tickCapture(u, delta) {
    if (!u.def.coverSeeker) return;
    if (u._waitingForCover) return;   // handled entirely by _tickMovement's queue logic

    // Find a cover the unit is currently overlapping (±60px x, ±20px y).
    const lane = u.lane;
    const allCovers = [...this.playerSideCovers[lane], ...this.enemySideCovers[lane]];
    if (this.playerTurretCovers && this.playerTurretCovers[lane]) allCovers.push(this.playerTurretCovers[lane]);
    if (this.enemyTurretCovers  && this.enemyTurretCovers[lane])  allCovers.push(this.enemyTurretCovers[lane]);
    let standing = null;
    for (const c of allCovers) {
      if (Math.abs(u.x - c.x) <= 80 && Math.abs(u.y - c.y) <= 22) {
        if (this._canCapture(c, u.faction)) { standing = c; break; }
      }
    }

    if (!standing) {
      if (u.capturingCover) u.capturingCover = null;
      return;
    }

    // Only assign this cover if it has room — the hard cap is 2 friendly units per cover.
    // Without this check, pass-through units (let go by _tickMovement because the cover
    // is full) would be immediately re-grabbed here and rooted at the cover next frame.
    if (u.capturingCover !== standing) {
      const alreadyHere = this.units.filter(
        v => v !== u && v.faction === u.faction && v.capturingCover === standing
      );
      if (alreadyHere.length >= 2) {
        // Cover is full — ensure this unit stays unassigned so it can keep marching.
        u.capturingCover = null;
        return;
      }
      // Assign slot (mirrors the logic in _tickMovement's crossing check).
      const takenSlots = new Set(alreadyHere.map(v => v._coverSlot));
      u._coverSlot     = takenSlots.has(0) ? 1 : 0;
      u.capturingCover = standing;
    }

    // Multiple units stack capture rate additively (handled by tickCovers loop below).
  }

  // After per-unit tick, advance progress on each cover being captured.
  // Also handles: contested pulsing, capture progress decay, stun pausing.
  _tickCovers(delta) {
    const allCovers = [];
    for (let lane = 0; lane < LANE_CENTERS.length; lane++) {
      allCovers.push(...this.playerSideCovers[lane], ...this.enemySideCovers[lane]);
    }
    if (this.playerTurretCovers) allCovers.push(...this.playerTurretCovers.filter(Boolean));
    if (this.enemyTurretCovers)  allCovers.push(...this.enemyTurretCovers.filter(Boolean));

    for (const c of allCovers) {
      // Collect non-stunned, non-downed capturers (max 2 per faction — extra units
      // don't speed up capture, they just make dislodging harder).
      let playerCount = 0, enemyCount = 0;
      for (const u of this.units) {
        if (u.capturingCover !== c) continue;
        if (u.isDowned || u.stunRemainingMs > 0) continue;
        if (u.faction === 'player' && playerCount < 2) playerCount++;
        else if (u.faction === 'enemy' && enemyCount < 2) enemyCount++;
      }

      // ── Contested: both sides present — all timers freeze, cover pulses ────
      if (playerCount > 0 && enemyCount > 0) {
        c.contested       = true;
        c.decayDelay      = 0;   // reset decay timer — someone is here
        c.pulseTimer      = (c.pulseTimer || 0) + delta;
        if (c.pulseTimer >= 400) {   // per spec: 0.4s pulse
          c.pulseTimer  = 0;
          c.pulsePhase  = !c.pulsePhase;
          if (c.pulsePhase) {
            this._paintCoverNeutral(c.sprite, c.x, c.y);   // neutral state
          } else if (c.owner !== COVER_STATE.neutral) {
            this._paintCoverOwned(c.sprite, c.x, c.y, c.owner);  // owner state
          } else {
            this._paintCoverNeutral(c.sprite, c.x, c.y);
          }
        }
        continue;
      }
      // Leaving contested state — restore owner style once.
      if (c.contested) {
        c.contested   = false;
        c.pulseTimer  = 0;
        c.pulsePhase  = false;
        if (c.owner !== COVER_STATE.neutral) {
          this._paintCoverOwned(c.sprite, c.x, c.y, c.owner);
        } else {
          this._paintCoverNeutral(c.sprite, c.x, c.y);
        }
      }

      let dominant = null;
      if (playerCount > 0) dominant = 'player';
      if (enemyCount > 0)  dominant = 'enemy';

      // ── No one present: apply capture progress decay ───────────────────────
      if (!dominant) {
        if (c.captureProgress > 0) {
          c.decayDelay = (c.decayDelay || 0) + delta;
          if (c.decayDelay > COVER_DECAY.delayMs) {
            c.captureProgress = Math.max(0, c.captureProgress - COVER_DECAY.ratePerMs * delta);
            this._refreshCaptureBar(c);
            if (c.captureProgress <= 0) {
              c.captureProgress  = 0;
              c.capturingFaction = null;
              c.decayDelay       = 0;
              this._refreshCaptureBar(c);
            }
          }
        }
        continue;
      }
      // Someone is here — reset decay timer.
      c.decayDelay = 0;

      if (c.capturingFaction && c.capturingFaction !== dominant) {
        // Faction switch: if the cover is already owned, the enemy must first spend
        // RECAPTURE_STRIP_MS to strip the claim before the 8-second capture starts.
        if (c.owner !== COVER_STATE.neutral && c.owner !== dominant) {
          c.stripProgress = (c.stripProgress || 0) + delta;
          if (c.stripProgress < RECAPTURE_STRIP_MS) {
            this._refreshCaptureBar(c);
            continue;  // still stripping — don't advance capture yet
          }
          // Strip complete — claim removed, start normal capture.
          c.stripProgress    = 0;
          c.owner            = COVER_STATE.neutral;
          c.captureProgress  = 0;
          this._paintCoverNeutral(c.sprite, c.x, c.y);
          this.updateDeployZones();
        } else {
          // Neutral cover — just reset progress.
          c.captureProgress = 0;
          c.stripProgress   = 0;
        }
      }
      c.capturingFaction = dominant;
      c.stripProgress    = 0;

      // Capture takes exactly CAPTURE_TIME_MS — stun pauses it (unit is not counted
      // above when stunRemainingMs > 0, so naturally no dominant → no progress).
      c.captureProgress += delta / CAPTURE_TIME_MS;
      this._refreshCaptureBar(c);
      if (c.captureProgress >= 1) {
        this.captureCover(c, dominant);
      }
    }
  }

  _tickAttack(u, delta) {
    if (!u.target) return;
    if (u.def.damage <= 0) return;
    if (u.spinUpRemaining > 0) return;

    u.lastAttackMs += delta;
    const cooldown = 1000 / u.def.attackSpeed;
    if (u.lastAttackMs < cooldown) return;
    u.lastAttackMs = 0;

    // Damage multiplier from any friendly Echo aura within auraRadius.
    let dmgMult = 1;
    for (const buffer of this.units) {
      if (buffer.def.special !== 'damageAura') continue;
      if (buffer.faction !== u.faction) continue;
      if (buffer.isDowned) continue;
      const dx = buffer.x - u.x;
      const dy = buffer.y - u.y;
      if (dx * dx + dy * dy <= buffer.def.auraRadius * buffer.def.auraRadius) {
        dmgMult += buffer.echoStacks * buffer.def.damageBoostPerStack;
      }
    }

    const damage = u.def.damage * dmgMult;

    // Splash damage (Siege Mech): hit all enemy units within splashRadius of target.
    if (u.def.special === 'splashDamage') {
      this._dealDamage(u.target, damage, u);
      const sr = u.def.splashRadius;
      for (const v of this.units.slice()) {
        if (v === u.target || v.faction === u.faction) continue;
        const dx = v.x - u.target.x;
        const dy = v.y - u.target.y;
        if (dx * dx + dy * dy <= sr * sr) this._dealDamage(v, damage, u);
      }
    } else {
      this._dealDamage(u.target, damage, u);
    }
  }

  // Apply damage to a unit or structure. `attacker` enables Shard lifesteal on kill.
  _dealDamage(target, amount, attacker) {
    if (!target || target.hp <= 0) return;
    target.hp -= amount;

    if (target.type === 'turret' || target.type === 'base') {
      // Reveal base HP bar on first hit.
      if (target.type === 'base' && !target.hpBarVisible) {
        target.hpBarVisible = true;
        target.hpBar.bg.setVisible(true);
        target.hpBar.fill.setVisible(true);
        target.hpBar.hpText.setVisible(true);
      }
      this.refreshHpBar(target);
      if (target === this.playerBase) {
        this.cameras.main.shake(120, 0.008);
      }
      if (target.hp <= 0) {
        target.sprite.setAlpha(0.25);
        if (target.type === 'turret') this._convertTurretToCover(target);
        this._checkSuddenDeathWin(target);
        this._checkTiebreakerWin(target);
        this.events.emit('scoreChanged');   // UIScene listens for score pop animation
      }
      return;
    }

    // Unit target.
    if (target.hp <= 0) {
      // Rift last-stand check.
      if (target.def.special === 'lastStand' && !target.isDowned) {
        target.isDowned       = true;
        target.downedRemainMs = target.def.downedDurationMs;
        target.hp             = 1;
        return;
      }
      this._destroyUnit(target, attacker);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [PROJECTILES] — turret bullets, grenades, orbital strike
  // ═══════════════════════════════════════════════════════════════════════════

  _tickTurrets(delta) {
    for (const t of this.structures) {
      if (t.type !== 'turret') continue;
      if (t.hp <= 0) continue;
      // Tick down stun — stunned turrets can't fire.
      if (t.stunRemainingMs > 0) {
        t.stunRemainingMs = Math.max(0, t.stunRemainingMs - delta);
        continue;
      }

      t.lastTurretShotMs += delta;
      if (t.lastTurretShotMs < STRUCTURE_ATTACK.turretFireRateMs) continue;

      // Find nearest enemy unit within 200px.
      const enemyFaction = t.owner === 'player' ? 'enemy' : 'player';
      let best = null, bestDist = Infinity;
      for (const u of this.units) {
        if (u.faction !== enemyFaction || u.isDowned) continue;
        const dx = u.x - t.x, dy = u.y - t.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d <= STRUCTURE_ATTACK.turretRange && d < bestDist) { best = u; bestDist = d; }
      }
      if (!best) continue;

      t.lastTurretShotMs = 0;
      this._spawnTurretBullet(t, best);
    }
  }

  _tickBases(delta) {
    for (const base of [this.playerBase, this.enemyBase]) {
      if (!base || base.hp <= 0) continue;
      // Base only wakes up after it has been hit OR one of its own turrets is gone.
      const turrets = base.owner === 'player' ? this.playerTurrets : this.enemyTurrets;
      const awake   = base.hp < base.maxHp || turrets.some(t => t.hp <= 0);
      if (!awake) continue;
      if (base.stunRemainingMs > 0) {
        base.stunRemainingMs = Math.max(0, base.stunRemainingMs - delta);
        continue;
      }
      base.lastBaseShotMs += delta;
      if (base.lastBaseShotMs < STRUCTURE_ATTACK.baseFireRateMs) continue;  // 800ms

      const enemyFaction = base.owner === 'player' ? 'enemy' : 'player';
      let best = null, bestDist = Infinity;
      for (const u of this.units) {
        if (u.faction !== enemyFaction || u.isDowned) continue;
        const dx = u.x - base.x, dy = u.y - base.y;
        const d  = Math.sqrt(dx * dx + dy * dy);
        if (d <= STRUCTURE_ATTACK.baseRange && d < bestDist) { best = u; bestDist = d; }
      }
      if (!best) continue;

      base.lastBaseShotMs = 0;
      this._spawnTurretBullet(base, best, STRUCTURE_ATTACK.baseDamage);
    }
  }

  _spawnTurretBullet(turret, target, overrideDamage) {
    const gfx = this.add.graphics();
    const color = COLORS[turret.owner];
    gfx.fillStyle(color, 1);
    gfx.fillCircle(turret.x, turret.y, 3);

    this.projectiles.push({
      kind:     'bullet',
      x:        turret.x,
      y:        turret.y,
      tx:       target.x,
      ty:       target.y,
      target,
      speed:    400,
      damage:   overrideDamage !== undefined ? overrideDamage : STRUCTURE_ATTACK.turretDamage,
      faction:  turret.owner,
      gfx,
      color,
    });
  }

  _tickProjectiles(delta) {
    for (const p of this.projectiles.slice()) {
      // Re-aim at target if still alive (simple homing).
      if (p.target && this.units.indexOf(p.target) >= 0 && !p.target.isDowned) {
        p.tx = p.target.x;
        p.ty = p.target.y;
      }
      const dx = p.tx - p.x;
      const dy = p.ty - p.y;
      const d  = Math.sqrt(dx * dx + dy * dy);
      const step = p.speed * (delta / 1000);

      if (d <= step) {
        // Impact.
        if (p.kind === 'bullet' && p.target && this.units.indexOf(p.target) >= 0) {
          this._dealDamage(p.target, p.damage, null);
        }
        p.gfx.destroy();
        const idx = this.projectiles.indexOf(p);
        if (idx >= 0) this.projectiles.splice(idx, 1);
        continue;
      }

      const nx = (dx / d) * step;
      const ny = (dy / d) * step;
      p.x += nx;
      p.y += ny;
      p.gfx.clear();
      p.gfx.fillStyle(p.color, 1);
      p.gfx.fillCircle(p.x, p.y, 3);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [EFFECTS] — denial zones, explosions, particles
  // ═══════════════════════════════════════════════════════════════════════════

  _fireAoeProjectile(def, faction, pos) {
    // Animate a small diamond flying from the deployer's base to the target,
    // then explode and create a denial zone.
    const startY = faction === 'player' ? ROW_Y.playerBase : ROW_Y.enemyBase;
    const startX = ARENA.width / 2;
    const gfx = this.add.graphics();

    const flight = { t: 0 };
    this.tweens.add({
      targets: flight,
      t: 1,
      duration: 400,
      onUpdate: () => {
        const t = flight.t;
        const x = startX + (pos.x - startX) * t;
        const y = startY + (pos.y - startY) * t;
        gfx.clear();
        gfx.fillStyle(def.tint, 1);
        gfx.fillTriangle(x, y - 8, x - 8, y, x, y + 8);
        gfx.fillTriangle(x, y - 8, x + 8, y, x, y + 8);
      },
      onComplete: () => {
        gfx.destroy();
        this._explodeAt(pos.x, pos.y, def.blastRadius, def.damage, faction);
        this._createDenialZone(pos.x, pos.y, def.blastRadius, def.denialDurationMs, faction);
      },
    });
  }

  _fireStunGrenade(def, faction, pos) {
    const startY = faction === 'player' ? ROW_Y.playerBase : ROW_Y.enemyBase;
    const startX = ARENA.width / 2;
    const gfx = this.add.graphics();
    const flight = { t: 0 };
    this.tweens.add({
      targets: flight,
      t: 1,
      duration: 400,
      onUpdate: () => {
        const t = flight.t;
        const x = startX + (pos.x - startX) * t;
        const y = startY + (pos.y - startY) * t;
        gfx.clear();
        gfx.fillStyle(def.tint, 1);
        gfx.fillTriangle(x, y - 8, x - 8, y, x, y + 8);
        gfx.fillTriangle(x, y - 8, x + 8, y, x, y + 8);
      },
      onComplete: () => {
        gfx.destroy();
        this._stunArea(pos.x, pos.y, def.stunRadius, def.stunDurationMs, faction);
        this._explodeRing(pos.x, pos.y, def.stunRadius, 0x2a7a8a);   // teal stun ring
      },
    });
  }

  _explodeAt(x, y, radius, damage, faction) {
    this._playSound('explosion');
    // Visual ring
    this._explodeRing(x, y, radius, 0x8a4a10);   // amber explosion ring

    // Damage all enemy units in radius.
    for (const u of this.units.slice()) {
      if (u.faction === faction) continue;
      const dx = u.x - x, dy = u.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        this._dealDamage(u, damage, null);
      }
    }
    // Damage enemy structures in radius too.
    for (const s of this.structures) {
      if (s.owner === faction || s.hp <= 0) continue;
      const dx = s.x - x, dy = s.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        this._dealDamage(s, damage, null);
      }
    }
  }

  _explodeRing(x, y, maxRadius, color) {
    const gfx = this.add.graphics();
    const state = { r: 0, a: 0.7 };
    this.tweens.add({
      targets: state,
      r: maxRadius,
      a: 0,
      duration: 300,
      onUpdate: () => {
        gfx.clear();
        gfx.lineStyle(3, color, state.a);
        gfx.strokeCircle(x, y, state.r);
        gfx.fillStyle(color, state.a * 0.3);
        gfx.fillCircle(x, y, state.r);
      },
      onComplete: () => gfx.destroy(),
    });
  }

  _createDenialZone(x, y, radius, durationMs, faction) {
    const gfx = this.add.graphics();
    // Denial zone — dark amber/crimson area denial (alien scorch mark)
    gfx.fillStyle(0x3a1a00, 0.25);
    gfx.fillCircle(x, y, radius);
    gfx.lineStyle(1, 0x5a2a00, 0.55);
    gfx.strokeCircle(x, y, radius);

    this.denialZones.push({
      x, y, radius,
      remainingMs: durationMs,
      damagePerSecond: 5,
      faction,
      gfx,
    });
  }

  _tickDenialZones(delta, allUnits) {
    for (const z of this.denialZones.slice()) {
      z.remainingMs -= delta;
      if (z.remainingMs <= 0) {
        z.gfx.destroy();
        const idx = this.denialZones.indexOf(z);
        if (idx >= 0) this.denialZones.splice(idx, 1);
        continue;
      }
      const dmg = z.damagePerSecond * (delta / 1000);
      for (const u of allUnits) {
        if (u.faction === z.faction) continue;
        if (u.isDowned) continue;
        const dx = u.x - z.x, dy = u.y - z.y;
        if (dx * dx + dy * dy <= z.radius * z.radius) {
          this._dealDamage(u, dmg, null);
        }
      }
      // Fade alpha based on remaining time
      const a = Math.min(0.18, z.remainingMs / 1000 * 0.18);
      z.gfx.setAlpha(a / 0.18);
    }
  }

  _stunArea(x, y, radius, durationMs, faction) {
    for (const u of this.units) {
      if (u.faction === faction) continue;
      const dx = u.x - x, dy = u.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        u.stunRemainingMs = Math.max(u.stunRemainingMs, durationMs);
      }
    }
    // Stun also freezes enemy turrets and base for the duration.
    const enemyFaction = faction === 'player' ? 'enemy' : 'player';
    for (const s of this.structures) {
      if (s.owner !== enemyFaction || s.hp <= 0) continue;
      const dx = s.x - x, dy = s.y - y;
      if (dx * dx + dy * dy <= radius * radius) {
        s.stunRemainingMs = Math.max(s.stunRemainingMs || 0, durationMs);
      }
    }
  }

  _spawnDeathParticles(x, y, color) {
    // 5-7 bioluminescent spore particles burst outward and drift slightly upward.
    const count = Phaser.Math.Between(5, 7);
    for (let i = 0; i < count; i++) {
      const angle  = (Math.PI * 2 * i) / count + Math.random() * 0.6;
      const speed  = 40 + Math.random() * 50;
      const endX   = x + Math.cos(angle) * speed;
      const endY   = y + Math.sin(angle) * speed - 12;   // drift upward like spores
      const gfx = this.add.graphics();
      gfx.fillStyle(color, 0.9);
      gfx.fillCircle(0, 0, 1.5);
      gfx.setPosition(x, y);
      this.tweens.add({
        targets:  gfx,
        x:        endX,
        y:        endY,
        alpha:    0,
        duration: 350,
        delay:    i * 20,
        ease:     'Cubic.easeOut',
        onComplete: () => gfx.destroy(),
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [AI] — Phase 8
  // ═══════════════════════════════════════════════════════════════════════════

  // ── AI Trainable Brain ──────────────────────────────────────────────────────
  // Card selection uses weighted random sampling with live board evaluation.
  // The AI reads actual unit HP/DPS vs turret health to decide whether it even
  // needs to react, then picks the best counter for the threat composition.
  // Weights are situation-aware (sv/th/lw/ps/n) and persist across sessions.
  // Every ~25 s a strategy is re-evaluated to give the AI a coherent direction.
  // A fraction of decisions (explorationRate) are deliberately random — these
  // let the AI discover new combos that its learned weights might be ignoring.
  _tickAi(delta) {
    // During tiebreaker no one deploys — field is locked.
    if (this.tiebreakerLocked) return;

    const ai = this.ai;

    const doublePower  = this.matchTimeRemaining <= ENERGY.doublePowerThreshold;
    const energyRate   = doublePower ? ENERGY.regenDoublePower : ENERGY.regenNormal;
    ai.energy          = Math.min(ENERGY.max, ai.energy + energyRate * delta / 1000);
    ai.ultimateCharge  = Math.min(1, ai.ultimateCharge + delta / 1000 / MATCH.ultimateChargeSeconds);
    ai.pendingDeployMs = Math.max(0, (ai.pendingDeployMs || 0) - delta);

    // ── Strategy evaluation — refresh every ~25 s ─────────────────────────────
    ai.strategyTimer = Math.max(0, (ai.strategyTimer || 0) - delta);
    if (ai.strategyTimer <= 0) {
      ai.strategy      = this._pickAiStrategy();
      ai.strategyTimer = 25000 + Math.random() * 5000;  // 25–30 s window
    }

    // ── Full board read: assess each lane independently ───────────────────────
    const threats  = LANE_CENTERS.map((_, l) => this._assessLaneThreat(l));
    const laneData = LANE_CENTERS.map((_, lane) => ({
      aiUnits:     this.units.filter(u => u.faction === 'enemy'  && u.lane === lane).length,
      playerUnits: this.units.filter(u => u.faction === 'player' && u.lane === lane).length,
      aiCovers:    [...this.enemySideCovers[lane], ...this.playerSideCovers[lane]]
                     .filter(c => c.owner === 'enemy').length,
    }));

    // Binary threat flags — moderate or worse = needs a response.
    for (let lane = 0; lane < LANE_CENTERS.length; lane++) {
      ai.threatLanes[lane] = threats[lane].level === 'moderate'
                          || threats[lane].level === 'severe';
    }
    const threatCount = ai.threatLanes.filter(Boolean).length;

    // ── Ultimate: fire when 2+ lanes are genuinely under threat ───────────────
    if (!ai.ultimateUsed && ai.ultimateCharge >= 1 && threatCount >= 2) {
      this._aiFireUltimate();
      ai.ultimateUsed   = true;
      ai.ultimateCharge = 0;
      return;
    }

    if (ai.pendingDeployMs > 0) return;

    // ── Exploration: occasionally pick a random affordable card ──────────────
    // This lets the AI discover new combos that its learned weights might be
    // suppressing.  Rate decays toward 5% as total games increase.
    const exploring = Math.random() < (ai.explorationRate || 0.05);

    // ── Build candidate actions ───────────────────────────────────────────────
    // For every (card, lane) pair we can afford:
    //   1. Build the 57-feature state vector (always — needed for training).
    //   2. Run a network forward pass → quality score in [0,1].
    //   3. Compute the hardcoded prior weight (situation logic).
    //   4. Multiply prior × network multiplier for the final weight.
    // During exploration the network still runs (training data!), but the
    // final selection ignores weights and picks uniformly at random.
    const candidates = [];
    for (let i = 0; i < ai.hand.length; i++) {
      const cardId = ai.hand[i];
      const def    = UNITS[cardId];
      if (!def || ai.energy < def.cost) continue;

      for (let lane = 0; lane < LANE_CENTERS.length; lane++) {
        const t  = threats[lane];
        const ld = laneData[lane];

        const sit = t.level === 'severe'   ? 'sv'
                  : t.level === 'moderate' ? 'th'
                  : t.level === 'low'      ? 'lw'
                  : ld.playerUnits === 0   ? 'ps'
                  : 'n';

        // ── Neural network forward pass (always runs) ─────────────────────────
        const features  = this._buildStateVector(cardId, lane, t, ld);
        const netScore  = this._aiNet.forward(features);   // [0, 1]
        // Convert to multiplier: 0→0.20, 0.5→1.0, 1.0→5.00
        const netMult   = Math.exp((netScore - 0.5) * 3.2);

        // ── Hardcoded prior weight ─────────────────────────────────────────────
        let w = 1.0;

        if (!exploring) {
          // ── Turret can handle it — save the card, push elsewhere ────────────
          if (t.level === 'manageable') {
            w *= 0.12;
          }

          // ── SEVERE threat — combo responses keyed to composition ────────────
          else if (t.level === 'severe') {
            w *= 4.5;
            if (t.hasTanks) {
              if (def.special === 'aoeProjectile')  w *= 3.2;
              if (def.role === 'tank')               w *= 2.2;
              if (def.special === 'stunGrenade')     w *= 1.6;
            }
            if (t.hasSquad) {
              if (def.special === 'stunGrenade')     w *= 3.2;
              if (def.special === 'splashDamage')    w *= 2.8;
              if (def.special === 'aoeProjectile')   w *= 2.0;
            }
            if (t.totalDps > 60) {
              if (def.role === 'tank')               w *= 2.6;
            }
            if (!t.turretAlive) {
              w *= 1.6;
              if (def.role === 'tank' || def.role === 'bruiser') w *= 1.5;
            }
          }

          // ── MODERATE threat ──────────────────────────────────────────────────
          else if (t.level === 'moderate') {
            w *= 2.0;
            if (def.role === 'tank' || def.role === 'bruiser') w *= 1.5;
            if (def.special === 'aoeProjectile' || def.special === 'stunGrenade') w *= 1.3;
          }

          // ── LOW threat ───────────────────────────────────────────────────────
          else if (t.level === 'low') {
            w *= 1.2;
            if (def.cost >= 4) w *= 0.4;
          }

          // ── Push mode — no real incoming threat ──────────────────────────────
          if (t.level === 'none' || t.level === 'manageable') {
            if (ld.playerUnits === 0) w *= 2.6;
            if (ld.aiCovers > 0)     w *= 1.4;
            if (def.speed >= 50)     w *= 1.3;
            if (def.role === 'ranged') w *= 1.3;
          }

          // ── Counter-pick ──────────────────────────────────────────────────────
          if (ai.lastPlayerCard) {
            const counters   = COUNTER_TABLE[ai.lastPlayerCard] || [];
            const counterIdx = counters.indexOf(cardId);
            if (counterIdx === 0) w *= 2.6;
            if (counterIdx === 1) w *= 1.7;
            if (counterIdx === 2) w *= 1.2;
          }

          // ── Strategy modifiers ────────────────────────────────────────────────
          const strat = ai.strategy || 'balanced';
          if (strat === 'rush_0' || strat === 'rush_1') {
            const rushLane = strat === 'rush_0' ? 0 : 1;
            if (lane === rushLane) { w *= 2.2; if (def.speed >= 44) w *= 1.4; }
            else                    { w *= 0.25; }
          } else if (strat === 'split') {
            if (def.cost <= 2) w *= 2.0;
            if (def.cost >= 5) w *= 0.5;
          } else if (strat === 'defend') {
            if (t.level === 'none' || t.level === 'manageable') w *= 0.3;
            if (def.role === 'tank' || def.role === 'bruiser')   w *= 1.6;
          } else if (strat === 'counterpush_0' || strat === 'counterpush_1') {
            const pushLane = strat === 'counterpush_0' ? 0 : 1;
            if (lane === pushLane) w *= 2.0;
          } else if (strat === 'tempo') {
            if (def.cost >= 4) w *= 2.5;
            if (def.cost <= 2 && ai.energy > 5) w *= 0.4;
          }

          // ── AOE / stun need targets ───────────────────────────────────────────
          if (def.special === 'aoeProjectile' || def.special === 'stunGrenade') {
            const targets = this.units.filter(u => u.faction === 'player' && u.lane === lane).length;
            w *= Math.max(0.12, targets * 0.55);
          }

          // ── Energy management ─────────────────────────────────────────────────
          if (ai.energy >= ENERGY.max - 1) w *= 1.6;
          if (def.cost >= 5 && ai.energy < def.cost + 1 && t.level !== 'severe') w *= 0.22;

          // ── Neural network multiplier blended on top of prior ─────────────────
          // The network corrects the prior; after enough training it can suppress
          // or boost any prior-favoured card by up to 5× in either direction.
          w *= netMult;
        }

        candidates.push({ handIdx: i, cardId, lane, sit, features, weight: Math.max(0.05, w) });
      }
    }
    if (candidates.length === 0) return;

    // ── Weighted random selection ─────────────────────────────────────────────
    const total = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    let chosen = candidates[candidates.length - 1];
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) { chosen = c; break; }
    }

    // Record action — features are stored so the training step can replay
    // the exact network input without needing to reconstruct it at match end.
    this.ai.actionsThisMatch.push({
      cardId:   chosen.cardId,
      lane:     chosen.lane,
      energy:   ai.energy,
      sit:      chosen.sit,
      features: chosen.features,   // Float64Array — used by _updateAiWeightsPostMatch
    });

    const def = UNITS[chosen.cardId];
    ai.energy -= def.cost;
    ai.hand.splice(chosen.handIdx, 1);
    this._fillAiHand();

    // AOE/stun: aim at the densest player cluster in that lane.
    let overridePos = null;
    if (def.special === 'aoeProjectile' || def.special === 'stunGrenade') {
      const cluster = this._findPlayerCluster(chosen.lane);
      overridePos = cluster || { x: LANE_CENTERS[chosen.lane], y: ROW_Y.playerCover1 };
    }

    this.spawnCard(chosen.cardId, 'enemy', chosen.lane, overridePos);

    // Track for next turn's feature vector (prevCard context slot).
    ai.prevCard = chosen.cardId;

    // Pacing — react in ~0.25–0.6s under real threat; 0.55–1.1s when relaxed.
    const isThreat = threats[chosen.lane].level === 'moderate'
                  || threats[chosen.lane].level === 'severe';
    const minD = isThreat ? 250 : 550;
    const maxD = isThreat ? 600 : 1100;
    ai.pendingDeployMs = minD + Math.random() * (maxD - minD);
  }

  _findPlayerCluster(lane) {
    const candidates = this.units.filter(u => u.faction === 'player' && u.lane === lane);
    if (candidates.length === 0) return null;
    let sx = 0, sy = 0;
    for (const u of candidates) { sx += u.x; sy += u.y; }
    return { x: sx / candidates.length, y: sy / candidates.length };
  }

  _findEnemyCluster(lane) {
    const candidates = this.units.filter(u => u.faction === 'enemy' && u.lane === lane);
    if (candidates.length === 0) return null;
    let sx = 0, sy = 0;
    for (const u of candidates) { sx += u.x; sy += u.y; }
    return { x: sx / candidates.length, y: sy / candidates.length };
  }

  // ── Auto-play: AI-controlled player side ─────────────────────────────────────
  // Each match the player bot is assigned one of 8 distinct personalities.
  // Rotating personalities forces the enemy neural network to learn responses
  // to genuinely different strategic styles rather than memorising one fixed
  // opponent.  Without this, the AI converges to a ~50/50 plateau forever.
  //
  // Personalities:
  //   rush_left     — everything into lane 0; fast cheap units; never defends
  //   rush_right    — everything into lane 1; fast cheap units; never defends
  //   split         — balanced both lanes; medium cost; reacts to threats
  //   tank_wall     — ironclad/vex/rift/siegeMech only; waits for big plays
  //   swarm         — cost-1/2 units only; very fast spam both lanes
  //   big_plays     — hoards energy; plays cost-4+ exclusively; slow tempo
  //   passive       — almost never pushes; floods only when turret is dying
  //   chaos         — random weights; unpredictable timing; hardest to model
  _rollPlayerBotPersonality() {
    const personalities = [
      'rush_left', 'rush_right', 'split',    'tank_wall',
      'swarm',     'big_plays',  'passive',  'chaos',
    ];
    this._autoPlayPersonality = personalities[(Math.random() * personalities.length) | 0];
  }

  _tickAutoPlayPlayer(delta) {
    if (this.tiebreakerLocked) return;

    this._autoPlayPendingMs = Math.max(0, this._autoPlayPendingMs - delta);
    if (this._autoPlayPendingMs > 0) return;

    const pers = this._autoPlayPersonality || 'split';

    // ── Board read — same signals the enemy AI uses ───────────────────────────
    // Threat: enemy units past playerCover1 in each lane.
    const threatLanes = [false, false];
    const severeLanes = [false, false];
    for (let lane = 0; lane < LANE_CENTERS.length; lane++) {
      const cv1Y = this.playerSideCovers[lane][0].y;
      const cv2Y = this.playerSideCovers[lane][1].y;
      const inLane = this.units.filter(u => u.faction === 'enemy' && u.lane === lane);
      threatLanes[lane] = inLane.some(u => u.y >= cv1Y - 30);
      severeLanes[lane] = inLane.some(u => u.y >= cv2Y - 20);
    }
    const threatCount  = threatLanes.filter(Boolean).length;
    const severeCount  = severeLanes.filter(Boolean).length;

    // Free lanes — enemy has no units there, good to push.
    const freeLanes = [0, 1].filter(l =>
      !this.units.some(u => u.faction === 'enemy' && u.lane === l && u.y > ROW_Y.midpoint)
    );

    // ── Ultimate ──────────────────────────────────────────────────────────────
    if (!this.ultimateUsed && this.ultimateCharge >= 1 && severeCount >= 1) {
      const targetLane = severeLanes[0] ? 0 : 1;
      const cluster    = this._findEnemyCluster(targetLane);
      this.firePlayerUltimate(cluster || { x: LANE_CENTERS[targetLane], y: ROW_Y.playerCover1 });
      return;
    }

    // ── Build candidates with personality weighting ───────────────────────────
    const candidates = [];

    for (let i = 0; i < this.hand.length; i++) {
      const cardId = this.hand[i];
      const def    = UNITS[cardId];
      if (!def || this.energy < def.cost) continue;

      for (let lane = 0; lane < LANE_CENTERS.length; lane++) {
        let w = 1.0;

        // ── Universal: respond to severe threats in any personality ─────────
        if (severeLanes[lane]) w *= 2.2;
        else if (threatLanes[lane]) w *= 1.3;

        // ── Personality-specific weights ─────────────────────────────────────
        switch (pers) {

          case 'rush_left':
            w *= lane === 0 ? 3.5 : 0.05;            // almost never touches right lane
            if (def.speed >= 60) w *= 2.5;           // sparks and fast units first
            if (def.cost <= 2)   w *= 2.0;           // cheap = more deploys per minute
            if (def.role === 'tank') w *= 0.3;       // tanks are too slow for a rush
            break;

          case 'rush_right':
            w *= lane === 1 ? 3.5 : 0.05;
            if (def.speed >= 60) w *= 2.5;
            if (def.cost <= 2)   w *= 2.0;
            if (def.role === 'tank') w *= 0.3;
            break;

          case 'split':
            // Balanced — slight preference for the free lane
            if (freeLanes.includes(lane)) w *= 1.8;
            if (def.cost >= 2 && def.cost <= 4) w *= 1.4;  // mid-cost sweet spot
            break;

          case 'tank_wall':
            // Only tanks and bruisers; waits for expensive units
            if (def.role === 'tank')    w *= 4.0;
            else if (def.role === 'bruiser') w *= 2.5;
            else                             w *= 0.08;   // virtually never plays other roles
            if (def.cost >= 4) w *= 1.8;                  // prefers big units
            if (freeLanes.includes(lane)) w *= 1.5;
            break;

          case 'swarm':
            // Only cost 1-2; floods both lanes; ignores expensive cards
            if (def.cost <= 2)  w *= 5.0;
            else if (def.cost === 3) w *= 0.4;
            else                     w *= 0.02;           // never plays cost 4+
            if (def.count >= 3) w *= 2.0;                 // wraithSquad = ideal
            break;

          case 'big_plays':
            // Hoards energy; dumps expensive high-value cards
            if (def.cost >= 4)  w *= 4.0;
            else if (def.cost === 3) w *= 0.5;
            else                     w *= 0.1;            // almost never plays cheap
            if (def.role === 'tank' || def.role === 'bruiser') w *= 1.6;
            // Prefers the lane with more of its own units (snowball)
            const ownUnits = this.units.filter(u => u.faction === 'player' && u.lane === lane).length;
            if (ownUnits > 0) w *= 1.4;
            break;

          case 'passive':
            // Barely pushes unless turret is gone or health is critical
            if (!threatLanes[lane]) w *= 0.15;             // almost never proactive
            if (severeLanes[lane])  w *= 5.0;             // panics when in deep trouble
            if (def.role === 'tank' || def.role === 'bruiser') w *= 2.0;
            if (def.special === 'aoeProjectile' || def.special === 'stunGrenade') w *= 3.0;
            break;

          case 'chaos':
            // Truly random — uniform noise so AI can't model any pattern
            w *= 0.5 + Math.random() * 1.5;
            break;
        }

        // AOE/stun: only useful if there are targets
        if (def.special === 'aoeProjectile' || def.special === 'stunGrenade') {
          const targets = this.units.filter(u => u.faction === 'enemy' && u.lane === lane).length;
          w *= Math.max(0.1, targets * 0.6);
        }

        candidates.push({ handIdx: i, cardId, lane, weight: Math.max(0.02, w) });
      }
    }
    if (candidates.length === 0) return;

    // ── Weighted random pick ──────────────────────────────────────────────────
    const total = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    let chosen = candidates[candidates.length - 1];
    for (const c of candidates) { r -= c.weight; if (r <= 0) { chosen = c; break; } }

    // ── Spend + spawn ─────────────────────────────────────────────────────────
    const ok = this.spendCard(chosen.handIdx);
    if (!ok) return;

    const def = UNITS[chosen.cardId];
    let overridePos = null;
    if (def.special === 'aoeProjectile' || def.special === 'stunGrenade') {
      const cluster = this._findEnemyCluster(chosen.lane);
      overridePos = cluster || { x: LANE_CENTERS[chosen.lane], y: ROW_Y.enemyCover1 };
    }
    this.spawnCard(chosen.cardId, 'player', chosen.lane, overridePos);

    // ── Pacing — personality sets the tempo ───────────────────────────────────
    let minD, maxD;
    switch (pers) {
      case 'swarm':       minD = 180;  maxD = 400;  break;   // very fast spam
      case 'rush_left':
      case 'rush_right':  minD = 280;  maxD = 600;  break;   // aggressive
      case 'chaos':       minD = 150;  maxD = 2200; break;   // wildly inconsistent
      case 'big_plays':   minD = 900;  maxD = 2000; break;   // waits for energy
      case 'passive':     minD = 700;  maxD = 1800; break;   // slow unless threatened
      default:            minD = 450;  maxD = 1100; break;   // balanced / tank_wall
    }
    // Under severe pressure any personality speeds up
    if (severeCount >= 1) { minD = Math.min(minD, 300); maxD = Math.min(maxD, 650); }
    this._autoPlayPendingMs = minD + Math.random() * (maxD - minD);
  }

  _teamStructureHp(faction) {
    let total = 0;
    for (const s of this.structures) {
      if (s.owner === faction) total += Math.max(0, s.hp);
    }
    return total;
  }

  // ── AI weight helpers ────────────────────────────────────────────────────────
  // Key encodes: card, lane, energy bucket (1-5), situation, game phase, prevCard.
  // This lets the AI learn "shock pulse vs squad early-game after shockPulse = bad"
  // separately from "shock pulse vs squad late-game = good".
  //
  // ── Game phase helper ─────────────────────────────────────────────────────
  _gamePhase() {
    const t = this.matchTimeRemaining;
    if (t > 120) return 'e';
    if (t > 60)  return 'm';
    return 'l';
  }

  // ── Neural network persistence ────────────────────────────────────────────
  _loadAiNet() {
    try {
      const raw = localStorage.getItem('arenaClash_aiNet_v1');
      if (raw) {
        this._aiNet = NeuralNet.fromJSON(JSON.parse(raw));
        return;
      }
    } catch { /* fall through to fresh init */ }
    // Fresh network — all outputs ≈ 0.5 initially (priors dominate early games)
    this._aiNet = new NeuralNet([AI_INPUT_SIZE, 48, 24, 1], 0.008);
  }

  _saveAiNet() {
    try {
      localStorage.setItem('arenaClash_aiNet_v1', JSON.stringify(this._aiNet.toJSON()));
    } catch { /* localStorage full or unavailable */ }
  }

  // Backward-compat stub — called by quit button in UIScene; now a no-op
  // since _saveAiNet() handles everything.
  _saveAiWeights() { this._saveAiNet(); }

  // ── Feature vector builder ─────────────────────────────────────────────────
  // Produces a 57-element Float64Array describing the decision context.
  // All values normalised to [0, 1] so the network trains stably.
  //
  // Layout (57 total):
  //   [0]      card cost / 6
  //   [1-8]    card role  one-hot (8 roles)
  //   [9-18]   card special one-hot (10 specials, index 0 = none)
  //   [19-23]  threat level one-hot (5 levels)
  //   [24-30]  threat scalars: hp/600, dps/100, hasTanks, hasSquad, hasHeavy, turretAlive, turretHp/820
  //   [31-35]  lane: laneId, aiCovers/6, plCovers/6, aiUnits/8, plUnits/8
  //   [36-40]  game: energy/10, timeLeft/180, phase early, phase mid, phase late
  //   [41-49]  prevCard: cost/6, role one-hot (8)
  //   [50-56]  strategy one-hot (7)
  _buildStateVector(cardId, lane, threat, laneData) {
    const v   = new Float64Array(AI_INPUT_SIZE);
    const def = UNITS[cardId];
    const ai  = this.ai;
    let   idx = 0;

    // ── Card features ────────────────────────────────────────────────────────
    v[idx++] = def.cost / 6;
    for (const r of AI_ROLES)    v[idx++] = def.role === r ? 1 : 0;
    for (const s of AI_SPECIALS) v[idx++] = (def.special || null) === s ? 1 : 0;

    // ── Lane threat ──────────────────────────────────────────────────────────
    const tlvl = threat.level || 'none';
    for (const l of AI_THREATS) v[idx++] = tlvl === l ? 1 : 0;
    v[idx++] = Math.min(1, (threat.totalHp  || 0) / 600);
    v[idx++] = Math.min(1, (threat.totalDps || 0) / 100);
    v[idx++] = threat.hasTanks    ? 1 : 0;
    v[idx++] = threat.hasSquad    ? 1 : 0;
    v[idx++] = threat.hasHeavy    ? 1 : 0;
    v[idx++] = threat.turretAlive ? 1 : 0;
    v[idx++] = (threat.turretHp   || 0) / STRUCTURE_HP.turret;

    // ── Lane state ────────────────────────────────────────────────────────────
    const aiLaneCov = [...this.enemySideCovers[lane], ...this.playerSideCovers[lane]]
                        .filter(c => c.owner === 'enemy').length;
    const plLaneCov = [...this.enemySideCovers[lane], ...this.playerSideCovers[lane]]
                        .filter(c => c.owner === 'player').length;
    v[idx++] = lane;
    v[idx++] = aiLaneCov / 6;
    v[idx++] = plLaneCov / 6;
    v[idx++] = Math.min(1, (laneData.aiUnits     || 0) / 8);
    v[idx++] = Math.min(1, (laneData.playerUnits || 0) / 8);

    // ── Game state ────────────────────────────────────────────────────────────
    v[idx++] = ai.energy / ENERGY.max;
    v[idx++] = Math.max(0, this.matchTimeRemaining) / MATCH.durationSeconds;
    const ph = this._gamePhase();
    v[idx++] = ph === 'e' ? 1 : 0;
    v[idx++] = ph === 'm' ? 1 : 0;
    v[idx++] = ph === 'l' ? 1 : 0;

    // ── Previous card context ─────────────────────────────────────────────────
    const prevDef = ai.prevCard ? UNITS[ai.prevCard] : null;
    v[idx++] = prevDef ? prevDef.cost / 6 : 0;
    for (const r of AI_ROLES) v[idx++] = prevDef && prevDef.role === r ? 1 : 0;

    // ── Strategy ──────────────────────────────────────────────────────────────
    const strat = ai.strategy || 'balanced';
    for (const s of AI_STRATEGIES) v[idx++] = strat === s ? 1 : 0;

    return v;
  }

  // ── Post-match network training ────────────────────────────────────────────
  // Called at match end.  Converts the action history into (features, target)
  // pairs and runs 3 epochs of mini-batch gradient descent.
  //
  // Target derivation:
  //   base_target = 0.85 (crushing win) | 0.72 (close win)
  //               | 0.28 (close loss)   | 0.15 (crushing loss)
  //
  //   Temporal discount: earlier actions are nudged toward 0.5 (neutral).
  //   effective_target = 0.5 + (base_target - 0.5) * discount
  //   discount ramps 0.15 → 1.0 across the action list (chronological order).
  //
  // After training the network is saved to localStorage.
  _updateAiWeightsPostMatch(outcome) {
    const actions = this.ai.actionsThisMatch || [];
    if (actions.length === 0) { this._saveAiNet(); return; }

    // ── Multi-tab safety: reload the latest saved network before training ─────
    // If another tab finished a match and saved while this match was running,
    // we want to train ON TOP of its improvements, not on top of the stale
    // copy we loaded 3 minutes ago.  This makes multiple tabs genuinely additive
    // rather than each one overwriting the others.
    this._loadAiNet();

    const playerScore = this._getScore('player');
    const enemyScore  = this._getScore('enemy');
    const diff        = Math.abs(playerScore - enemyScore);

    let baseTarget;
    if (outcome === 'aiWin') {
      baseTarget = diff >= 3 ? 0.85 : 0.72;
    } else {
      baseTarget = diff >= 3 ? 0.15 : 0.28;
    }

    const n       = actions.length;
    const samples = [];

    for (let i = 0; i < n; i++) {
      const action = actions[i];
      if (!action.features) continue;

      // Temporal discount: first action gets 15% credit/blame; last gets 100%.
      const discount = 0.15 + 0.85 * (i / Math.max(1, n - 1));
      const target   = 0.5 + (baseTarget - 0.5) * discount;
      samples.push({ features: action.features, target });
    }

    if (samples.length > 0) {
      this._aiNet.trainBatch(samples, 3);   // 3 epochs over this match's actions
    }
    this._saveAiNet();
  }

  // ── AI meta-learning — cross-session state ────────────────────────────────────
  // Tracks total games played and decays exploration rate over time so the AI
  // gradually shifts from discovery to exploitation as it accumulates experience.
  _loadAiMeta() {
    try {
      const raw = localStorage.getItem('arenaClash_aiMeta_v1');
      const parsed = raw ? JSON.parse(raw) : {};
      const totalGames = parsed.totalGames || 0;
      // Exploration starts at 20%, decays 0.3% per game, floors at 5%.
      const explorationRate = Math.max(0.05, 0.20 - totalGames * 0.003);
      // Player profile — counts how often the player deploys each card.
      const playerProfile = parsed.playerProfile || {};
      this._aiMeta = { totalGames, explorationRate, playerProfile };
    } catch {
      this._aiMeta = { totalGames: 0, explorationRate: 0.20, playerProfile: {} };
    }
  }

  _saveAiMeta() {
    try {
      // Merge current match's player card counts into the stored profile.
      const profile = this._aiMeta.playerProfile || {};
      if (this.ai && this.ai.playerCardCounts) {
        for (const [id, count] of Object.entries(this.ai.playerCardCounts)) {
          profile[id] = (profile[id] || 0) + count;
        }
      }
      const data = {
        totalGames:    (this._aiMeta.totalGames || 0) + 1,
        explorationRate: Math.max(0.05, 0.20 - ((this._aiMeta.totalGames || 0) + 1) * 0.003),
        playerProfile: profile,
      };
      localStorage.setItem('arenaClash_aiMeta_v1', JSON.stringify(data));
    } catch { /* storage unavailable */ }
  }

  // ── Strategy engine ───────────────────────────────────────────────────────────
  // Picks an overall AI strategy based on live board state.  The AI re-evaluates
  // every ~25 s and locks in a direction for that window.  Strategy only adjusts
  // per-candidate weights inside _tickAi — it does NOT override the weighted
  // random pick, so learned weights still drive the final choice.
  //
  // Strategies:
  //   balanced    — no strong signal; let weights decide
  //   rush_0      — all-in push into lane 0
  //   rush_1      — all-in push into lane 1
  //   split       — cheap units in both lanes simultaneously
  //   defend      — prioritise defensive counters; minimal aggression
  //   counterpush — absorb enemy push then surge the opposite lane
  //   tempo       — play the highest-cost card available whenever ≥6 energy
  _pickAiStrategy() {
    const ai = this.ai;

    // Board snapshot
    const aiCoverTotal = [0, 1].reduce((s, lane) =>
      s + [...this.enemySideCovers[lane], ...this.playerSideCovers[lane]]
           .filter(c => c.owner === 'enemy').length, 0);
    const playerCoverTotal = [0, 1].reduce((s, lane) =>
      s + [...this.enemySideCovers[lane], ...this.playerSideCovers[lane]]
           .filter(c => c.owner === 'player').length, 0);
    const coverAdvantage = aiCoverTotal - playerCoverTotal;

    const threats = [0, 1].map(l => this._assessLaneThreat(l));
    const severeLanes = threats.filter(t => t.level === 'severe').length;

    const timeLeft  = this.matchTimeRemaining;
    const playerScore = this._getScore('player');
    const enemyScore  = this._getScore('enemy');

    // Emergency defend — AI is severely behind on both lanes
    if (severeLanes >= 2) return 'defend';

    // Late-game and losing — desperate all-in on whichever lane is cleaner
    if (timeLeft < 45 && playerScore > enemyScore) {
      const openLane = threats[0].level === 'none' ? 0
                     : threats[1].level === 'none' ? 1
                     : coverAdvantage > 0 ? 0 : 1;
      return openLane === 0 ? 'rush_0' : 'rush_1';
    }

    // Counter-push — taking hits on one lane, opportunity on the other
    if (severeLanes === 1) {
      const safeLane = threats[0].level === 'none' || threats[0].level === 'manageable' ? 0 : 1;
      return `counterpush_${safeLane}`;
    }

    // Ahead on covers mid-game — press the advantage with a split push
    if (coverAdvantage >= 2 && timeLeft > 60) return 'split';

    // Plenty of energy banked — spend up with high-value cards
    if (ai.energy >= 7) return 'tempo';

    // Player heavily biased one lane — mirror with cheap units, spike the other
    const bias = (ai.playerLaneBias[0] || 0) - (ai.playerLaneBias[1] || 0);
    if (Math.abs(bias) >= 3) {
      const exploitLane = bias > 0 ? 1 : 0;  // player ignores this lane; exploit it
      return exploitLane === 0 ? 'rush_0' : 'rush_1';
    }

    return 'balanced';
  }

  // ── Board evaluation ──────────────────────────────────────────────────────────
  // Assesses how threatening the player's push is in a given lane, taking into
  // account the live turret's ability to handle it without AI assistance.
  _assessLaneThreat(lane) {
    const turret      = this.enemyTurrets ? this.enemyTurrets[lane] : null;
    const turretHp    = turret ? turret.hp : 0;
    const turretAlive = turretHp > 0;

    // Player units that have crossed the midpoint into AI territory.
    const threatening = this.units.filter(
      u => u.faction === 'player' && u.lane === lane && u.y < ROW_Y.midpoint + 30
    );

    const none = {
      level: 'none', units: [], turretAlive, turretHp, turretCanHandle: true,
      totalHp: 0, totalDps: 0, hasTanks: false, hasSquad: false, hasHeavy: false,
    };
    if (threatening.length === 0) return none;

    const totalHp  = threatening.reduce((s, u) => s + u.hp, 0);
    const totalDps = threatening.reduce((s, u) => s + u.def.damage * u.def.attackSpeed, 0);
    const hasTanks = threatening.some(u => u.def.role === 'tank');
    const hasSquad = threatening.length >= 3;
    const hasHeavy = threatening.some(u => u.def.cost >= 4);

    // How long before the front unit reaches the enemy base?
    const front      = threatening.reduce((a, b) => a.y < b.y ? a : b);
    const timeToBase = Math.abs(front.y - ROW_Y.enemyBase) / Math.max(1, front.def.speed);

    // HP the turret can burn in that window (fires one shot at a time).
    const turretDps    = STRUCTURE_ATTACK.turretDamage / (STRUCTURE_ATTACK.turretFireRateMs / 1000);
    const turretWindow = turretAlive ? turretDps * timeToBase : 0;

    // Turret can handle it if it can destroy total incoming HP before they pass,
    // without taking so much damage that it dies doing so.
    const turretCanHandle = turretAlive
      && !hasTanks
      && threatening.length <= 2
      && totalHp <= turretWindow * 0.9     // turret can kill them in time
      && totalHp < turretHp * 0.6;        // turret won't die from the exchange

    let level;
    if (turretCanHandle)                                         level = 'manageable';
    else if (!hasHeavy && totalHp < 180 && !hasSquad)           level = 'low';
    else if (hasTanks || hasSquad || totalHp > 350 || hasHeavy) level = 'severe';
    else                                                         level = 'moderate';

    return { level, units: threatening, turretAlive, turretHp, turretCanHandle,
             totalHp, totalDps, hasTanks, hasSquad, hasHeavy, timeToBase };
  }

  _aiFireUltimate() {
    const counts = [0, 0];
    for (const u of this.units) if (u.faction === 'player') counts[u.lane]++;
    const lane    = counts[0] >= counts[1] ? 0 : 1;
    const cluster = this._findPlayerCluster(lane);

    if (this.ai.ultimateType === 'orbitalStrike') {
      const x = LANE_CENTERS[lane];
      const y = cluster ? cluster.y : ROW_Y.playerCover1;
      this.fireOrbitalStrike({ x, y }, 'enemy');
    } else {
      // Drop Pod: spawn 5 Sparks at the player's frontmost cover in the threat lane.
      const y = cluster ? cluster.y - 30 : ROW_Y.playerCover1;
      this.fireDropPod({ x: LANE_CENTERS[lane], y }, 'enemy');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [ULTIMATES] — Phase 10
  // ═══════════════════════════════════════════════════════════════════════════

  // Player-facing entry from UIScene drag-release.
  firePlayerUltimate(pos) {
    if (this.ultimateUsed) return false;
    if (this.ultimateCharge < 1) return false;
    if (this.playerUltimate === 'dropPod') {
      this.fireDropPod(pos, 'player');
    } else {
      this.fireOrbitalStrike(pos, 'player');
    }
    this.ultimateUsed = true;
    this.ultimateCharge = 0;
    return true;
  }

  fireDropPod(pos, faction) {
    // Spawn 5 Sparks at exact pos, bypassing cover order.
    // Cluster them in a small ring.
    for (let i = 0; i < 5; i++) {
      const angle = (Math.PI * 2 * i) / 5;
      const ox = Math.cos(angle) * 18;
      const oy = Math.sin(angle) * 18;
      // Determine lane based on x.
      const lane = pos.x < ARENA.width / 2 ? 0 : 1;
      this._spawnUnitBody(UNITS.spark, faction, lane, pos.x + ox, pos.y + oy);
    }
    this._playSound('ultimateReady');
  }

  fireOrbitalStrike(pos, faction) {
    // Show a 1.5 second warning circle, then massive explosion.
    const reticle = this.add.graphics();
    const radius = 150;
    let elapsed = 0;
    const totalMs = 1500;

    const warn = { e: 0 };
    this.tweens.add({
      targets: warn,
      e: 1,
      duration: totalMs,
      onUpdate: () => {
        const t = warn.e;
        reticle.clear();
        reticle.lineStyle(2, 0x5a1a1a, 0.8);
        reticle.strokeCircle(pos.x, pos.y, radius);
        reticle.fillStyle(0x3a0e0e, 0.15 + 0.15 * Math.sin(t * Math.PI * 6));
        reticle.fillCircle(pos.x, pos.y, radius);
      },
      onComplete: () => {
        reticle.destroy();
        // Massive explosion — 500 dmg to structures, full kill to units.
        this._explodeRing(pos.x, pos.y, radius, 0x5a2a0e);   // deep amber orbital strike
        this._playSound('explosion');

        for (const u of this.units.slice()) {
          if (u.faction === faction) continue;
          const dx = u.x - pos.x, dy = u.y - pos.y;
          if (dx * dx + dy * dy <= radius * radius) {
            this._dealDamage(u, u.maxHp + 9999, null);
          }
        }
        for (const s of this.structures) {
          if (s.owner === faction || s.hp <= 0) continue;
          const dx = s.x - pos.x, dy = s.y - pos.y;
          if (dx * dx + dy * dy <= radius * radius) {
            this._dealDamage(s, 500, null);
          }
        }
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [SOUND] — Web Audio tones (Phase 12)
  // ═══════════════════════════════════════════════════════════════════════════

  _playSound(name) {
    try {
      if (!this._audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._audioCtx = new AC();
      }
      const ctx = this._audioCtx;
      const t0  = ctx.currentTime;

      switch (name) {
        case 'deploy':         this._tone(200, 400, 0.10, 'sine',     0.15); break;
        case 'death':          this._tone(300, 100, 0.15, 'sawtooth', 0.18); break;
        case 'capture':        this._chime();                                break;
        case 'explosion':      this._tone( 80,  40, 0.30, 'square',   0.30); break;
        case 'ultimateReady':  this._tone(300, 900, 0.30, 'sine',     0.20); break;
        case 'win':            this._fanfare(true);                          break;
        case 'lose':           this._fanfare(false);                         break;
      }
    } catch (e) { /* swallow — audio is not critical */ }
  }

  _tone(fromHz, toHz, durSec, type, gain) {
    const ctx = this._audioCtx;
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(fromHz, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(toHz, ctx.currentTime + durSec);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + durSec);
    osc.connect(g).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + durSec + 0.02);
  }

  _chime() {
    this._tone(440, 660, 0.10, 'sine', 0.15);
    setTimeout(() => this._tone(660, 880, 0.12, 'sine', 0.15), 100);
  }

  _fanfare(rising) {
    if (rising) {
      this._tone(300, 600, 0.20, 'square', 0.20);
      setTimeout(() => this._tone(500, 900, 0.30, 'square', 0.20), 150);
    } else {
      this._tone(500, 200, 0.30, 'sawtooth', 0.22);
      setTimeout(() => this._tone(300, 100, 0.40, 'sawtooth', 0.22), 200);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [WIN / LOSE]
  // ═══════════════════════════════════════════════════════════════════════════

  // Points earned by a faction = sum of STRUCTURE_POINTS for each enemy
  // structure that has been destroyed (hp <= 0).
  _getScore(faction) {
    const enemyFaction = faction === 'player' ? 'enemy' : 'player';
    let pts = 0;
    for (const s of this.structures) {
      if (s.owner !== enemyFaction) continue;
      if (s.hp <= 0) pts += STRUCTURE_POINTS[s.type] || 0;
    }
    return pts;
  }

  _checkMatchEnd() {
    if (this.matchOver) return;

    // ── Instant win: base destroyed ──────────────────────────────────────────
    if (this.enemyBase.hp <= 0) { this._endMatch('win',  'Enemy base destroyed!'); return; }
    if (this.playerBase.hp <= 0) { this._endMatch('lose', 'Your base was destroyed!'); return; }

    // ── Normal timer expiry → score check ────────────────────────────────────
    if (this.matchTimeRemaining <= 0 && this.matchMode === 'normal') {
      const ps = this._getScore('player');
      const es = this._getScore('enemy');
      if (ps > es) {
        this._endMatch('win',  `Time up — ${ps}–${es}`); return;
      } else if (es > ps) {
        this._endMatch('lose', `Time up — ${ps}–${es}`); return;
      } else {
        // Tied — enter Sudden Death
        this.matchMode         = 'suddenDeath';
        this.suddenDeathActive = true;
        this.suddenDeathTimer  = MATCH.suddenDeathSeconds;
        this._playSound('ultimateReady');
        return;
      }
    }

    // ── Sudden Death: 45-second window — first structure destroyed wins ───────
    if (this.matchMode === 'suddenDeath') {
      if (this.suddenDeathTimer <= 0) {
        // 45s elapsed with no winner → Tiebreaker
        this._enterTiebreaker();
      }
      // Structure-destroyed wins are handled inline in _dealDamage via matchMode check.
    }
  }

  // Sudden Death: first enemy structure destroyed wins immediately.
  // Called from _dealDamage when a structure reaches 0 HP during suddenDeath.
  _checkSuddenDeathWin(destroyedStructure) {
    if (this.matchMode !== 'suddenDeath') return;
    if (destroyedStructure.owner === 'enemy') {
      this._endMatch('win',  'Sudden Death — first blood!');
    } else {
      this._endMatch('lose', 'Sudden Death — first blood!');
    }
  }

  // Tiebreaker: the first structure to collapse (any type) decides the match.
  // Equal damage drains all structures — the side with less HP loses first.
  _checkTiebreakerWin(destroyedStructure) {
    if (this.matchMode !== 'tiebreaker') return;
    if (this.matchOver) return;
    if (destroyedStructure.owner === 'enemy') {
      this._endMatch('win',  'Tiebreaker — enemy crumbled!');
    } else {
      this._endMatch('lose', 'Tiebreaker — you crumbled!');
    }
  }

  _enterTiebreaker() {
    if (this.matchMode === 'tiebreaker') return;
    this.matchMode         = 'tiebreaker';
    this.suddenDeathActive = false;

    // Remove all units from the field instantly.
    for (const u of this.units.slice()) {
      u.gfx.destroy();
      if (u.stackText) u.stackText.destroy();
    }
    this.units = [];

    // Lock energy and hand so no new units can be deployed.
    this.tiebreakerLocked = true;

    // Notify UIScene to display the tiebreaker splash.
    this.events.emit('tiebreakerEntered');
  }

  // Called every update while in tiebreaker — all structures take constant damage.
  _tickTiebreaker(delta) {
    if (this.matchMode !== 'tiebreaker') return;
    const dmg = 30 * (delta / 1000); // 30 HP/s auto-damage to every standing structure
    for (const s of this.structures) {
      if (s.hp <= 0) continue;
      this._dealDamage(s, dmg, null);
    }
  }

  _endMatch(outcome, reason) {
    this.matchOver = true;
    this._playSound(outcome === 'win' ? 'win' : 'lose');
    // Update AI learning weights — if player won, AI lost (and vice versa).
    this._updateAiWeightsPostMatch(outcome === 'win' ? 'aiLoss' : 'aiWin');
    // Save cross-session meta: game count, decayed exploration rate, player profile.
    this._saveAiMeta();
    // Save win/loss record so MenuScene header can display it
    try {
      const wlRaw = localStorage.getItem('arenaClash_wl_v1');
      const wl = wlRaw ? JSON.parse(wlRaw) : { w: 0, l: 0 };
      if (outcome === 'win')  wl.w++;
      else if (outcome === 'lose') wl.l++;
      localStorage.setItem('arenaClash_wl_v1', JSON.stringify(wl));
    } catch (e) { /* localStorage unavailable — silently ignore */ }
    // Scores and match duration for result screen
    const playerScore    = this._getScore('player');
    const enemyScore     = this._getScore('enemy');
    const elapsedSeconds = Math.round(MATCH.durationSeconds - Math.max(0, this.matchTimeRemaining));
    this.time.delayedCall(800, () => {
      this.scene.stop('UIScene');
      this.scene.start('ResultScene', {
        outcome, reason, playerScore, enemyScore, elapsedSeconds,
        // Pass match setup so ResultScene can restart immediately (auto-play loop).
        playerUltimate:   this.playerUltimate,
        playerDeck:       this.playerDeck,
        autoPlay:         this.autoPlayPlayer,
        botPersonality:   this._autoPlayPersonality || 'split',
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [UPDATE]
  // ═══════════════════════════════════════════════════════════════════════════

  update(time, delta) {
    if (this.matchOver) return;
    this._tickEnergy(delta);
    this._tickMatchTimer(delta);
    this._tickUltimate(delta);
    this._tickUnits(delta);
    this._tickCovers(delta);
    this._tickTurrets(delta);
    this._tickBases(delta);
    this._tickProjectiles(delta);
    this._tickTiebreaker(delta);
    this._tickAi(delta);
    if (this.autoPlayPlayer) this._tickAutoPlayPlayer(delta);
    this._checkMatchEnd();
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [DECK / HAND]
  // ═══════════════════════════════════════════════════════════════════════════

  _shuffleDeck(cards) {
    for (let i = cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [cards[i], cards[j]] = [cards[j], cards[i]];
    }
    return cards;
  }

  _fillHand() {
    while (this.hand.length < 4) {
      if (this.deck.length === 0) this.deck = this._shuffleDeck([...DEFAULT_DECK]);
      this.hand.push(this.deck.shift());
    }
  }

  _fillAiHand() {
    while (this.ai.hand.length < 4) {
      if (this.ai.deck.length === 0) this.ai.deck = this._shuffleDeck([...DEFAULT_DECK]);
      this.ai.hand.push(this.ai.deck.shift());
    }
  }

  spendCard(handIndex) {
    if (this.tiebreakerLocked) return false;
    const cardId = this.hand[handIndex];
    const unit   = UNITS[cardId];
    if (!unit || this.energy < unit.cost) return false;
    this.energy -= unit.cost;
    this.hand.splice(handIndex, 1);
    this._fillHand();
    this.selectedCardIndex = null;
    // Let the AI know what the player just played so it can counter-pick.
    if (this.ai) this.ai.lastPlayerCard = cardId;
    return true;
  }

  // Returns the next card id in the draw pile (for UIScene preview slot).
  getNextCard() {
    return this.deck[0] || null;
  }

  // Returns current point scores for both sides.
  getScores() {
    return {
      player: this._getScore('player'),
      enemy:  this._getScore('enemy'),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [ENERGY / TIMING]
  // ═══════════════════════════════════════════════════════════════════════════

  _tickEnergy(delta) {
    const doublePower = this.matchTimeRemaining <= ENERGY.doublePowerThreshold;
    const rate = doublePower ? ENERGY.regenDoublePower : ENERGY.regenNormal;
    this.energy = Math.min(ENERGY.max, this.energy + rate * delta / 1000);
  }

  _tickMatchTimer(delta) {
    if (this.matchMode === 'normal') {
      this.matchTimeRemaining = Math.max(0, this.matchTimeRemaining - delta / 1000);
    } else if (this.matchMode === 'suddenDeath') {
      this.suddenDeathTimer = Math.max(0, this.suddenDeathTimer - delta / 1000);
    }
  }

  _tickUltimate(delta) {
    if (this.ultimateUsed) return;
    this.ultimateCharge = Math.min(1, this.ultimateCharge + delta / 1000 / MATCH.ultimateChargeSeconds);
  }
}
