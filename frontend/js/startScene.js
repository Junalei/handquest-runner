// StartScene - preloads bg.png, start.png, cat.png and displays Start Page UI
// Title is split into two lines (HANDQUEST / RUNNER), start button scaled smaller,
// and cat sprite positioned lower-left of the start button.
// Phaser text uses the Press Start 2P font loaded in index.html.

class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: 'StartScene' });
  }

  preload() {
    // load assets from specified locations
    this.load.image('bg', '/assets/sprites/environment/background.png');
    this.load.image('startBtn', '/assets/sprites/ui/start.png');
    this.load.image('cat', '/assets/sprites/obstacles/cat.png');

    // Optional hover/click sound (add file into frontend/assets/audio and uncomment)
    // this.load.audio('btnHover', '/assets/audio/btnHover.mp3');
    // this.load.audio('btnClick', '/assets/audio/btnClick.mp3');
  }

  create() {
    // --- background setup ---
    const bg = this.add.image(0, 0, 'bg').setOrigin(0, 0);

    // scale background to cover the canvas while preserving aspect ratio
    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setScrollFactor(0);

    // semi-transparent overlay for text readability
    const overlay = this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1220, 0.36).setOrigin(0);

    // --- Title (two lines, all caps), top-center ---
    // Use Press Start 2P font (loaded in index.html)
    const topPadding = this.scale.height * 0.10; // top margin for title block

    const title1 = this.add.text(this.scale.width / 2, topPadding, 'HANDQUEST', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '100px',
      color: '#ffd166',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    const title2 = this.add.text(this.scale.width / 2, topPadding + 44, 'RUNNER', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '100px',
      color: '#ffb703',
      align: 'center',
      stroke: '#000000',
      strokeThickness: 5,
    }).setOrigin(0.5);

    // slight floating tween for the title block for subtle animation
    this.tweens.add({
      targets: [title1, title2],
      y: `-=${6}`, // move up by 6 px relative and back
      ease: 'Sine.easeInOut',
      duration: 1200,
      yoyo: true,
      repeat: -1,
      delay: 80
    });

    // --- Start button: centered and modest size ---
    // Adjust baseScale to control how big the sprite appears; lowered to avoid filling screen
    const baseBtnScale = 0.35; // <-- reduced so start button is "just enough size"
    const btnY = this.scale.height * 0.70;
    const startBtn = this.add.image(this.scale.width / 2, btnY, 'startBtn')
      .setOrigin(0.5)
      .setScale(baseBtnScale);

    // Interactive behavior and subtle idle pulse
    startBtn.setInteractive({ useHandCursor: true });

    // Idle pulse (very subtle)
    this.tweens.add({
      targets: startBtn,
      scaleX: baseBtnScale * 1.02,
      scaleY: baseBtnScale * 1.02,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Hover: scale up slightly (quick)
    startBtn.on('pointerover', () => {
      this.tweens.killTweensOf(startBtn);
      this.tweens.add({
        targets: startBtn,
        scaleX: baseBtnScale * 1.10,
        scaleY: baseBtnScale * 1.10,
        duration: 120,
        ease: 'Power1'
      });
      // if (this.sound.get('btnHover')) this.sound.play('btnHover');
    });

    // Pointer out: return to idle pulse size
    startBtn.on('pointerout', () => {
      this.tweens.killTweensOf(startBtn);
      this.tweens.add({
        targets: startBtn,
        scaleX: baseBtnScale * 1.02,
        scaleY: baseBtnScale * 1.02,
        duration: 160,
        ease: 'Power1'
      });
    });

    startBtn.on('pointerdown', () => {
        // disable further clicks
        startBtn.disableInteractive();

        // Fade-out transition
        this.cameras.main.fadeOut(800, 0, 0, 0); // 800ms fade to black

        // Redirect once fade completes
        this.time.delayedCall(800, () => {
            window.location.href = '/upload';
        });
    });


    // --- Cat sprite positioned slightly lower-left of the start button ---
    // Calculate offsets relative to the button's displayed size so positioning remains proportional
    const catScale = 0.6; // scale for cat sprite relative to native asset
    const catOffsetX = - (startBtn.displayWidth * 0.62); // left offset
    const catOffsetY = (startBtn.displayHeight * 0.28);  // slight lower offset

    let catX = startBtn.x + catOffsetX;
    let catY = startBtn.y + catOffsetY;

    const cat = this.add.image(catX, catY, 'cat').setOrigin(0.5).setScale(catScale);

    // subtle bob for cat
    this.tweens.add({
      targets: cat,
      y: `-=${10}`, // move up by 6 px relative and back
      ease: 'Sine.easeInOut',
      duration: 1400,
      yoyo: true,
      repeat: -1
    });

    // Keyboard accessibility: Enter triggers start
    this.input.keyboard.on('keydown-ENTER', () => {
      window.location.href = '/upload.html';
    });

    // --- Keep elements responsive on resize ---
    // Store values used to reposition so they recalc correctly
    const reposition = () => {
        // Move titles higher or lower
        const titleTop = this.scale.height * 0.15; // move titles lower (was 0.10)
        title1.setPosition(this.scale.width / 2, titleTop + 80); // increase spacing between lines
        title2.setPosition(this.scale.width / 2, titleTop + 190); // increase spacing between lines

        // Adjust button position
        const newBtnY = this.scale.height * 0.70; // move start button lower
        startBtn.setPosition(this.scale.width / 2, newBtnY);

        // Adjust cat position relative to new button placement
        const newCatOffsetX = - (startBtn.displayWidth * 0.80);
        const newCatOffsetY = (startBtn.displayHeight * 0.80);
        cat.setPosition(startBtn.x + newCatOffsetX, startBtn.y + newCatOffsetY);
    };


    // bind Phaser scale resize
    this.scale.on('resize', (gameSize) => {
      reposition();
    });

    // Call reposition once in case initial canvas size differs from assumptions
    reposition();
  }
}

// Expose scene globally so main.js can use it when initializing the game
window.StartScene = StartScene;
