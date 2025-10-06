// ====== Phaser Game Config ======
const config = {
  type: Phaser.AUTO,
  width: 640,
  height: 480,
  backgroundColor: "#202020",
  parent: "game-container",
  physics: {
    default: "arcade",
    arcade: { gravity: { y: 800 }, debug: false }
  },
  scene: { preload, create, update }
};

let player;
let lanes = [];
let currentLane = 1; // 0 = left, 1 = center, 2 = right
let isJumping = false;
let isDucking = false;
let background;

// Movement control helpers
let lastGesture = "none";
let lastMoveTime = 0;
const MOVE_COOLDOWN = 300; // ms between repeated moves when holding left/right

// ====== Start Phaser ======
const game = new Phaser.Game(config);

// ====== Preload assets ======
function preload() {
  // Simple colored box as placeholder player
  this.graphics = this.add.graphics();
  this.graphics.fillStyle(0x00ccff, 1);
  this.graphics.fillRect(0, 0, 40, 60);
  this.graphics.generateTexture("player", 40, 60);
  this.graphics.destroy();

  // Simple repeating background
  this.load.image("bg", "https://labs.phaser.io/assets/skies/space3.png");
}

// ====== Create game objects ======
function create() {
  // Background (repeating to simulate running)
  background = this.add.tileSprite(320, 240, 640, 480, "bg");

  // Lanes positions (x)
  lanes = [220, 320, 420];

  // Player sprite
  player = this.physics.add.sprite(lanes[currentLane], 380, "player");
  player.setCollideWorldBounds(true);

  // Ground (invisible, to stop falling)
  const ground = this.add.rectangle(320, 440, 640, 20, 0x000000, 0);
  this.physics.add.existing(ground, true);
  this.physics.add.collider(player, ground);
}

// ====== Update loop ======
function update(time, delta) {
  // Simulate forward motion
  background.tilePositionY -= 5;
  background.tilePositionX += 0.2;

  const action = (window.currentAction || "none").toLowerCase();

  // LEFT / RIGHT lane handling (edge-trigger + hold-repeat)
  if (action === "left" || action === "right") {
    const now = time;
    const isNewGesture = action !== lastGesture;
    const canRepeat = (now - lastMoveTime) >= MOVE_COOLDOWN;

    if (isNewGesture || canRepeat) {
      if (action === "left" && currentLane > 0) {
        currentLane--;
        moveToLane(this);
        lastMoveTime = now;
      } else if (action === "right" && currentLane < lanes.length - 1) {
        currentLane++;
        moveToLane(this);
        lastMoveTime = now;
      }
    }
  }

  // Jump — only when starting gesture and grounded
  if (action === "jump") {
    const isNewGesture = action !== lastGesture;
    if (isNewGesture && player.body.touching.down && !isJumping) {
      isJumping = true;
      player.setVelocityY(-500);
    }
  }

  // Duck — one-shot scaling
  if (action === "duck") {
    const isNewGesture = action !== lastGesture;
    if (isNewGesture && !isDucking) {
      isDucking = true;
      player.setScale(1, 0.5);
      setTimeout(() => {
        player.setScale(1, 1);
        isDucking = false;
      }, 700);
    }
  }

  // Reset jump when landed
  if (player.body.touching.down) {
    isJumping = false;
  }

  // Store gesture for next frame
  lastGesture = action;
}

// ====== Helper: Smooth lane movement ======
function moveToLane(scene) {
  scene.tweens.add({
    targets: player,
    x: lanes[currentLane],
    duration: 200,
    ease: "Power2"
  });
}
