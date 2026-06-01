// ResultScene — shown when the match ends (time-out or base destroyed).
// Panel slides UP from bottom over 0.4 seconds after match ends.
// Top 38% of screen still shows the arena final state (dimmed).
// Receives { outcome, reason, playerScore, enemyScore, elapsedSeconds,
//            playerUltimate, playerDeck, autoPlay } from GameScene.
//
// Auto-play mode: if autoPlay is true, skips the panel entirely and rematches
// after a 2-second countdown.  A STOP button lets the user break the loop.

class ResultScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultScene' });
  }

  create() {
    const data           = this.scene.settings.data || {};
    const outcome        = data.outcome        || 'win';
    const reason         = data.reason         || '';
    const playerScore    = data.playerScore    != null ? data.playerScore    : 0;
    const enemyScore     = data.enemyScore     != null ? data.enemyScore     : 0;
    const elapsedSeconds = data.elapsedSeconds != null ? data.elapsedSeconds : 0;
    const playerUltimate = data.playerUltimate  || 'dropPod';
    const playerDeck     = data.playerDeck      || null;
    const autoPlay       = data.autoPlay        || false;
    const botPersonality = data.botPersonality  || 'split';

    // Format elapsed time as M:SS
    const durationMins = Math.floor(elapsedSeconds / 60);
    const durationSecs = String(elapsedSeconds % 60).padStart(2, '0');
    const durationStr  = `${durationMins}:${durationSecs}`;

    // ── Auto-play rematch loop ────────────────────────────────────────────────
    // Skip the full result panel — show a minimal overlay with countdown +
    // a STOP button the player can tap to break out of the loop.
    if (autoPlay) {
      this._buildAutoRematch(outcome, playerScore, enemyScore,
                             playerUltimate, playerDeck, botPersonality);
      return;
    }

    // ── Dimmed arena overlay (top 38% of canvas) ──────────────────────────────
    const arenaOverlay = this.add.graphics();
    arenaOverlay.fillStyle(0x0a0d0e, 0.65);
    arenaOverlay.fillRect(0, 0, ARENA.width, ARENA.height * 0.38);

    // ── Panel setup — starts off-screen below, slides up ─────────────────────
    const PANEL_TOP = Math.round(ARENA.height * 0.38);
    const PANEL_H   = ARENA.height - PANEL_TOP;
    const PANEL_OFF = ARENA.height + 10;   // off-screen start position

    // Panel container — all content attached here so it slides as one unit.
    const panel = this.add.container(0, PANEL_OFF);

    // Panel background — dark teal-rock console
    const panelBg = this.add.graphics();
    panelBg.fillStyle(0x0e1a18, 1);
    panelBg.fillRoundedRect(0, PANEL_TOP, ARENA.width, PANEL_H, { tl: 14, tr: 14, bl: 0, br: 0 });

    // Top edge line — faction color
    const edgeColor = outcome === 'win'  ? 0x1a5a52
                    : outcome === 'draw' ? 0x3a5a50
                    :                      0x5a1a1a;
    panelBg.lineStyle(2, edgeColor, 1);
    panelBg.beginPath();
    panelBg.moveTo(14, PANEL_TOP);
    panelBg.lineTo(ARENA.width - 14, PANEL_TOP);
    panelBg.strokePath();

    panel.add(panelBg);

    // ── VERDICT ──────────────────────────────────────────────────────────────
    const verdictLabel = outcome === 'win'  ? 'VICTORY'
                       : outcome === 'draw' ? 'DRAW'
                       :                      'DEFEATED';
    const verdictColor = outcome === 'win'  ? '#b8d8cc'
                       : outcome === 'draw' ? '#3a5a50'
                       :                      '#b8d8cc';

    const verdictText = this.add.text(ARENA.width / 2, PANEL_TOP + 38, verdictLabel, {
      fontSize: '34px',
      fontFamily: '"Share Tech Mono", monospace',
      fontStyle:  'bold',
      color:       verdictColor,
      letterSpacing: 6,
    }).setOrigin(0.5, 0.5);

    panel.add(verdictText);

    // Thin horizontal separator below verdict
    const sep = this.add.graphics();
    sep.lineStyle(1, edgeColor, 0.6);
    sep.beginPath();
    sep.moveTo(ARENA.width / 2 - 80, PANEL_TOP + 62);
    sep.lineTo(ARENA.width / 2 + 80, PANEL_TOP + 62);
    sep.strokePath();
    panel.add(sep);

    // ── SCORE SECTION ─────────────────────────────────────────────────────────
    const scoreY = PANEL_TOP + 110;

    // Vertical divider between blocks
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x1a2620, 0.8);
    divider.beginPath();
    divider.moveTo(ARENA.width / 2, scoreY - 40);
    divider.lineTo(ARENA.width / 2, scoreY + 70);
    divider.strokePath();
    panel.add(divider);

    // Player block (left)
    const youLabel = this.add.text(ARENA.width / 2 - 70, scoreY - 22, 'YOU', {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5, 0);
    panel.add(youLabel);

    const playerScoreText = this.add.text(ARENA.width / 2 - 70, scoreY, String(playerScore), {
      fontSize: '52px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#2a7a6a',
    }).setOrigin(0.5, 0);
    panel.add(playerScoreText);

    // Enemy block (right)
    const enemyLabel = this.add.text(ARENA.width / 2 + 70, scoreY - 22, 'ENEMY', {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5, 0);
    panel.add(enemyLabel);

    const enemyScoreText = this.add.text(ARENA.width / 2 + 70, scoreY, String(enemyScore), {
      fontSize: '52px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#7a2a2a',
    }).setOrigin(0.5, 0);
    panel.add(enemyScoreText);

    // Decisive victory/defeat sub-label
    if (reason) {
      const subLabel = outcome === 'win' ? 'DECISIVE VICTORY' : 'DECISIVE DEFEAT';
      const subColor = outcome === 'win' ? '#1a5a52' : '#5a1a1a';
      const subText = this.add.text(ARENA.width / 2, scoreY + 68, subLabel, {
        fontSize: '9px', fontFamily: '"Share Tech Mono", monospace',
        color: subColor, letterSpacing: 2,
      }).setOrigin(0.5, 0);
      panel.add(subText);
    }

    // ── MATCH DURATION ────────────────────────────────────────────────────────
    const durationText = this.add.text(ARENA.width - 14, PANEL_TOP + PANEL_H - 70,
      `MATCH DURATION  ${durationStr}`, {
        fontSize: '10px',
        fontFamily: '"Share Tech Mono", monospace',
        color: '#3a5a50',
      }
    ).setOrigin(1, 1);
    panel.add(durationText);

    // ── BUTTON ROW ────────────────────────────────────────────────────────────
    const btnW = 160, btnH = 44, gap = 16;
    const totalW = btnW * 2 + gap;
    const startX = (ARENA.width - totalW) / 2;
    const btnY   = PANEL_TOP + PANEL_H - btnH - 28;

    // REMATCH button — teal glow, slow breathing pulse
    const rematchGfx = this.add.graphics();
    this._drawButton(rematchGfx, startX, btnY, btnW, btnH, 0x0e3a3a, 0x1a5a52);
    panel.add(rematchGfx);

    const rematchLabel = this.add.text(startX + btnW / 2, btnY + btnH / 2, 'REMATCH', {
      fontSize: '16px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc', letterSpacing: 2,
    }).setOrigin(0.5);
    panel.add(rematchLabel);

    const rematchZone = this.add.zone(startX, btnY, btnW, btnH).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.stop('UIScene');
        this.scene.start('MenuScene');
      })
      .on('pointerover', () => {
        rematchGfx.clear();
        this._drawButton(rematchGfx, startX, btnY, btnW, btnH, 0x1a5a52, 0x2a7a6a);
        rematchLabel.setColor('#d8f0e0');
      })
      .on('pointerout', () => {
        rematchGfx.clear();
        this._drawButton(rematchGfx, startX, btnY, btnW, btnH, 0x0e3a3a, 0x1a5a52);
        rematchLabel.setColor('#b8d8cc');
      });
    panel.add(rematchZone);

    // MAIN MENU button — no fill, bordered only
    const menuX = startX + btnW + gap;
    const menuGfx = this.add.graphics();
    this._drawButtonOutline(menuGfx, menuX, btnY, btnW, btnH, 0x1a2620);
    panel.add(menuGfx);

    const menuLabel = this.add.text(menuX + btnW / 2, btnY + btnH / 2, 'MAIN MENU', {
      fontSize: '14px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#3a5a50', letterSpacing: 1,
    }).setOrigin(0.5);
    panel.add(menuLabel);

    const menuZone = this.add.zone(menuX, btnY, btnW, btnH).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.scene.stop('UIScene');
        this.scene.start('MenuScene');
      })
      .on('pointerover', () => {
        menuGfx.clear();
        this._drawButtonOutline(menuGfx, menuX, btnY, btnW, btnH, 0x1a5a52);
        menuLabel.setColor('#b8d8cc');
      })
      .on('pointerout', () => {
        menuGfx.clear();
        this._drawButtonOutline(menuGfx, menuX, btnY, btnW, btnH, 0x1a2620);
        menuLabel.setColor('#3a5a50');
      });
    panel.add(menuZone);

    // ── Slide the panel UP from off-screen ───────────────────────────────────
    this.tweens.add({
      targets:  panel,
      y:        0,
      duration: 400,
      ease:     'Cubic.easeOut',
      onComplete: () => {
        // After landing: animate the verdict text settling in place
        this.tweens.add({
          targets:  verdictText,
          y:        { from: PANEL_TOP + 18, to: PANEL_TOP + 38 },
          duration: 200,
          ease:     'Cubic.easeOut',
        });
        // Teal bloom flash for victory
        if (outcome === 'win') {
          this.tweens.add({
            targets: verdictText,
            alpha: { from: 0.4, to: 1 },
            duration: 300,
            ease: 'Cubic.easeOut',
          });
        }
      },
    });
  }

  // ── Auto-play rematch overlay ─────────────────────────────────────────────
  // Minimal full-screen overlay: shows result, countdown, STOP button.
  // No panel slide — just immediate feedback so the loop stays snappy.
  _buildAutoRematch(outcome, playerScore, enemyScore, playerUltimate, playerDeck, botPersonality) {
    const W = ARENA.width;
    const H = ARENA.height;

    // Semi-transparent overlay — teal for win, red for loss
    const overlayColor = outcome === 'win' ? 0x0e1a18 : 0x1a0e0e;
    const bg = this.add.graphics();
    bg.fillStyle(overlayColor, 0.88);
    bg.fillRect(0, 0, W, H);

    // Result label
    const label = outcome === 'win' ? 'VICTORY' : outcome === 'lose' ? 'DEFEATED' : 'DRAW';
    const labelColor = outcome === 'win' ? '#2a7a6a' : outcome === 'lose' ? '#7a2a2a' : '#3a5a50';
    this.add.text(W / 2, H / 2 - 80, label, {
      fontSize: '36px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: labelColor, letterSpacing: 6,
    }).setOrigin(0.5);

    // Score line
    this.add.text(W / 2, H / 2 - 32, `${playerScore}  —  ${enemyScore}`, {
      fontSize: '22px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#b8d8cc',
    }).setOrigin(0.5);

    // Bot personality label — lets you watch which style is being trained against
    const persLabel = (botPersonality || 'split').replace('_', ' ').toUpperCase();
    this.add.text(W / 2, H / 2 - 4, `BOT STYLE  ·  ${persLabel}`, {
      fontSize: '10px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5);

    // Countdown text — counts from 2 down to 0
    const countdownText = this.add.text(W / 2, H / 2 + 20, 'NEXT MATCH IN  2', {
      fontSize: '13px', fontFamily: '"Share Tech Mono", monospace',
      color: '#3a5a50', letterSpacing: 2,
    }).setOrigin(0.5);

    let secondsLeft = 2;
    const tick = () => {
      secondsLeft--;
      if (secondsLeft > 0) {
        countdownText.setText(`NEXT MATCH IN  ${secondsLeft}`);
        this.time.delayedCall(1000, tick);
      } else {
        countdownText.setText('STARTING...');
        this.time.delayedCall(300, () => {
          this.scene.stop('UIScene');
          this.scene.start('GameScene', { playerUltimate, playerDeck });
        });
      }
    };
    this.time.delayedCall(1000, tick);

    // STOP button — exits the loop to MenuScene
    const btnW = 160, btnH = 44;
    const btnX = W / 2 - btnW / 2;
    const btnY = H / 2 + 60;

    const stopGfx = this.add.graphics();
    const drawStop = (hover) => {
      stopGfx.clear();
      stopGfx.fillStyle(hover ? 0x3a1010 : 0x1a0a0a, 1);
      stopGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 7);
      stopGfx.lineStyle(1, hover ? 0x7a2a2a : 0x3a1a1a, 1);
      stopGfx.strokeRoundedRect(btnX, btnY, btnW, btnH, 7);
    };
    drawStop(false);

    const stopLabel = this.add.text(btnX + btnW / 2, btnY + btnH / 2, 'STOP AUTO-PLAY', {
      fontSize: '12px', fontFamily: '"Share Tech Mono", monospace',
      fontStyle: 'bold', color: '#7a3a3a', letterSpacing: 1,
    }).setOrigin(0.5);

    this.add.zone(btnX, btnY, btnW, btnH).setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        // Disable auto-play and return to menu
        localStorage.setItem('arenaClash_autoplay_v1', '0');
        this.scene.stop('UIScene');
        this.scene.start('MenuScene');
      })
      .on('pointerover', () => { drawStop(true);  stopLabel.setColor('#b85a5a'); })
      .on('pointerout',  () => { drawStop(false); stopLabel.setColor('#7a3a3a'); });
  }

  _drawButton(g, x, y, w, h, fillColor, borderColor) {
    g.fillStyle(fillColor, 1);
    g.fillRoundedRect(x, y, w, h, 7);
    g.lineStyle(1, borderColor, 1);
    g.strokeRoundedRect(x, y, w, h, 7);
  }

  _drawButtonOutline(g, x, y, w, h, borderColor) {
    g.fillStyle(0x0a0d0e, 0.01);
    g.fillRoundedRect(x, y, w, h, 7);
    g.lineStyle(1, borderColor, 1);
    g.strokeRoundedRect(x, y, w, h, 7);
  }
}
