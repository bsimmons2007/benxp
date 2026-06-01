// MenuScene — title screen, ultimate selection, and deck builder.
//
// Sections:
//   [BACKGROUND] — alien planet ground with bioluminescent veins
//   [HEADER]     — top bar with title and win/loss record
//   [TABS]       — ULTIMATE / DECK tab switching
//   [ULT]        — ultimate selection panel
//   [DECK]       — deck builder panel — pick exactly 12 of 14 cards
//   [START]      — BATTLE button + scene transition

class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    // ── Background ────────────────────────────────────────────────────────────
    this._buildBackground();

    // ── State ─────────────────────────────────────────────────────────────────
    this._selectedUltimate = 'dropPod';
    this._selectedDeck     = new Set(DEFAULT_DECK);
    this._activeTab        = 'ultimate';

    // Load win/loss record from localStorage
    const wlRaw = localStorage.getItem('arenaClash_wl_v1');
    this._wl = wlRaw ? JSON.parse(wlRaw) : { w: 0, l: 0 };

    // Object buckets — show/hide when tab changes.
    this._ultObjs  = [];
    this._deckObjs = [];

    // ── Header ────────────────────────────────────────────────────────────────
    this._buildHeader();

    // ── Tab bar ───────────────────────────────────────────────────────────────
    this._tabGfx = this.add.graphics();
    this._tabDeckLabel = this.add.text(ARENA.width * 0.25, 107, 'DECK', {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5);
    this._tabUltLabel  = this.add.text(ARENA.width * 0.75, 107, 'ULTIMATE', {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5);

    const halfW = ARENA.width / 2;
    this.add.zone(0, 90, halfW, 34).setOrigin(0, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._switchTab('deck'));
    this.add.zone(halfW, 90, halfW, 34).setOrigin(0, 0).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._switchTab('ultimate'));

    // ── Build panels ──────────────────────────────────────────────────────────
    this._buildUltimatePanel();
    this._buildDeckPanel();

    // ── BATTLE button (always visible) ────────────────────────────────────────
    this._buildBattleButton();

    // Activate default tab
    this._switchTab('ultimate');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [BACKGROUND] — Alien desert planet
  // ═══════════════════════════════════════════════════════════════════════════

  _buildBackground() {
    const g = this.add.graphics();

    // Ground base — near-black alien rock
    g.fillStyle(0x0a0d0e, 1);
    g.fillRect(0, 0, ARENA.width, ARENA.height);

    // Lane surfaces visible behind the UI — dark teal-rock
    g.fillStyle(0x111a18, 0.5);
    for (const cx of LANE_CENTERS) {
      g.fillRect(cx - LANE_WIDTH / 2, 0, LANE_WIDTH, ARENA.height);
    }

    // Bioluminescent ground veins
    const veins = [
      { sx: 30,  sy: 100, ex: 150, ey: 280, mx: 80,  my: 190 },
      { sx: 60,  sy: 400, ex: 180, ey: 520, mx: 100, my: 455 },
      { sx: 20,  sy: 600, ex: 160, ey: 700, mx: 80,  my: 645 },
      { sx: 280, sy: 150, ex: 420, ey: 280, mx: 350, my: 210 },
      { sx: 300, sy: 420, ex: 460, ey: 550, mx: 390, my: 475 },
      { sx: 320, sy: 650, ex: 450, ey: 740, mx: 380, my: 690 },
      { sx: 180, sy: 250, ex: 300, ey: 380, mx: 240, my: 310 },
    ];
    g.lineStyle(1, 0x0d2a22, 0.5);
    for (const v of veins) {
      g.beginPath();
      g.moveTo(v.sx, v.sy);
      g.lineTo(v.mx, v.my);
      g.lineTo(v.ex, v.ey);
      g.strokePath();
      g.fillStyle(0x0d2a22, 0.35);
      g.fillCircle(v.mx, v.my, 1.5);
    }

    // Purple mineral veins
    g.lineStyle(1, 0x3a2a5a, 0.4);
    const minerals = [
      [50, 200, 140, 260], [280, 350, 370, 410], [100, 580, 180, 650],
      [350, 160, 440, 220], [200, 700, 280, 750],
    ];
    for (const [x1, y1, x2, y2] of minerals) {
      g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.strokePath();
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      g.beginPath(); g.moveTo(mx, my); g.lineTo(mx + 16, my - 10); g.strokePath();
    }
  }

  update(time, delta) {
    // Background is static per spec — no animated stars on menu
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [HEADER]
  // ═══════════════════════════════════════════════════════════════════════════

  _buildHeader() {
    const g = this.add.graphics();
    // Header panel — dark console strip
    g.fillStyle(0x0e1a18, 0.92);
    g.fillRect(0, 0, ARENA.width, 48);
    g.lineStyle(1, 0x1a2620, 1);
    g.beginPath(); g.moveTo(0, 48); g.lineTo(ARENA.width, 48); g.strokePath();

    // Game title — left aligned
    this.add.text(12, 12, 'ARENA CLASH', {
      fontSize: '18px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 4,
    }).setOrigin(0, 0);
    this.add.text(12, 32, 'ALIEN WORLD TACTICAL COMBAT', {
      fontSize: '8px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0, 0);

    // Win/loss record — right aligned
    const { w, l } = this._wl;
    this.add.text(ARENA.width - 12, 20, `W: ${w}  L: ${l}`, {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50',
    }).setOrigin(1, 0.5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [TABS]
  // ═══════════════════════════════════════════════════════════════════════════

  _switchTab(tab) {
    this._activeTab = tab;
    for (const obj of this._ultObjs)  obj.setVisible(tab === 'ultimate');
    for (const obj of this._deckObjs) obj.setVisible(tab === 'deck');
    this._drawTabBar();
    this._updateBattleButton();
  }

  _drawTabBar() {
    const g = this._tabGfx;
    g.clear();
    const halfW = ARENA.width / 2;
    const tabY = 52, tabH = 36;

    // Panel bg
    g.fillStyle(0x080f0e, 1);
    g.fillRect(0, tabY, ARENA.width, tabH);

    // Active tab highlight — alien rock console style
    const activeX = this._activeTab === 'deck' ? 0 : halfW;
    g.fillStyle(0x0e1a18, 1);
    g.fillRoundedRect(activeX + 2, tabY + 2, halfW - 4, tabH - 4, 4);
    g.lineStyle(1.5, 0x1a5a52, 0.8);
    g.strokeRoundedRect(activeX + 2, tabY + 2, halfW - 4, tabH - 4, 4);

    // Bottom border
    g.lineStyle(1, 0x1a2620, 0.6);
    g.beginPath(); g.moveTo(0, tabY + tabH); g.lineTo(ARENA.width, tabY + tabH); g.strokePath();

    // Middle divider
    g.lineStyle(1, 0x1a2620, 0.4);
    g.beginPath(); g.moveTo(halfW, tabY + 4); g.lineTo(halfW, tabY + tabH - 4); g.strokePath();

    // Tab label colors
    this._tabDeckLabel.setColor(this._activeTab === 'deck'     ? '#b8d8cc' : '#3a5a50');
    this._tabUltLabel.setColor( this._activeTab === 'ultimate' ? '#b8d8cc' : '#3a5a50');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [ULT]
  // ═══════════════════════════════════════════════════════════════════════════

  _buildUltimatePanel() {
    const heading = this.add.text(ARENA.width / 2, 102, 'SELECT YOUR ULTIMATE', {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5);
    this._ultObjs.push(heading);

    this._optionButtons = {};
    this._buildUltimateOption('dropPod', 'DROP POD',
      'Deploy 5 Sparks anywhere on the map.\nBypasses cover system.', 150);
    this._buildUltimateOption('orbitalStrike', 'ORBITAL STRIKE',
      'Massive AOE — destroys cover,\ndamages all units and structures.', 280);

    const hint = this.add.text(ARENA.width / 2, 400, 'Drag ULT button in-game to select target', {
      fontSize: '8px', fontFamily: '"Share Tech Mono", monospace', color: '#1a2620',
    }).setOrigin(0.5);
    this._ultObjs.push(hint);

    this._highlightSelection();
  }

  _buildUltimateOption(key, label, desc, y) {
    const w = 360, h = 96;
    const x = (ARENA.width - w) / 2;

    const bg = this.add.graphics();

    // Shape icon (left-aligned)
    const iconGfx = this.add.graphics();
    this._drawUltIcon(iconGfx, x + 24, y + h / 2, key);

    const labelText = this.add.text(x + 60, y + 22, label, {
      fontSize: '16px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 2,
    }).setOrigin(0, 0.5);

    const descText = this.add.text(x + 60, y + 56, desc, {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', lineSpacing: 3,
    }).setOrigin(0, 0.5);

    const zone = this.add.zone(x, y, w, h).setOrigin(0, 0).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => {
      if (this._activeTab !== 'ultimate') return;
      this._selectedUltimate = key;
      this._highlightSelection();
    });

    this._optionButtons[key] = { bg, iconGfx, x, y, w, h, labelText, descText };
    this._ultObjs.push(bg, iconGfx, labelText, descText);
  }

  _drawUltIcon(g, cx, cy, key) {
    g.clear();
    if (key === 'dropPod') {
      // Small cluster of circles — Drop Pod sparks
      g.fillStyle(0x1a5a52, 0.8);
      g.fillCircle(cx, cy, 10);
      g.fillStyle(0x1a5a52, 0.45);
      g.fillCircle(cx - 10, cy + 6, 6);
      g.fillCircle(cx + 10, cy + 6, 6);
      g.fillCircle(cx, cy - 12, 5);
    } else {
      // Crosshair / explosion — Orbital Strike
      g.fillStyle(0x5a1a1a, 0.7);
      g.fillCircle(cx, cy, 12);
      g.lineStyle(1.5, 0x5a1a1a, 0.9);
      g.strokeCircle(cx, cy, 18);
      g.beginPath(); g.moveTo(cx - 22, cy); g.lineTo(cx + 22, cy); g.strokePath();
      g.beginPath(); g.moveTo(cx, cy - 22); g.lineTo(cx, cy + 22); g.strokePath();
    }
  }

  _highlightSelection() {
    if (!this._optionButtons) return;
    for (const k of Object.keys(this._optionButtons)) {
      const b = this._optionButtons[k];
      b.bg.clear();
      const isSelected = k === this._selectedUltimate;
      if (isSelected) {
        // Selected — teal glow
        b.bg.fillStyle(0x0e2a28, 1);
        b.bg.fillRoundedRect(b.x, b.y, b.w, b.h, 8);
        b.bg.lineStyle(5, 0x1a5a52, 0.20);
        b.bg.strokeRoundedRect(b.x - 3, b.y - 3, b.w + 6, b.h + 6, 10);
        b.bg.lineStyle(1.5, 0x1a5a52, 0.9);
        b.bg.strokeRoundedRect(b.x, b.y, b.w, b.h, 8);
        b.labelText.setColor('#b8d8cc');
        this._drawUltIcon(b.iconGfx, b.x + 24, b.y + b.h / 2, k);
      } else {
        // Unselected
        b.bg.fillStyle(0x0e1a18, 1);
        b.bg.fillRoundedRect(b.x, b.y, b.w, b.h, 8);
        b.bg.lineStyle(1, 0x1a2620, 0.8);
        b.bg.strokeRoundedRect(b.x, b.y, b.w, b.h, 8);
        b.labelText.setColor('#3a5a50');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [DECK]
  // ═══════════════════════════════════════════════════════════════════════════

  _buildDeckPanel() {
    const heading = this.add.text(ARENA.width / 2, 100, 'BUILD YOUR DECK  —  pick exactly 12', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 1,
    }).setOrigin(0.5);
    this._deckObjs.push(heading);

    const COLS   = 4;
    const CELL_W = 110;
    const CELL_H = 68;
    const gridLeft = (ARENA.width - COLS * CELL_W) / 2;
    const gridTop  = 118;

    const allIds = Object.keys(UNITS);
    this._cardCells = {};

    allIds.forEach((id, i) => {
      const col = i % COLS;
      const row = Math.floor(i / COLS);
      const cx  = gridLeft + col * CELL_W;
      const cy  = gridTop  + row * CELL_H;
      const u   = UNITS[id];

      const bg       = this.add.graphics();
      const shapeGfx = this.add.graphics();

      const nameText = this.add.text(cx + CELL_W / 2, cy + CELL_H - 10, u.name, {
        fontSize: '7px', fontFamily: '"Share Tech Mono", monospace',
        color: '#b8d8cc', align: 'center', wordWrap: { width: CELL_W - 8 },
      }).setOrigin(0.5, 1);

      const costText = this.add.text(cx + 5, cy + 4, String(u.cost), {
        fontSize: '10px', fontFamily: '"Share Tech Mono", monospace',
        fontStyle: 'bold', color: '#3a5a50',
      }).setOrigin(0, 0);

      const zone = this.add.zone(cx, cy, CELL_W, CELL_H).setOrigin(0, 0)
        .setInteractive({ useHandCursor: true });
      zone.on('pointerdown', () => {
        if (this._activeTab !== 'deck') return;
        this._toggleCard(id);
      });

      this._cardCells[id] = { bg, shapeGfx, nameText, costText, cx, cy, u };
      this._deckObjs.push(bg, shapeGfx, nameText, costText);
    });

    const rows = Math.ceil(allIds.length / COLS);
    const counterY = gridTop + rows * CELL_H + 6;
    this._deckCounterText = this.add.text(ARENA.width / 2, counterY, '12 / 12 selected', {
      fontSize: '12px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#2a7a6a',
    }).setOrigin(0.5, 0);
    this._deckObjs.push(this._deckCounterText);

    const hintY = counterY + 20;
    const deckHint = this.add.text(ARENA.width / 2, hintY, 'Tap a card to add / remove', {
      fontSize: '8px', fontFamily: '"Share Tech Mono", monospace', color: '#1a2620',
    }).setOrigin(0.5, 0);
    this._deckObjs.push(deckHint);

    this._redrawDeckGrid();
  }

  _toggleCard(id) {
    if (this._selectedDeck.has(id)) {
      if (this._selectedDeck.size <= 1) return;
      this._selectedDeck.delete(id);
    } else {
      if (this._selectedDeck.size >= 12) return;
      this._selectedDeck.add(id);
    }
    this._redrawDeckGrid();
    this._updateBattleButton();
  }

  _redrawDeckGrid() {
    const CELL_W = 110, CELL_H = 68;
    for (const [id, cell] of Object.entries(this._cardCells)) {
      const sel = this._selectedDeck.has(id);
      const { bg, shapeGfx, nameText, costText, cx, cy, u } = cell;

      bg.clear();
      if (sel) {
        bg.fillStyle(0x0e1a18, 1);
        bg.fillRoundedRect(cx + 2, cy + 2, CELL_W - 4, CELL_H - 4, 5);
        bg.lineStyle(1.5, 0x1a5a52, 0.8);
        bg.strokeRoundedRect(cx + 2, cy + 2, CELL_W - 4, CELL_H - 4, 5);
      } else {
        bg.fillStyle(0x080e0c, 1);
        bg.fillRoundedRect(cx + 2, cy + 2, CELL_W - 4, CELL_H - 4, 5);
        bg.lineStyle(1, 0x0f1a18, 0.8);
        bg.strokeRoundedRect(cx + 2, cy + 2, CELL_W - 4, CELL_H - 4, 5);
      }

      // Shape icon
      shapeGfx.clear();
      const shapeX = cx + CELL_W / 2;
      const shapeY = cy + 28;
      const r      = 12;
      const baseColor = u.tint !== null ? u.tint : 0x1a5a52;
      shapeGfx.fillStyle(baseColor, sel ? 0.85 : 0.2);
      switch (u.shape) {
        case 'circle':   shapeGfx.fillCircle(shapeX, shapeY, r); break;
        case 'square':   shapeGfx.fillRect(shapeX - r, shapeY - r, r * 2, r * 2); break;
        case 'triangle': shapeGfx.fillTriangle(shapeX, shapeY - r, shapeX - r, shapeY + r, shapeX + r, shapeY + r); break;
        case 'diamond':
          shapeGfx.fillTriangle(shapeX, shapeY - r, shapeX - r, shapeY, shapeX, shapeY + r);
          shapeGfx.fillTriangle(shapeX, shapeY - r, shapeX + r, shapeY, shapeX, shapeY + r);
          break;
        case 'pentagon': {
          const verts = [];
          for (let i = 0; i < 5; i++) {
            const a = (Math.PI * 2 / 5) * i - Math.PI / 2;
            verts.push({ x: shapeX + r * Math.cos(a), y: shapeY + r * Math.sin(a) });
          }
          shapeGfx.fillPoints(verts, true);
          break;
        }
        default: shapeGfx.fillCircle(shapeX, shapeY, r);
      }

      nameText.setAlpha(sel ? 1 : 0.3);
      costText.setAlpha(sel ? 1 : 0.3);
      costText.setColor(sel ? '#3a5a50' : '#1a2620');
    }

    const count = this._selectedDeck.size;
    this._deckCounterText.setText(`${count} / 12 selected`);
    this._deckCounterText.setColor(count === 12 ? '#2a7a6a' : '#7a2a2a');
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [START / BATTLE]
  // ═══════════════════════════════════════════════════════════════════════════

  _buildBattleButton() {
    const w = 320, h = 64;
    const x = (ARENA.width - w) / 2;
    const y = 668;

    this._battleGfx  = this.add.graphics();
    this._battleText = this.add.text(ARENA.width / 2, y + h / 2, 'BATTLE', {
      fontSize: '22px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 6,
    }).setOrigin(0.5);

    this._battleZone = this.add.zone(x, y, w, h).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true });
    this._battleZone.on('pointerdown', () => this._tryStart());
    this._battleZone.on('pointerover',  () => this._onBattleHover(true));
    this._battleZone.on('pointerout',   () => this._onBattleHover(false));

    this._battleBtnX = x;
    this._battleBtnY = y;
    this._battleBtnW = w;
    this._battleBtnH = h;

    // Breathing glow tween — the BATTLE button is alive
    this._battlePulse = 0;
    this.tweens.add({
      targets:   this,
      _battlePulse: 1,
      duration:  2500,
      yoyo:      true,
      repeat:    -1,
      ease:      'Sine.easeInOut',
      onUpdate:  () => this._updateBattleButton(),
    });

    this._updateBattleButton();

    // ── SECONDARY BUTTONS below BATTLE ──────────────────────────────────────
    this._buildSecondaryButtons(y + h + 12);
  }

  _buildSecondaryButtons(y) {
    const btnW = 130, btnH = 32, gap = 16;
    const totalW = btnW * 2 + gap;
    const startX = (ARENA.width - totalW) / 2;

    // SETTINGS button
    const settingsGfx = this.add.graphics();
    this._drawSecondaryBtn(settingsGfx, startX, y, btnW, btnH, false);
    const settingsLabel = this.add.text(startX + btnW / 2, y + btnH / 2, 'SETTINGS', {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5);

    this.add.zone(startX, y, btnW, btnH).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this._openSettings())
      .on('pointerover', () => {
        this._drawSecondaryBtn(settingsGfx, startX, y, btnW, btnH, true);
        settingsLabel.setColor('#b8d8cc');
      })
      .on('pointerout', () => {
        this._drawSecondaryBtn(settingsGfx, startX, y, btnW, btnH, false);
        settingsLabel.setColor('#3a5a50');
      });

    // HOW TO PLAY button — visually disabled
    const htpX = startX + btnW + gap;
    const htpGfx = this.add.graphics();
    this._drawHtpBtn(htpGfx, htpX, y, btnW, btnH);
    const htpLabel = this.add.text(htpX + btnW / 2, y + btnH / 2, 'HOW TO PLAY', {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#1a2620', letterSpacing: 2,
    }).setOrigin(0.5);

    // Tooltip text — hidden by default
    this._htpTooltip = this.add.text(htpX + btnW / 2, y - 10, 'COMING SOON', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50',
    }).setOrigin(0.5, 1).setAlpha(0);

    this.add.zone(htpX, y, btnW, btnH).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerover', () => {
        this._htpTooltip.setAlpha(1);
        htpLabel.setColor('#3a5a50');
      })
      .on('pointerout', () => {
        this._htpTooltip.setAlpha(0);
        htpLabel.setColor('#1a2620');
      });
  }

  _drawSecondaryBtn(g, x, y, w, h, hovered) {
    g.clear();
    g.fillStyle(0x0a0d0e, 0.01);   // nearly transparent — no fill
    g.fillRoundedRect(x, y, w, h, 5);
    g.lineStyle(1, hovered ? 0x1a5a52 : 0x1a2620, 1);
    g.strokeRoundedRect(x, y, w, h, 5);
  }

  _drawHtpBtn(g, x, y, w, h) {
    g.clear();
    g.fillStyle(0x0a0d0e, 0.01);
    g.fillRoundedRect(x, y, w, h, 5);
    g.lineStyle(1, 0x0f1a18, 0.7);
    g.strokeRoundedRect(x, y, w, h, 5);
  }

  _onBattleHover(over) {
    const g = this._battleGfx;
    g.clear();
    if (!this._battleEnabled) return;
    if (over) {
      g.fillStyle(0x1a5a52, 1);
      g.fillRoundedRect(this._battleBtnX, this._battleBtnY, this._battleBtnW, this._battleBtnH, 8);
      g.lineStyle(2, 0x2a7a6a, 1);
      g.strokeRoundedRect(this._battleBtnX, this._battleBtnY, this._battleBtnW, this._battleBtnH, 8);
      this._battleText.setColor('#d8f0e0');
    } else {
      this._updateBattleButton();
      this._battleText.setColor('#b8d8cc');
    }
  }

  _updateBattleButton() {
    this._battleEnabled = this._selectedDeck.size === 12;
    const g = this._battleGfx;
    g.clear();
    if (!this._battleEnabled) {
      g.fillStyle(0x0a0d0e, 1);
      g.fillRoundedRect(this._battleBtnX, this._battleBtnY, this._battleBtnW, this._battleBtnH, 8);
      g.lineStyle(1, 0x1a2620, 0.6);
      g.strokeRoundedRect(this._battleBtnX, this._battleBtnY, this._battleBtnW, this._battleBtnH, 8);
      this._battleText.setColor('#1a2620');
      return;
    }
    // Enabled: outer glow bloom breathes in and out
    const pulse = this._battlePulse || 0;
    const glowA = 0.20 + 0.20 * pulse;
    // Outer glow
    g.fillStyle(0x1a5a52, glowA * 0.5);
    g.fillRoundedRect(
      this._battleBtnX - 6, this._battleBtnY - 6,
      this._battleBtnW + 12, this._battleBtnH + 12, 12
    );
    // Button body
    g.fillStyle(0x0e3a3a, 1);
    g.fillRoundedRect(this._battleBtnX, this._battleBtnY, this._battleBtnW, this._battleBtnH, 8);
    // Border — breathing teal
    g.lineStyle(2, 0x1a5a52, 0.7 + 0.3 * pulse);
    g.strokeRoundedRect(this._battleBtnX, this._battleBtnY, this._battleBtnW, this._battleBtnH, 8);
    this._battleText.setColor('#b8d8cc');
  }

  _tryStart() {
    if (this._selectedDeck.size !== 12) return;
    // Heavy press feel — scale down briefly
    this.tweens.add({
      targets:  [this._battleGfx, this._battleText],
      scaleX:   0.95,
      scaleY:   0.95,
      duration: 80,
      yoyo:     true,
      onComplete: () => {
        this.scene.start('GameScene', {
          playerUltimate: this._selectedUltimate,
          playerDeck:     [...this._selectedDeck],
        });
      },
    });
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // [SETTINGS OVERLAY]
  // ═══════════════════════════════════════════════════════════════════════════

  _openSettings() {
    if (this._settingsOpen) return;
    this._settingsOpen = true;

    const W = 360, H = 360;
    const cx = ARENA.width  / 2;
    const cy = ARENA.height / 2;
    const x  = cx - W / 2;
    const y  = cy - H / 2;

    // Dim overlay — arena dimly visible behind (not fullscreen)
    const dimOverlay = this.add.graphics();
    dimOverlay.fillStyle(0x0a0d0e, 0.6);
    dimOverlay.fillRect(0, 0, ARENA.width, ARENA.height);
    dimOverlay.setAlpha(0);

    // Modal container
    const modal = this.add.container(cx, cy);
    modal.setAlpha(0);

    // Modal background
    const bg = this.add.graphics();
    bg.fillStyle(0x0e1a18, 1);
    bg.fillRoundedRect(-W / 2, -H / 2, W, H, 10);
    bg.lineStyle(2, 0x1a2620, 1);
    bg.strokeRoundedRect(-W / 2, -H / 2, W, H, 10);
    modal.add(bg);

    // Header text
    const header = this.add.text(0, -H / 2 + 22, 'SETTINGS', {
      fontSize: '14px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 3,
    }).setOrigin(0.5, 0.5);
    modal.add(header);

    // Header bottom border
    const headerLine = this.add.graphics();
    headerLine.lineStyle(1, 0x1a2620, 0.8);
    headerLine.beginPath();
    headerLine.moveTo(-W / 2 + 12, -H / 2 + 40);
    headerLine.lineTo( W / 2 - 12, -H / 2 + 40);
    headerLine.strokePath();
    modal.add(headerLine);

    // ✕ CLOSE button
    const closeBtn = this.add.text(W / 2 - 12, -H / 2 + 14, '✕ CLOSE', {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50',
    }).setOrigin(1, 0.5).setInteractive({ useHandCursor: true });
    closeBtn.on('pointerdown', () => this._closeSettings(dimOverlay, modal));
    closeBtn.on('pointerover',  () => closeBtn.setColor('#b8d8cc'));
    closeBtn.on('pointerout',   () => closeBtn.setColor('#3a5a50'));
    modal.add(closeBtn);

    // ── MASTER VOLUME ────────────────────────────────────────────────────────
    const volY = -H / 2 + 70;
    modal.add(this.add.text(-W / 2 + 18, volY, 'MASTER VOLUME', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0, 0));

    const sliderY = volY + 22;
    const sliderX = -W / 2 + 18;
    const sliderW = W - 36;

    // Load saved volume (default 0.8)
    this._masterVolume = parseFloat(localStorage.getItem('arenaClash_vol_v1') || '0.8');
    this._volSliderX   = sliderX;
    this._volSliderW   = sliderW;
    this._volSliderY   = sliderY;

    const sliderGfx = this.add.graphics();
    this._drawVolumeSlider(sliderGfx);
    modal.add(sliderGfx);
    this._volSliderGfx = sliderGfx;

    // Slider drag zone
    const sliderZone = this.add.zone(sliderX, sliderY - 12, sliderW, 24)
      .setOrigin(0, 0).setInteractive({ useHandCursor: true, draggable: true });
    sliderZone.on('pointerdown', (ptr) => {
      const relX  = Phaser.Math.Clamp((ptr.x - cx) - sliderX, 0, sliderW);
      this._masterVolume = relX / sliderW;
      this._drawVolumeSlider(sliderGfx);
      try { localStorage.setItem('arenaClash_vol_v1', String(this._masterVolume)); } catch(e) {}
    });
    sliderZone.on('pointermove', (ptr) => {
      if (!ptr.isDown) return;
      const relX  = Phaser.Math.Clamp((ptr.x - cx) - sliderX, 0, sliderW);
      this._masterVolume = relX / sliderW;
      this._drawVolumeSlider(sliderGfx);
      try { localStorage.setItem('arenaClash_vol_v1', String(this._masterVolume)); } catch(e) {}
    });
    modal.add(sliderZone);

    // ── CONTROLS ─────────────────────────────────────────────────────────────
    const ctrlY = sliderY + 36;
    modal.add(this.add.text(-W / 2 + 18, ctrlY, 'CONTROLS', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0, 0));
    modal.add(this.add.text(-W / 2 + 18, ctrlY + 16, 'DRAG CARDS TO DEPLOY', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50',
    }).setOrigin(0, 0));

    // ── AUTO-PLAY (SPECTATE) ──────────────────────────────────────────────────
    const autoPlayY = ctrlY + 52;
    modal.add(this.add.text(-W / 2 + 18, autoPlayY, 'AUTO-PLAY (SPECTATE)', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0, 0));
    modal.add(this.add.text(-W / 2 + 18, autoPlayY + 14, 'AI controls the player side — watch for bugs', {
      fontSize: '8px', fontFamily: '"Share Tech Mono", monospace', color: '#1a2620',
    }).setOrigin(0, 0));

    let autoPlayOn = localStorage.getItem('arenaClash_autoplay_v1') === '1';
    const apBtnW = 60, apBtnH = 22;
    const apBtnX = W / 2 - 18 - apBtnW;
    const apBtnY = autoPlayY - 2;

    const apGfx  = this.add.graphics();
    const apText = this.add.text(apBtnX + apBtnW / 2, apBtnY + apBtnH / 2, autoPlayOn ? 'ON' : 'OFF', {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace', fontStyle: 'bold',
      color: autoPlayOn ? '#2a7a6a' : '#3a5a50',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    const drawApBtn = () => {
      apGfx.clear();
      apGfx.fillStyle(0x0a0d0e, 0.01);
      apGfx.fillRoundedRect(apBtnX, apBtnY, apBtnW, apBtnH, 4);
      apGfx.lineStyle(1, autoPlayOn ? 0x1a5a52 : 0x1a2620, 1);
      apGfx.strokeRoundedRect(apBtnX, apBtnY, apBtnW, apBtnH, 4);
    };
    drawApBtn();
    modal.add(apGfx);
    modal.add(apText);

    apText.on('pointerdown', () => {
      autoPlayOn = !autoPlayOn;
      try { localStorage.setItem('arenaClash_autoplay_v1', autoPlayOn ? '1' : '0'); } catch(e) {}
      apText.setText(autoPlayOn ? 'ON' : 'OFF').setColor(autoPlayOn ? '#2a7a6a' : '#3a5a50');
      drawApBtn();
    });

    // ── RESET PROGRESS ────────────────────────────────────────────────────────
    const resetY = autoPlayY + 58;
    modal.add(this.add.text(-W / 2 + 18, resetY, 'RESET PROGRESS', {
      fontSize: '9px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0, 0));

    const resetBtnW = 160, resetBtnH = 28;
    const resetBtnX = -W / 2 + 18;
    const resetBtnY = resetY + 18;

    const resetGfx = this.add.graphics();
    resetGfx.fillStyle(0x0a0d0e, 0.01);
    resetGfx.fillRoundedRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH, 4);
    resetGfx.lineStyle(1, 0x5a1a1a, 0.8);
    resetGfx.strokeRoundedRect(resetBtnX, resetBtnY, resetBtnW, resetBtnH, 4);
    modal.add(resetGfx);

    const resetLabel = this.add.text(
      resetBtnX + resetBtnW / 2, resetBtnY + resetBtnH / 2, 'RESET ALL DATA', {
        fontSize: '10px', fontFamily: '"Share Tech Mono", monospace', color: '#7a2a2a', letterSpacing: 1,
      }
    ).setOrigin(0.5).setInteractive({ useHandCursor: true });
    resetLabel.on('pointerdown', () => this._confirmReset(modal, cx, cy, W, H));
    resetLabel.on('pointerover',  () => resetLabel.setColor('#9a3a3a'));
    resetLabel.on('pointerout',   () => resetLabel.setColor('#7a2a2a'));
    modal.add(resetLabel);

    // Store refs for cleanup
    this._settingsModal   = modal;
    this._settingsDim     = dimOverlay;

    // Fade in
    this.tweens.add({ targets: [dimOverlay, modal], alpha: 1, duration: 180, ease: 'Cubic.easeOut' });
  }

  _drawVolumeSlider(g) {
    const x = this._volSliderX, y = this._volSliderY, w = this._volSliderW;
    g.clear();
    // Track
    g.fillStyle(0x1a2620, 1);
    g.fillRoundedRect(x, y - 3, w, 6, 3);
    // Filled portion
    g.fillStyle(0x0e3a3a, 1);
    g.fillRoundedRect(x, y - 3, w * this._masterVolume, 6, 3);
    // Handle
    const hx = x + w * this._masterVolume;
    g.fillStyle(0x0a0d0e, 1);
    g.fillCircle(hx, y, 8);
    g.fillStyle(0x1a5a52, 0.25);
    g.fillCircle(hx, y, 11);
    g.fillStyle(0x1a5a52, 1);
    g.fillCircle(hx, y, 6);
  }

  _confirmReset(modal, cx, cy, W, H) {
    // Confirmation dialog within the modal
    const dW = W - 40, dH = 110;
    const dX = -dW / 2, dY = H / 2 - dH - 10;

    const confirmBg = this.add.graphics();
    confirmBg.fillStyle(0x0a0d0e, 0.96);
    confirmBg.fillRoundedRect(dX, dY, dW, dH, 8);
    confirmBg.lineStyle(1, 0x5a1a1a, 0.9);
    confirmBg.strokeRoundedRect(dX, dY, dW, dH, 8);
    modal.add(confirmBg);

    modal.add(this.add.text(0, dY + 22, 'THIS WILL RESET ALL MATCH HISTORY AND AI', {
      fontSize: '8px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50',
      align: 'center', letterSpacing: 1,
    }).setOrigin(0.5, 0));
    modal.add(this.add.text(0, dY + 36, 'LEARNING. CONFIRM?', {
      fontSize: '8px', fontFamily: '"Share Tech Mono", monospace', color: '#3a5a50',
      align: 'center',
    }).setOrigin(0.5, 0));

    // CONFIRM button
    const confirmBtn = this.add.text(-50, dY + 70, 'CONFIRM', {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#7a2a2a', letterSpacing: 1,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    confirmBtn.on('pointerdown', () => {
      try {
        localStorage.removeItem('arenaClash_wl_v1');
        localStorage.removeItem('arenaClash_ai_v1');
      } catch(e) {}
      this._wl = { w: 0, l: 0 };
      this._closeSettings(this._settingsDim, modal);
    });
    modal.add(confirmBtn);

    // CANCEL button
    const cancelBtn = this.add.text(50, dY + 70, 'CANCEL', {
      fontSize: '11px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 1,
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    cancelBtn.on('pointerdown', () => {
      confirmBg.destroy();
      // Remove the confirm/cancel texts — they were added last, iterate and remove
      const toRemove = modal.list.slice(-4);
      toRemove.forEach(obj => { modal.remove(obj, true); });
    });
    modal.add(cancelBtn);
  }

  _closeSettings(dimOverlay, modal) {
    this.tweens.add({
      targets:  [dimOverlay, modal],
      alpha:    0,
      duration: 150,
      ease:     'Cubic.easeIn',
      onComplete: () => {
        dimOverlay.destroy();
        modal.destroy(true);
        this._settingsOpen  = false;
        this._settingsModal = null;
        this._settingsDim   = null;
      },
    });
  }
}
