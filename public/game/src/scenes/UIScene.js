// UIScene — HUD overlay running in parallel on top of GameScene.
//
// Sections:
//   [BUILD]    — runs once in create()
//   [DRAG]     — Phase 3: drag a card onto the arena to deploy a unit
//   [ULT DRAG] — Phase 10: drag the ULT button to a target location
//   [INPUT]    — card click selection (legacy/tap-to-arm path)
//   [UPDATE]   — per-frame redraws of HUD
//   [REDRAW]   — energy, cards, ultimate

class UIScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UIScene' });
  }

  create() {
    this.gameScene = this.scene.get('GameScene');

    this.CARD_W   = 78;
    this.CARD_H   = 92;
    this.CARD_GAP = 5;
    this.HAND_Y   = 652;
    this.HAND_LEFT = (ARENA.width - (4 * this.CARD_W + 3 * this.CARD_GAP)) / 2;

    // Y above which a drag-drop counts as "on the arena" — the HUD panel starts at 645.
    this.ARENA_BOTTOM_Y = 640;

    this._buildHudPanel();
    this._buildScoreTimer();       // replaces _buildTimer — shows [P] — [time] — [E]
    this._buildQuitButton();       // small ✕ QUIT in HUD dead-zone, top-right of card row
    this._buildUltimateButton();
    this._buildCardSlots();
    this._buildNextCardPreview();  // new: shows upcoming card
    this._buildEnergyBar();
    this._buildDragLayer();

    this._lastHandKey     = null;
    this._lastTimeInt     = -1;
    this._lastSuddenDeath = false;
    this._lastUltRound    = -1;
    this._lastEnergy      = -1;
    this._lastScoreKey    = null;
    this._lastNextCard    = null;

    // ── Tooltip ──────────────────────────────────────────────────────────────
    this._buildTooltip();

    // ── Ultimate-ready flash text ─────────────────────────────────────────────
    this._ultReadyText = this.add.text(ARENA.width / 2, 620, 'ULTIMATE READY', {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 3,
    }).setOrigin(0.5, 1).setDepth(20).setAlpha(0);

    this._ultWasReady = false;

    // ── Sudden-death / tiebreaker banner ─────────────────────────────────────
    this._suddenDeathBanner = this.add.text(ARENA.width / 2, 320, 'SUDDEN DEATH', {
      fontSize: '20px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#5a1a1a', letterSpacing: 4,
    }).setOrigin(0.5, 0.5).setDepth(30).setAlpha(0);

    // ── Double-power state ────────────────────────────────────────────────────
    this._doublePowerActive  = false;
    this._doublePowerText    = this.add.text(ARENA.width / 2, ARENA.height / 2 - 60,
      '2X POWER', {
        fontSize: '28px', fontFamily: '"Share Tech Mono", monospace',
        fontStyle: 'bold', color: '#d8f0e0', letterSpacing: 5,
      }).setOrigin(0.5).setDepth(40).setAlpha(0);
    this._energyGlowGfx = this.add.graphics().setDepth(1);

    // ── Sudden-death arena border glow ────────────────────────────────────────
    this._sdBorderGfx = this.add.graphics().setDepth(35);

    // ── Tiebreaker splash ─────────────────────────────────────────────────────
    this._tieBreakerSplash = this.add.text(ARENA.width / 2, ARENA.height / 2, 'TIEBREAKER', {
      fontSize: '42px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 6,
    }).setOrigin(0.5).setDepth(50).setAlpha(0);

    // Listen for game events.
    const gs = this.gameScene;
    if (gs) {
      gs.events.on('scoreChanged', () => this._triggerScorePop());
      gs.events.on('tiebreakerEntered', () => this._showTiebreakerSplash());
    }
  }

  _cardLeft(i) { return this.HAND_LEFT + i * (this.CARD_W + this.CARD_GAP); }

  // ═══════════════════════════════════════════════════════════════════════════
  // [BUILD]
  // ═══════════════════════════════════════════════════════════════════════════

  _buildTooltip() {
    this._tooltipGfx  = this.add.graphics().setDepth(60);
    this._tooltipText = this.add.text(0, 0, '', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace',
      color: '#b8d8cc', lineSpacing: 3,
    }).setDepth(61).setVisible(false);
    this._tooltipCardIdx = -1;
  }

  _showTooltip(idx) {
    const gs = this.gameScene;
    if (!gs) return;
    const cardId = gs.hand[idx];
    if (!cardId) return;
    const u = UNITS[cardId];
    if (!u) return;
    this._tooltipCardIdx = idx;

    const lines = [
      u.name,
      `Cost: ${u.cost}  HP: ${u.hp}`,
      `DMG: ${u.damage}  Spd: ${u.speed}  Rng: ${u.range}`,
      u.special ? `★ ${u.special}` : '',
    ].filter(Boolean);

    const x   = this._cardLeft(idx);
    const cx  = x + this.CARD_W / 2;
    const tipW = 128, tipH = lines.length * 13 + 8;
    // Clamp so the tooltip never overflows the canvas.
    let tipX = Phaser.Math.Clamp(cx - tipW / 2, 2, ARENA.width - tipW - 2);
    const tipY = this.HAND_Y - tipH - 6;

    this._tooltipGfx.clear();
    this._tooltipGfx.fillStyle(0x0e1a18, 0.96);
    this._tooltipGfx.fillRoundedRect(tipX, tipY, tipW, tipH, 5);
    this._tooltipGfx.lineStyle(1, 0x1a5a52, 0.6);
    this._tooltipGfx.strokeRoundedRect(tipX, tipY, tipW, tipH, 5);

    this._tooltipText.setColor('#b8d8cc');
    this._tooltipText
      .setText(lines.join('\n'))
      .setPosition(tipX + 6, tipY + 4)
      .setVisible(true);
  }

  _hideTooltip() {
    this._tooltipCardIdx = -1;
    this._tooltipGfx.clear();
    this._tooltipText.setVisible(false);
  }

  // ── Quit button ───────────────────────────────────────────────────────────
  // Sits in the dead-zone to the right of the 4-card hand, inside the HUD panel.
  // The card hand spans from HAND_LEFT (~76) to ~404.  The space from 404→480
  // is used by the energy bar on the left and the next-card preview on the right,
  // so we tuck QUIT into the top-right corner of the HUD (x≈416, y≈649) as a
  // compact text-only button so it doesn't crowd anything.
  _buildQuitButton() {
    const QW = 54, QH = 22;
    const QX = ARENA.width - QW - 6;   // right-aligned with 6px margin
    const QY = 648;                     // top of HUD panel (panel starts at 645)

    const qGfx = this.add.graphics().setDepth(25);
    const drawQ = (hover) => {
      qGfx.clear();
      qGfx.fillStyle(hover ? 0x2a0e0e : 0x140a0a, 0.92);
      qGfx.fillRoundedRect(QX, QY, QW, QH, 4);
      qGfx.lineStyle(1, hover ? 0x5a1a1a : 0x2a0e0e, 1);
      qGfx.strokeRoundedRect(QX, QY, QW, QH, 4);
    };
    drawQ(false);

    const qLabel = this.add.text(QX + QW / 2, QY + QH / 2, '✕  QUIT', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#5a2a2a', letterSpacing: 1,
    }).setOrigin(0.5, 0.5).setDepth(26);

    this.add.zone(QX, QY, QW, QH).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .setDepth(27)
      .on('pointerdown', () => {
        // Stop both scenes and return to menu.
        const gs = this.gameScene;
        if (gs) {
          gs.matchOver = true;   // halt the game loop
          gs._saveAiMeta();      // preserve any learning from this session
          gs._saveAiWeights();
        }
        this.scene.stop('UIScene');
        this.scene.stop('GameScene');
        this.scene.start('MenuScene');
      })
      .on('pointerover', () => { drawQ(true);  qLabel.setColor('#b85a5a'); })
      .on('pointerout',  () => { drawQ(false); qLabel.setColor('#5a2a2a'); });
  }

  _buildHudPanel() {
    const g = this.add.graphics();
    // Dark alien command console — same ground color as arena
    g.fillStyle(0x0a0d0e, 0.96);
    g.fillRect(0, 645, ARENA.width, ARENA.height - 645);
    // Top border: bioluminescent teal circuit line at 40% — separates HUD from arena
    g.lineStyle(2, 0x1a5a52, 0.40);
    g.beginPath();
    g.moveTo(0, 645);
    g.lineTo(ARENA.width, 645);
    g.strokePath();
    // Very faint bioluminescent horizontal detail lines on panel
    g.lineStyle(1, 0x0d2a22, 0.35);
    g.beginPath(); g.moveTo(0, 680); g.lineTo(ARENA.width, 680); g.strokePath();
    g.beginPath(); g.moveTo(0, 740); g.lineTo(ARENA.width, 740); g.strokePath();
  }

  // Score + timer bar: [Player pts] — [mm:ss] — [Enemy pts]
  _buildScoreTimer() {
    const bg = this.add.graphics();
    bg.fillStyle(0x0e1a18, 0.85);
    bg.fillRoundedRect(ARENA.width / 2 - 110, 4, 220, 24, 4);
    bg.lineStyle(1, 0x1a2620, 0.6);
    bg.strokeRoundedRect(ARENA.width / 2 - 110, 4, 220, 24, 4);

    // Player score — player bright teal
    this.playerScoreText = this.add.text(ARENA.width / 2 - 78, 16, '0', {
      fontSize: '15px', fontFamily: '"Share Tech Mono", monospace', fontStyle: 'bold',
      color: '#2a7a6a',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Timer — muted teal-gray
    this.timerText = this.add.text(ARENA.width / 2, 16, '3:00', {
      fontSize: '15px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Enemy score — enemy bright crimson
    this.enemyScoreText = this.add.text(ARENA.width / 2 + 78, 16, '0', {
      fontSize: '15px', fontFamily: '"Share Tech Mono", monospace', fontStyle: 'bold',
      color: '#7a2a2a',
    }).setOrigin(0.5, 0.5).setDepth(2);

    // Separator dashes
    this.add.text(ARENA.width / 2 - 40, 16, '—', {
      fontSize: '12px', fontFamily: '"Share Tech Mono", monospace', color: '#1a2620',
    }).setOrigin(0.5, 0.5).setDepth(2);
    this.add.text(ARENA.width / 2 + 40, 16, '—', {
      fontSize: '12px', fontFamily: '"Share Tech Mono", monospace', color: '#1a2620',
    }).setOrigin(0.5, 0.5).setDepth(2);

    this._scorePop = { player: 1, enemy: 1 };   // scale targets for pop animation
  }

  _buildUltimateButton() {
    this.ultimateGfx = this.add.graphics();

    // Circular label — "ULTIMATE" above center
    this.ultLabelText = this.add.text(0, 0, 'ULTIMATE', {
      fontSize: '7px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 1,
    }).setOrigin(0.5, 1);

    this.ultPctText = this.add.text(0, 0, '0%', {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50',
    }).setOrigin(0.5, 0.5);

    // Interactive zone — slightly larger than the drawn circle to ease tapping.
    // Circle center will be at (36, 776), radius ~24.
    const BW = 56, BH = 56, bx = 8, by = 750;
    this.ultZone = this.add.zone(bx, by, BW, BH).setOrigin(0, 0).setInteractive();
    this.ultZone.on('pointerdown', (p) => this._startUltDrag(p));
  }

  _buildCardSlots() {
    this.cardBgGfx = this.add.graphics();

    this.cardShapeGfx = [];
    this.cardNameText = [];
    this.cardCostText = [];
    this.cardZones    = [];

    for (let i = 0; i < 4; i++) {
      const x   = this._cardLeft(i);
      const midX = x + this.CARD_W / 2;

      this.cardShapeGfx.push(this.add.graphics());

      this.cardNameText.push(
        this.add.text(midX, this.HAND_Y + this.CARD_H - 14, '', {
          fontSize: '7px', fontFamily: '"Share Tech Mono", monospace',
          color: '#b8d8cc', align: 'center', wordWrap: { width: this.CARD_W - 8 },
        }).setOrigin(0.5, 0.5)
      );

      this.cardCostText.push(
        this.add.text(x + 7, this.HAND_Y + 7, '', {
          fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
          fontStyle: 'bold', color: '#3a5a50',
        }).setOrigin(0, 0)
      );

      const zone = this.add.zone(x, this.HAND_Y, this.CARD_W, this.CARD_H)
        .setOrigin(0, 0)
        .setInteractive();

      const idx = i;
      zone.on('pointerdown',  (p) => this._startCardDrag(idx, p));
      zone.on('pointerover',  ()  => this._showTooltip(idx));
      zone.on('pointerout',   ()  => this._hideTooltip());
      this.cardZones.push(zone);
    }
  }

  // Compact "next card" preview slot — one upcoming card shown right of the hand.
  _buildNextCardPreview() {
    const PREV_W  = 44, PREV_H  = 52;
    const handEnd = this.HAND_LEFT + 4 * this.CARD_W + 3 * this.CARD_GAP;
    const prevX   = handEnd + 8;
    const prevY   = this.HAND_Y + (this.CARD_H - PREV_H) / 2;

    this._nextCardBg = this.add.graphics();
    this._nextCardBg.fillStyle(0x0e1a18, 0.9);
    this._nextCardBg.fillRoundedRect(prevX, prevY, PREV_W, PREV_H, 4);
    this._nextCardBg.lineStyle(1, 0x1a2620, 0.9);
    this._nextCardBg.strokeRoundedRect(prevX, prevY, PREV_W, PREV_H, 4);

    this._nextCardShapeGfx = this.add.graphics();
    this._nextCardCostText = this.add.text(prevX + 4, prevY + 4, '', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50',
    }).setOrigin(0, 0);

    this._nextCardLabel = this.add.text(prevX + PREV_W / 2, prevY - 6, 'NEXT', {
      fontSize: '7px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50',
    }).setOrigin(0.5, 1);

    this._nextCardPrevX = prevX;
    this._nextCardPrevY = prevY;
    this._nextCardPrevW = PREV_W;
    this._nextCardPrevH = PREV_H;
  }

  _buildEnergyBar() {
    this.energyGfx = this.add.graphics();
    this.add.text(ARENA.width / 2, 756, 'ENERGY', {
      fontSize: '7px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5, 0);
  }

  // Floating ghost layer used by both card drag and ultimate drag.
  _buildDragLayer() {
    this.dragGhost = this.add.graphics().setDepth(50);
    this.dragHelp  = this.add.text(0, 0, '', {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      color: '#b8d8cc', letterSpacing: 2,
    }).setOrigin(0.5, 0.5).setDepth(50).setVisible(false);

    // Global pointer listeners — single hooks that route to whichever drag is active.
    this.input.on('pointermove', (p) => this._onPointerMove(p));
    this.input.on('pointerup',   (p) => this._onPointerUp(p));

    this.dragState = null;  // { kind: 'card' | 'ultimate', idx?, cardId?, x, y }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [DRAG] — Phase 3 card drag-to-deploy
  // ═══════════════════════════════════════════════════════════════════════════

  _startCardDrag(idx, pointer) {
    const gs = this.gameScene;
    if (!gs || gs.matchOver) return;
    const cardId = gs.hand[idx];
    if (!cardId) return;
    const unit = UNITS[cardId];
    if (!unit || gs.energy < unit.cost) return;

    this.dragState = {
      kind:   'card',
      idx,
      cardId,
      unit,
      x: pointer.x,
      y: pointer.y,
    };
    gs.selectedCardIndex = idx;
    this._drawDragGhost();
  }

  _onPointerMove(pointer) {
    if (!this.dragState) return;
    this.dragState.x = pointer.x;
    this.dragState.y = pointer.y;
    this._drawDragGhost();
  }

  _onPointerUp(pointer) {
    if (!this.dragState) return;
    const ds = this.dragState;
    this.dragState = null;
    this.dragGhost.clear();
    this.dragHelp.setVisible(false);

    const gs = this.gameScene;
    if (!gs) return;

    if (ds.kind === 'card') {
      this._completeCardDrop(ds, pointer);
    } else if (ds.kind === 'ultimate') {
      this._completeUltDrop(ds, pointer);
    }
  }

  _completeCardDrop(ds, pointer) {
    const gs = this.gameScene;
    const { unit, idx, cardId } = ds;

    // Must drop on the arena (above HUD).
    if (pointer.y >= this.ARENA_BOTTOM_Y) {
      gs.selectedCardIndex = null;
      return;
    }

    // For AOE projectile / stun grenade / sentry tower / drop pod-style: free-drop.
    const freeTarget = unit.special === 'aoeProjectile'
                    || unit.special === 'stunGrenade'
                    || unit.special === 'stationary';

    let lane;
    if (freeTarget) {
      // Snap to nearest lane for sentry tower; ignore for the grenades (they use exact pos).
      lane = pointer.x < ARENA.width / 2 ? 0 : 1;
    } else {
      lane = pointer.x < ARENA.width / 2 ? 0 : 1;
    }

    // Affordability double-check.
    if (gs.energy < unit.cost) {
      gs.selectedCardIndex = null;
      return;
    }

    // ── Deploy zone validation (before spending energy) ───────────────────────
    // AOE / stun grenades and special effects can land anywhere on the arena.
    // Regular and stationary units must be placed within the player's deploy zone.
    const frontY = gs.playerDeployY;
    const isFreeAim = unit.special === 'aoeProjectile' || unit.special === 'stunGrenade';
    if (!isFreeAim) {
      // Reject drop outside the current deploy zone — card snaps back, no cost.
      if (pointer.y < frontY || pointer.y > ROW_Y.playerBase) {
        gs.selectedCardIndex = null;
        return;
      }
    }

    // Spend card; on success, spawn.
    const ok = gs.spendCard(idx);
    if (!ok) {
      gs.selectedCardIndex = null;
      return;
    }

    if (isFreeAim) {
      gs.spawnCard(cardId, 'player', lane, { x: pointer.x, y: pointer.y });
    } else if (unit.special === 'stationary') {
      // Sentry Tower: honour the exact drop X; clamp Y inside deploy zone.
      gs.spawnCard(cardId, 'player', lane,
        { x: pointer.x, y: Phaser.Math.Clamp(pointer.y, frontY, ROW_Y.playerBase) });
    } else {
      // Regular unit: spawn exactly where the card was dropped.
      // The unit's lane (0=left, 1=right) still routes it to the correct covers/turrets.
      gs.spawnCard(cardId, 'player', lane, { x: pointer.x, y: pointer.y });
    }
  }

  // Draws a translucent preview of whatever is currently being dragged.
  _drawDragGhost() {
    const ds = this.dragState;
    const g  = this.dragGhost;
    g.clear();
    if (!ds) return;

    if (ds.kind === 'card') {
      const unit  = ds.unit;
      const color = unit.tint !== null ? unit.tint : COLORS.player;
      const r     = unit.radius || 12;

      // Full deploy-zone highlight: both lane columns from front line to player base.
      if (ds.y < this.ARENA_BOTTOM_Y) {
        const gs    = this.gameScene;
        const frontY = gs ? gs.playerDeployY : ROW_Y.playerBase;
        const zoneH  = Math.max(0, ROW_Y.playerBase - frontY);
        for (const cx of LANE_CENTERS) {
          // Soft bioluminescent overlay on valid drop zone
          g.fillStyle(0x1a5a52, 0.07);
          g.fillRect(cx - LANE_WIDTH / 2, frontY, LANE_WIDTH, zoneH);
        }
        // Front-line markers — teal circuit line
        g.lineStyle(1.5, 0x1a5a52, 0.45);
        for (const cx of LANE_CENTERS) {
          g.beginPath();
          g.moveTo(cx - LANE_WIDTH / 2, frontY);
          g.lineTo(cx + LANE_WIDTH / 2, frontY);
          g.strokePath();
        }
      }

      // Unit ghost at cursor
      g.fillStyle(color, 0.55);
      switch (unit.shape) {
        case 'circle':
          g.fillCircle(ds.x, ds.y, r); break;
        case 'square': {
          const oct = this._polyVerts(ds.x, ds.y, r, 8, -Math.PI / 8);
          g.fillPoints(oct, true); break;
        }
        case 'triangle':
          g.fillTriangle(ds.x, ds.y - r, ds.x - r, ds.y + r, ds.x + r, ds.y + r); break;
        case 'diamond':
          g.fillTriangle(ds.x, ds.y - r, ds.x - r, ds.y, ds.x, ds.y + r);
          g.fillTriangle(ds.x, ds.y - r, ds.x + r, ds.y, ds.x, ds.y + r);
          break;
        case 'pentagon': {
          const pent = this._polyVerts(ds.x, ds.y, r, 5, -Math.PI / 2);
          g.fillPoints(pent, true); break;
        }
        case 'star': {
          const star = this._starVerts(ds.x, ds.y, r, r * 0.45, 5);
          g.fillPoints(star, true); break;
        }
        default: g.fillCircle(ds.x, ds.y, r);
      }

      // Show card name while dragging
      this.dragHelp.setText(unit.name).setPosition(ds.x, ds.y - r - 12).setVisible(true);

    } else if (ds.kind === 'ultimate') {
      this.dragHelp.setVisible(false);
      const ult = this.gameScene.playerUltimate;
      if (ult === 'dropPod') {
        g.lineStyle(2, 0x1a5a52, 0.9);
        g.strokeCircle(ds.x, ds.y, 24);
        g.fillStyle(0x1a5a52, 0.18);
        g.fillCircle(ds.x, ds.y, 24);
        this.dragHelp.setText('DROP POD').setPosition(ds.x, ds.y - 40).setVisible(true);
      } else {
        g.lineStyle(2, 0x5a1a1a, 0.9);
        g.strokeCircle(ds.x, ds.y, 150);
        g.fillStyle(0x3a0e0e, 0.12);
        g.fillCircle(ds.x, ds.y, 150);
        this.dragHelp.setText('ORBITAL STRIKE').setPosition(ds.x, ds.y - 165).setVisible(true);
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [ULT DRAG] — Phase 10
  // ═══════════════════════════════════════════════════════════════════════════

  _startUltDrag(pointer) {
    const gs = this.gameScene;
    if (!gs || gs.matchOver) return;
    if (gs.ultimateUsed) return;
    if (gs.ultimateCharge < 1) return;

    this.dragState = {
      kind: 'ultimate',
      x: pointer.x,
      y: pointer.y,
    };
    this._drawDragGhost();
  }

  _completeUltDrop(ds, pointer) {
    const gs = this.gameScene;
    if (pointer.y >= this.ARENA_BOTTOM_Y) return;
    if (gs.ultimateCharge < 1 || gs.ultimateUsed) return;
    gs.firePlayerUltimate({ x: pointer.x, y: pointer.y });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [INPUT] — card click toggles selected highlight (preserves Phase 2 behaviour)
  // ═══════════════════════════════════════════════════════════════════════════

  _onCardClick(idx) {
    // Selection now happens automatically via drag start — keep this stub
    // so legacy taps don't crash if a future caller invokes it.
    const gs = this.gameScene;
    const cardId = gs.hand[idx];
    if (!cardId) return;
    const unit = UNITS[cardId];
    if (!unit || gs.energy < unit.cost) return;
    gs.selectedCardIndex = (gs.selectedCardIndex === idx) ? null : idx;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [UPDATE]
  // ═══════════════════════════════════════════════════════════════════════════

  update() {
    const gs = this.gameScene;
    if (!gs || gs.energy === undefined) return;

    // ── Timer ────────────────────────────────────────────────────────────────
    const isSuddenDeath = gs.matchMode === 'suddenDeath';
    const rawTime = isSuddenDeath ? gs.suddenDeathTimer : gs.matchTimeRemaining;
    const timeInt = Math.ceil(rawTime);
    if (timeInt !== this._lastTimeInt || isSuddenDeath !== this._lastSuddenDeath) {
      this._lastTimeInt     = timeInt;
      this._lastSuddenDeath = isSuddenDeath;
      if (isSuddenDeath) {
        this.timerText.setText(`SD ${timeInt}s`);
        this.timerText.setColor('#5a1a1a');
      } else {
        const mins = Math.floor(timeInt / 60);
        const secs = timeInt % 60;
        this.timerText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
        // Under 30s: shift to enemy crimson with slow pulse (handled via setColor each frame below)
        this.timerText.setColor(timeInt <= 30 ? '#5a1a1a' : '#3a5a50');
      }
    }
    // Under 30s: pulse the timer text in crimson
    if (!isSuddenDeath && timeInt <= 30 && timeInt > 0) {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(this.time.now * 0.003));
      this.timerText.setAlpha(pulse);
    } else {
      this.timerText.setAlpha(1);
    }

    // ── Score display ─────────────────────────────────────────────────────────
    const scores = gs.getScores ? gs.getScores() : { player: 0, enemy: 0 };
    const scoreKey = `${scores.player}|${scores.enemy}`;
    if (scoreKey !== this._lastScoreKey) {
      this._lastScoreKey = scoreKey;
      this.playerScoreText.setText(String(scores.player));
      this.enemyScoreText.setText(String(scores.enemy));
    }
    // Score pop animation — scales smoothly back to 1.
    if (this._scorePop.player > 1) {
      this._scorePop.player = Math.max(1, this._scorePop.player - 0.05);
      this.playerScoreText.setScale(this._scorePop.player);
    }
    if (this._scorePop.enemy > 1) {
      this._scorePop.enemy = Math.max(1, this._scorePop.enemy - 0.05);
      this.enemyScoreText.setScale(this._scorePop.enemy);
    }

    // ── Energy ────────────────────────────────────────────────────────────────
    this._redrawEnergy(gs.energy);

    // ── Cards ─────────────────────────────────────────────────────────────────
    const handKey = gs.hand.join(',') + '|' + gs.selectedCardIndex + '|' + Math.floor(gs.energy);
    if (handKey !== this._lastHandKey) {
      this._lastHandKey = handKey;
      this._redrawCards(gs.hand, gs.energy, gs.selectedCardIndex);
    }

    // ── Next card preview ─────────────────────────────────────────────────────
    const nextCard = gs.getNextCard ? gs.getNextCard() : null;
    if (nextCard !== this._lastNextCard) {
      this._lastNextCard = nextCard;
      this._redrawNextCard(nextCard);
    }

    // ── Ultimate button ───────────────────────────────────────────────────────
    const ultReady = gs.ultimateCharge >= 1 && !gs.ultimateUsed;
    // Always redraw when ready so the pulsing border animates every frame.
    const ultRound = ultReady ? 0 : (Math.round(gs.ultimateCharge * 200) + (gs.ultimateUsed ? 1000 : 0));
    if (ultReady || ultRound !== this._lastUltRound) {
      this._lastUltRound = ultReady ? -1 : ultRound;
      this._redrawUltimate(gs.ultimateCharge, gs.ultimateUsed);

      const isReady = gs.ultimateCharge >= 1 && !gs.ultimateUsed;
      if (isReady && !this._ultWasReady) {
        this._ultReadyText.setAlpha(1);
        this.tweens.add({
          targets: this._ultReadyText,
          alpha:   { from: 1, to: 0 },
          duration: 2200,
          ease:    'Cubic.easeIn',
        });
      }
      this._ultWasReady = isReady;
    }

    // ── Double Power activation ───────────────────────────────────────────────
    const inDoublePower = gs.matchTimeRemaining <= ENERGY.doublePowerThreshold &&
                          gs.matchMode === 'normal';
    if (inDoublePower && !this._doublePowerActive) {
      this._doublePowerActive = true;
      this._triggerDoublePowerAnim();
    }
    if (!inDoublePower) this._doublePowerActive = false;

    // ── Sudden-death / tiebreaker arena border glow ──────────────────────────
    const inSD = gs.matchMode === 'suddenDeath' || gs.matchMode === 'tiebreaker';
    if (inSD) {
      const pulse = 0.25 + 0.30 * Math.abs(Math.sin(this.time.now * 0.003));
      this._sdBorderGfx.clear();
      this._sdBorderGfx.lineStyle(4, 0x3a0e0e, pulse);
      this._sdBorderGfx.strokeRect(1, 1, ARENA.width - 2, this.ARENA_BOTTOM_Y - 2);
    } else {
      this._sdBorderGfx.clear();
    }

    // ── Sudden-death banner text ──────────────────────────────────────────────
    if (gs.matchMode === 'suddenDeath') {
      const pulse = 0.55 + 0.45 * Math.abs(Math.sin(this.time.now * 0.003));
      this._suddenDeathBanner.setText('SUDDEN DEATH').setAlpha(pulse);
    } else {
      this._suddenDeathBanner.setAlpha(0);
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [REDRAW]
  // ═══════════════════════════════════════════════════════════════════════════

  _redrawEnergy(energy) {
    const PIP_W = 28, PIP_H = 13, PIP_GAP = 3;
    const totalW = ENERGY.max * PIP_W + (ENERGY.max - 1) * PIP_GAP;
    const startX = (ARENA.width - totalW) / 2;
    const pipY   = 764;
    const full   = energy >= ENERGY.max;

    // Organic breathing pulse at max energy — bioluminescent signal
    const pulseAlpha = full
      ? Math.abs(Math.sin(this.time.now * 0.003)) * 0.25
      : 0;

    // Persistent double-power glow around entire bar
    this._energyGlowGfx.clear();
    if (this._doublePowerActive) {
      const glowA = 0.30 + 0.22 * Math.abs(Math.sin(this.time.now * 0.005));
      this._energyGlowGfx.lineStyle(3, 0x1a5a52, glowA);
      this._energyGlowGfx.strokeRect(startX - 4, pipY - 3, totalW + 8, PIP_H + 6);
    }

    const g = this.energyGfx;
    g.clear();
    for (let i = 0; i < ENERGY.max; i++) {
      const px = startX + i * (PIP_W + PIP_GAP);
      // Empty segment — near-black teal
      g.fillStyle(0x080f0e, 1);
      g.fillRoundedRect(px, pipY, PIP_W, PIP_H, 2);
      // Very faint border
      g.lineStyle(1, 0x0a2a28, 0.7);
      g.strokeRoundedRect(px, pipY, PIP_W, PIP_H, 2);

      if (i < Math.floor(energy)) {
        // Full segment — deep bioluminescent teal fill
        g.fillStyle(0x0e3a3a, 1);
        g.fillRoundedRect(px + 1, pipY + 1, PIP_W - 2, PIP_H - 2, 2);
        // Hairline divider on right edge
        g.lineStyle(1, 0x0a0d0e, 0.5);
        g.beginPath();
        g.moveTo(px + PIP_W - 1, pipY + 2);
        g.lineTo(px + PIP_W - 1, pipY + PIP_H - 2);
        g.strokePath();
        // Organic breathing pulse overlay at max
        if (full && pulseAlpha > 0) {
          g.fillStyle(0x1a5a52, pulseAlpha);
          g.fillRoundedRect(px + 1, pipY + 1, PIP_W - 2, PIP_H - 2, 2);
        }
      } else if (i === Math.floor(energy) && energy % 1 > 0) {
        // Partial segment — softer fill showing regen progress
        const fillW = Math.floor((PIP_W - 2) * (energy % 1));
        g.fillStyle(0x0d2a2a, 1);
        g.fillRect(px + 1, pipY + 1, fillW, PIP_H - 2);
      }
    }
  }

  _redrawCards(hand, energy, selectedIndex) {
    this.cardBgGfx.clear();
    for (let i = 0; i < 4; i++) {
      const x      = this._cardLeft(i);
      const cardId = hand[i];
      const unit   = cardId ? UNITS[cardId] : null;
      const afford = unit !== null && energy >= unit.cost;
      const sel    = selectedIndex === i;
      this._drawCardBg(x, this.HAND_Y, afford, sel);
      this._drawCardShape(i, x, this.HAND_Y, unit, afford);
      this._drawCardText(i, unit, afford);
    }
  }

  _drawCardBg(x, y, afford, selected) {
    const g = this.cardBgGfx;
    const w = this.CARD_W, h = this.CARD_H;
    if (selected) {
      // Selected — teal glow, brighter border
      g.fillStyle(0x0e2a28, 1);
      g.fillRoundedRect(x, y, w, h, 5);
      g.lineStyle(3, 0x1a5a52, 0.7);
      g.strokeRoundedRect(x - 2, y - 2, w + 4, h + 4, 6);
      g.lineStyle(1.5, 0x1a5a52, 1);
      g.strokeRoundedRect(x, y, w, h, 5);
    } else if (afford) {
      // Affordable — dark teal-rock with moss-stone edge
      g.fillStyle(0x0e1a18, 1);
      g.fillRoundedRect(x, y, w, h, 5);
      g.lineStyle(1, 0x1a2620, 1);
      g.strokeRoundedRect(x, y, w, h, 5);
    } else {
      // Unaffordable — very dark, dimmed, barely visible cost color
      g.fillStyle(0x080e0c, 1);
      g.fillRoundedRect(x, y, w, h, 5);
      g.lineStyle(1, 0x0f1a18, 0.8);
      g.strokeRoundedRect(x, y, w, h, 5);
    }
  }

  _drawCardShape(i, x, y, unit, afford) {
    const g   = this.cardShapeGfx[i];
    const cx  = x + this.CARD_W / 2;
    const cy  = y + 42;
    const r   = 14;
    g.clear();
    if (!unit) return;
    const alpha = afford ? 0.9 : 0.2;
    const color = unit.tint !== null ? unit.tint : COLORS.player;
    g.fillStyle(color, alpha);
    switch (unit.shape) {
      case 'circle':
        g.fillCircle(cx, cy, r);
        break;
      case 'square': {
        // Octagon for tanks
        const oct = this._polyVerts(cx, cy, r, 8, -Math.PI / 8);
        g.fillPoints(oct, true);
        break;
      }
      case 'triangle':
        g.fillTriangle(cx, cy - r, cx - r, cy + r, cx + r, cy + r);
        break;
      case 'diamond':
        g.fillTriangle(cx, cy - r, cx - r, cy, cx, cy + r);
        g.fillTriangle(cx, cy - r, cx + r, cy, cx, cy + r);
        break;
      case 'pentagon': {
        const pent = this._polyVerts(cx, cy, r, 5, -Math.PI / 2);
        g.fillPoints(pent, true);
        break;
      }
      case 'star': {
        const star = this._starVerts(cx, cy, r, r * 0.45, 5);
        g.fillPoints(star, true);
        break;
      }
      default:
        g.fillCircle(cx, cy, r);
    }
  }

  // Shape helper — regular polygon vertices
  _polyVerts(cx, cy, r, sides, startAngle = 0) {
    const v = [];
    for (let i = 0; i < sides; i++) {
      const a = (Math.PI * 2 / sides) * i + startAngle;
      v.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
    }
    return v;
  }

  // Star polygon vertices (alternating outer/inner radii)
  _starVerts(cx, cy, outerR, innerR, points) {
    const v = [];
    for (let i = 0; i < points * 2; i++) {
      const a = (Math.PI / points) * i - Math.PI / 2;
      const rad = i % 2 === 0 ? outerR : innerR;
      v.push({ x: cx + rad * Math.cos(a), y: cy + rad * Math.sin(a) });
    }
    return v;
  }

  _drawCardText(i, unit, afford) {
    const nameT = this.cardNameText[i];
    const costT = this.cardCostText[i];
    if (!unit) {
      nameT.setText(''); costT.setText('');
      return;
    }
    // Card face shows NO name — name is only revealed on hover/drag.
    nameT.setText('');
    costT.setText(String(unit.cost));
    // Unaffordable: dark red hint (barely visible per spec); affordable: muted teal
    costT.setColor(afford ? '#3a5a50' : '#2a1a1a');
    costT.setAlpha(afford ? 1 : 0.6);
  }

  _redrawUltimate(charge, used) {
    // Circular button centered at (36, 776)
    const cx = 36, cy = 776, r = 24;
    const ready = charge >= 1 && !used;

    const g = this.ultimateGfx;
    g.clear();

    if (used) {
      // Spent — very dim
      g.fillStyle(0x0a0d0e, 1);
      g.fillCircle(cx, cy, r);
      g.lineStyle(1, 0x1a2620, 0.5);
      g.strokeCircle(cx, cy, r);
    } else if (ready) {
      // Charged — bioluminescent breathing animation
      const pulse = 0.5 + 0.5 * Math.abs(Math.sin(this.time.now * 0.003));
      // Outer glow bloom
      g.fillStyle(0x1a5a52, 0.12 * pulse);
      g.fillCircle(cx, cy, r + 8);
      // Body
      g.fillStyle(0x0e3a3a, 1);
      g.fillCircle(cx, cy, r);
      // Inner highlight
      g.fillStyle(0x1a5a52, 0.25 * pulse);
      g.fillCircle(cx, cy, r * 0.6);
      // Border — pulsing teal
      g.lineStyle(1.5, 0x1a5a52, 0.7 + 0.3 * pulse);
      g.strokeCircle(cx, cy, r);
    } else {
      // Charging — progress ring
      g.fillStyle(0x0a0d0e, 1);
      g.fillCircle(cx, cy, r);
      // Progress arc fill
      if (charge > 0) {
        const arcEnd = -Math.PI / 2 + Math.PI * 2 * charge;
        g.fillStyle(0x0e3a3a, 0.85);
        g.beginPath();
        g.moveTo(cx, cy);
        g.arc(cx, cy, r - 2, -Math.PI / 2, arcEnd, false);
        g.closePath();
        g.fillPath();
      }
      g.lineStyle(1, 0x1a2620, 0.8);
      g.strokeCircle(cx, cy, r);
    }

    // Label above circle
    this.ultLabelText.setPosition(cx, cy - r - 4);
    this.ultLabelText.setColor(ready ? '#b8d8cc' : (used ? '#1a2620' : '#3a5a50'));

    // Charge text inside circle
    this.ultPctText.setPosition(cx, cy);
    if (used) {
      this.ultPctText.setText('USED');
      this.ultPctText.setColor('#1a2620');
      this.ultPctText.setFontSize('7px');
    } else if (ready) {
      this.ultPctText.setText('READY');
      this.ultPctText.setColor('#b8d8cc');
      this.ultPctText.setFontSize('9px');
    } else {
      this.ultPctText.setText(`${Math.floor(charge * 100)}%`);
      this.ultPctText.setColor('#3a5a50');
      this.ultPctText.setFontSize('10px');
    }
  }

  // ── Next card preview redraw ─────────────────────────────────────────────────
  _redrawNextCard(cardId) {
    const g = this._nextCardShapeGfx;
    g.clear();
    if (!cardId) return;
    const unit  = UNITS[cardId];
    if (!unit)  return;
    const cx    = this._nextCardPrevX + this._nextCardPrevW / 2;
    const cy    = this._nextCardPrevY + this._nextCardPrevH / 2 - 4;
    const r     = 10;
    const color = unit.tint !== null ? unit.tint : COLORS.player;
    g.fillStyle(color, 0.4);
    switch (unit.shape) {
      case 'circle':   g.fillCircle(cx, cy, r); break;
      case 'square': {
        const oct = this._polyVerts(cx, cy, r, 8, -Math.PI / 8);
        g.fillPoints(oct, true); break;
      }
      case 'triangle': g.fillTriangle(cx, cy - r, cx - r, cy + r, cx + r, cy + r); break;
      case 'diamond':
        g.fillTriangle(cx, cy - r, cx - r, cy, cx, cy + r);
        g.fillTriangle(cx, cy - r, cx + r, cy, cx, cy + r);
        break;
      case 'pentagon': {
        const pent = this._polyVerts(cx, cy, r, 5, -Math.PI / 2);
        g.fillPoints(pent, true); break;
      }
      case 'star': {
        const star = this._starVerts(cx, cy, r, r * 0.45, 5);
        g.fillPoints(star, true); break;
      }
      default: g.fillCircle(cx, cy, r);
    }
    this._nextCardCostText.setText(String(unit.cost));
  }

  // ── Score pop animation ──────────────────────────────────────────────────────
  _triggerScorePop() {
    const gs = this.gameScene;
    if (!gs) return;
    // Determine which faction scored by checking whose structures just changed.
    // Simplest: pop both and let the frame update settle the numbers.
    this._scorePop.player = 1.3;
    this._scorePop.enemy  = 1.3;
  }

  // ── Tiebreaker splash ────────────────────────────────────────────────────────
  _showTiebreakerSplash() {
    const t = this._tieBreakerSplash;
    t.setAlpha(1);
    this.tweens.add({
      targets: t,
      scaleX:  { from: 1.4, to: 1 },
      scaleY:  { from: 1.4, to: 1 },
      alpha:   { from: 1, to: 0 },
      delay:   400,
      duration: 1200,
      ease: 'Cubic.easeOut',
    });
  }

  // ── Double-power entry animation ─────────────────────────────────────────────
  // Flashes energy bar 3× then shows a brief "2X POWER" text.
  _triggerDoublePowerAnim() {
    // Flash energy bar: 3 rapid toggles
    let flashes = 0;
    const doFlash = () => {
      if (flashes >= 6) {
        // After flashes: show 2X POWER text
        const t = this._doublePowerText;
        t.setAlpha(0);
        this.tweens.add({
          targets: t,
          alpha:   { from: 1, to: 0 },
          duration: 1400,
          delay:   300,
          ease:    'Cubic.easeIn',
          onStart: () => t.setAlpha(1),
        });
        return;
      }
      this.energyGfx.setAlpha(flashes % 2 === 0 ? 0.2 : 1);
      flashes++;
      this.time.delayedCall(120, doFlash);
    };
    doFlash();
  }
}
