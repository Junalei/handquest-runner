class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  preload() {
    // Add load error handling
    this.load.on('loaderror', (file) => {
      console.error('Error loading file:', file.src);
    });

    // environment layers
    this.load.image('corridor', '/assets/sprites/environment/corridor.png');
    this.load.image('walls', '/assets/sprites/environment/walls.png');
    this.load.image('ceiling', '/assets/sprites/environment/ceiling.png');
    this.load.image('tiles', '/assets/sprites/environment/tiles.png');

    // sprites
    this.load.image('student', '/assets/sprites/player/student.png');
    this.load.image('heart', '/assets/sprites/ui/heart.png');
    this.load.image('obstacle1', '/assets/sprites/obstacles/bag.png');
    this.load.image('obstacle2', '/assets/sprites/obstacles/books.png');
    this.load.image('obstacle3', '/assets/sprites/obstacles/cat.png');

    // extra UI art
    this.load.image('wood', '/assets/sprites/wood.png');
    this.load.image('signboard', '/assets/sprites/signboard.png');
  }

  create() {
    const { width, height } = this.scale;

    console.log('GameScene created. Canvas size:', width, 'x', height);

    // Check if physics is available
    if (!this.physics) {
      console.error('Physics system not initialized! Check main.js config.');
      return;
    }

    // --- BACKGROUND CONTAINER FOR EASIER MANAGEMENT ---
    this.bgContainer = this.add.container(0, 0).setDepth(0);

    // --- LAYER 1: FAR CORRIDOR (Subtle tilePosition for depth) ---
    this.farBg = this.add.tileSprite(width / 2, height / 2, width, height, 'corridor')
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(0);

    // --- LAYER 2: WALLS (Scale + Move Outward Animation) ---
    // Create multiple wall sprites for continuous loop
    this.wallsGroup = [];
    for (let i = 0; i < 3; i++) {
      const wall = this.add.sprite(width / 2, height / 2 - (i * height * 0.8), 'walls')
        .setOrigin(0.5)
        .setScale(0.5) // Start small (far away)
        .setAlpha(0.3 + (i * 0.35)) // Further = more transparent
        .setDepth(10);
      this.wallsGroup.push(wall);
    }

    // --- LAYER 3: CEILING (Scale + Move Up Animation) ---
    this.ceilingGroup = [];
    const ceilingHeight = height * 0.4;
    for (let i = 0; i < 3; i++) {
      const ceiling = this.add.sprite(width / 2, (ceilingHeight / 2) - (i * ceilingHeight * 0.6), 'ceiling')
        .setOrigin(0.5)
        .setScale(0.5)
        .setAlpha(0.3 + (i * 0.35))
        .setDepth(20);
      this.ceilingGroup.push(ceiling);
    }

    // --- LAYER 4: FLOOR TILES (Scale + Move Down Animation) ---
    this.tilesGroup = [];
    const floorHeight = height * 0.45;
    const floorY = height - (floorHeight / 2);
    for (let i = 0; i < 3; i++) {
      const tile = this.add.sprite(width / 2, floorY + (i * floorHeight * 0.6), 'tiles')
        .setOrigin(0.5)
        .setScale(0.5)
        .setAlpha(0.3 + (i * 0.35))
        .setDepth(30);
      this.tilesGroup.push(tile);
    }

    console.log('All background layers created with animation pools');

    // Optional dark overlay for depth
    this.overlay = this.add.rectangle(0, 0, width, height, 0x000000, 0.1)
      .setOrigin(0)
      .setDepth(5);

    // --- LANES SETUP (Subway Surfer style - 3 lanes) ---
    const centerX = width / 2;
    const laneOffset = Math.round(width * 0.18);
    this.lanes = [centerX - laneOffset, centerX, centerX + laneOffset];

    console.log('Lanes positioned at:', this.lanes);

    // --- PLAYER (STATIONARY - only moves left/right between lanes) ---
    this.physics.world.setBounds(0, 0, width, height);
    
    // Player stays at fixed Y position (like Subway Surfer)
    const playerY = height * 0.72;
    
    this.player = this.physics.add.sprite(this.lanes[1], playerY, 'student')
      .setOrigin(0.5, 1) // Anchor at bottom center for better ground contact
      .setScale(1.0)
      .setDepth(40);
    
    this.player.body.setAllowGravity(false);
    this.player.setCollideWorldBounds(true);
    this.currentLane = 1; // Start in middle lane
    this.targetLane = 1;
    this.isMoving = false;

    console.log('Player created at:', this.lanes[1], playerY);

    // Running animation - alternate leg movement
    this.tweens.add({
      targets: this.player,
      scaleX: 1.02,
      scaleY: 0.98,
      duration: 150,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // Subtle bob
    this.tweens.add({
      targets: this.player,
      y: playerY - 5,
      duration: 300,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });

    // --- UI: HEARTS (top-left) ---
    this.maxHearts = 3;
    this.hearts = [];
    for (let i = 0; i < this.maxHearts; i++) {
      const h = this.add.image(30 + i * 40, 30, 'heart')
        .setOrigin(0, 0)
        .setScale(0.8)
        .setScrollFactor(0)
        .setDepth(100);
      this.hearts.push(h);
    }
    this.lives = this.maxHearts;

    // --- SCORE (top-right) ---
    this.score = 0;
    this.scoreText = this.add.text(width - 30, 30, 'SCORE: 000', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '20px',
      color: '#ffbf00',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'right'
    }).setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // --- QUESTION TEXT (top-center) ---
    this.questionText = this.add.text(width / 2, 25, '', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '18px',
      color: '#ffffff',
      stroke: '#000000',
      strokeThickness: 4,
      align: 'center',
      wordWrap: { width: width * 0.85 }
    }).setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(100);

    // --- OBSTACLES GROUP ---
    this.obstacles = this.physics.add.group();
    this.physics.add.overlap(this.player, this.obstacles, this.handleCollision, null, this);

    // --- GAME SETTINGS ---
    this.questions = [
      { question: "What is the capital of France?", choices: ["Paris","Rome","London"], answer: 0 },
      { question: "2 + 2 = ?", choices: ["3","4","5"], answer: 1 },
      { question: "Color of the sky?", choices: ["Green","Blue","Red"], answer: 1 },
      { question: "Python is a ___?", choices: ["Snake","Language","Food"], answer: 1 },
      { question: "HTML stands for?", choices: ["Markup","Code","Style"], answer: 0 },
      { question: "Ocean or Sea?", choices: ["Desert","Water","Mountain"], answer: 1 },
      { question: "Sun rises in?", choices: ["East","West","North"], answer: 0 },
    ];
    
    this.questionIndex = 0;
    this.baseScrollSpeed = 1.0; // Base speed multiplier
    this.currentScrollSpeed = this.baseScrollSpeed;
    this.spawnDelay = 3000;
    this.correctCount = 0;
    this.isPausedForQuestion = false;
    this.activeLabels = []; // Track all active choice labels

    // --- CONTROLS ---
    // Arrow keys
    this.input.keyboard.on('keydown-LEFT', () => this.moveToLane(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.moveToLane(1));
    
    // WASD keys
    this.input.keyboard.on('keydown-A', () => this.moveToLane(-1));
    this.input.keyboard.on('keydown-D', () => this.moveToLane(1));
    
    // Space for jump (optional feature)
    this.input.keyboard.on('keydown-SPACE', () => this.jumpPlayer());

    // Start first question after brief delay
    this.time.delayedCall(2000, () => {
      this.spawnMCQ();
    }, [], this);

    console.log('GameScene setup complete! Ready to run!');
  }

  update(time, delta) {
    const { width, height } = this.scale;

    // --- PARALLAX SCROLLING: Far background (subtle) ---
    if (this.farBg) {
      this.farBg.tilePositionY += 0.5 * this.currentScrollSpeed;
    }

    // --- PERSPECTIVE ANIMATION: WALLS (Zoom in + Move outward from center) ---
    this.wallsGroup.forEach((wall, index) => {
      // Move down (approaching player)
      wall.y += 2.5 * this.currentScrollSpeed;
      
      // Scale up (getting closer)
      wall.scaleX += 0.008 * this.currentScrollSpeed;
      wall.scaleY += 0.008 * this.currentScrollSpeed;
      
      // Fade in as it approaches
      wall.alpha = Math.min(1, wall.alpha + 0.006 * this.currentScrollSpeed);

      // When wall gets too close/large, reset it to back of queue
      if (wall.y > height * 1.2 || wall.scaleX > 2.5) {
        wall.y = height / 2 - (height * 1.5);
        wall.scaleX = 0.5;
        wall.scaleY = 0.5;
        wall.alpha = 0.3;
      }
    });

    // --- PERSPECTIVE ANIMATION: CEILING (Zoom in + Move upward) ---
    this.ceilingGroup.forEach((ceiling, index) => {
      // Move upward (passing overhead)
      ceiling.y -= 2.0 * this.currentScrollSpeed;
      
      // Scale up
      ceiling.scaleX += 0.01 * this.currentScrollSpeed;
      ceiling.scaleY += 0.01 * this.currentScrollSpeed;
      
      // Fade in
      ceiling.alpha = Math.min(1, ceiling.alpha + 0.007 * this.currentScrollSpeed);

      // Reset when it goes off top
      const ceilingHeight = height * 0.4;
      if (ceiling.y < -ceilingHeight || ceiling.scaleX > 2.5) {
        ceiling.y = (ceilingHeight / 2) + (ceilingHeight * 1.2);
        ceiling.scaleX = 0.5;
        ceiling.scaleY = 0.5;
        ceiling.alpha = 0.3;
      }
    });

    // --- PERSPECTIVE ANIMATION: FLOOR TILES (Zoom in + Move downward) ---
    this.tilesGroup.forEach((tile, index) => {
      // Move downward (passing below)
      tile.y += 3.0 * this.currentScrollSpeed;
      
      // Scale up (getting closer)
      tile.scaleX += 0.012 * this.currentScrollSpeed;
      tile.scaleY += 0.012 * this.currentScrollSpeed;
      
      // Fade in
      tile.alpha = Math.min(1, tile.alpha + 0.008 * this.currentScrollSpeed);

      // Reset when it goes off bottom
      const floorHeight = height * 0.45;
      const floorY = height - (floorHeight / 2);
      if (tile.y > height + floorHeight || tile.scaleX > 2.5) {
        tile.y = floorY - (floorHeight * 1.2);
        tile.scaleX = 0.5;
        tile.scaleY = 0.5;
        tile.alpha = 0.3;
      }
    });

    // --- SMOOTH LANE SWITCHING ---
    if (this.player) {
      const targetX = this.lanes[this.currentLane];
      const diff = targetX - this.player.x;
      
      if (Math.abs(diff) > 1) {
        // Smooth interpolation
        this.player.x += diff * 0.15;
        this.isMoving = true;
      } else {
        this.player.x = targetX;
        this.isMoving = false;
      }
    }

    // --- UPDATE CHOICE LABELS TO FOLLOW OBSTACLES ---
    this.activeLabels.forEach(labelData => {
      if (labelData.obstacle.active && labelData.label.active) {
        labelData.label.setPosition(labelData.obstacle.x, labelData.obstacle.y + 40);
      }
    });

    // Clean up inactive labels
    this.activeLabels = this.activeLabels.filter(labelData => 
      labelData.obstacle.active && labelData.label.active
    );
  }

  moveToLane(direction) {
    if (this.isPausedForQuestion) return;
    
    const newLane = this.currentLane + direction;
    
    // Clamp to valid lanes (0, 1, 2)
    if (newLane >= 0 && newLane < this.lanes.length) {
      this.currentLane = newLane;
      
      // Quick tilt animation for feedback
      this.tweens.add({
        targets: this.player,
        angle: direction * 8,
        duration: 120,
        yoyo: true,
        ease: 'Quad.easeOut'
      });
      
      console.log('Moving to lane:', this.currentLane);
    }
  }

  jumpPlayer() {
    if (this.isPausedForQuestion || this.player.isJumping) return;
    
    this.player.isJumping = true;
    const originalY = this.player.y;
    
    // Squash and stretch for jump
    this.tweens.add({
      targets: this.player,
      scaleY: 1.15,
      scaleX: 0.9,
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.tweens.add({
      targets: this.player,
      y: originalY - 120,
      duration: 350,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => {
        this.player.isJumping = false;
      }
    });
  }

  spawnMCQ() {
    if (this.lives <= 0) return;

    console.log('Spawning new MCQ...');

    // Get current question
    const q = this.questions[this.questionIndex % this.questions.length];
    this.questionText.setText(q.question);

    // Slow down background scroll for question
    this.tweens.add({
      targets: this,
      currentScrollSpeed: this.baseScrollSpeed * 0.6,
      duration: 800,
      ease: 'Quad.easeOut'
    });

    // Clear previous obstacles and labels
    this.obstacles.clear(true, true);
    this.activeLabels.forEach(labelData => {
      if (labelData.label) labelData.label.destroy();
    });
    this.activeLabels = [];

    // Spawn position (off-screen top)
    const spawnY = -100;
    const obstacleSpeed = 180 + (this.correctCount * 15); // Gradually increase speed

    // Spawn 3 obstacles (one per lane) with choices
    for (let i = 0; i < 3; i++) {
      const spriteKey = ['obstacle1', 'obstacle2', 'obstacle3'][i % 3];
      const x = this.lanes[i];
      
      // Create obstacle
      const obstacle = this.physics.add.sprite(x, spawnY, spriteKey)
        .setOrigin(0.5)
        .setScale(0.95)
        .setDepth(45);

      obstacle.body.setVelocityY(obstacleSpeed);
      obstacle.choiceIndex = i;
      obstacle.correct = (i === q.answer);
      obstacle.questionId = this.questionIndex;

      // Create choice label that follows obstacle
      const label = this.add.text(x, spawnY + 40, q.choices[i], {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '15px',
        color: '#1a1a1a',
        backgroundColor: '#ffd700',
        padding: { left: 8, right: 8, top: 4, bottom: 4 },
        stroke: '#000000',
        strokeThickness: 2
      }).setOrigin(0.5)
        .setDepth(50)
        .setScrollFactor(0);

      // Store label reference
      this.activeLabels.push({ obstacle, label });

      // Pop-in animation
      obstacle.setScale(0.5);
      obstacle.setAlpha(0);
      this.tweens.add({
        targets: obstacle,
        scale: 0.95,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut'
      });

      this.obstacles.add(obstacle);
    }

    // Auto-advance after timeout if not answered
    this.time.delayedCall(4500, () => {
      // Clean up any remaining obstacles from this question
      this.obstacles.getChildren().forEach(obs => {
        if (obs.questionId === this.questionIndex) {
          // Find and destroy label
          const labelData = this.activeLabels.find(ld => ld.obstacle === obs);
          if (labelData && labelData.label) {
            labelData.label.destroy();
          }
          obs.destroy();
        }
      });

      // Speed up scrolling again
      this.tweens.add({
        targets: this,
        currentScrollSpeed: Math.min(this.baseScrollSpeed + (this.correctCount * 0.15), 2.5),
        duration: 600
      });

      // Next question
      this.questionIndex++;
      this.time.delayedCall(1500, () => {
        if (this.lives > 0) this.spawnMCQ();
      });
    });
  }

  handleCollision(player, obstacle) {
    if (!obstacle || obstacle._handled) return;
    obstacle._handled = true;

    console.log('Collision! Choice:', obstacle.choiceIndex, 'Correct:', obstacle.correct);

    // Find and remove label
    const labelData = this.activeLabels.find(ld => ld.obstacle === obs);
    if (labelData && labelData.label) {
      labelData.label.destroy();
    }

    if (obstacle.correct) {
      this.onCorrectAnswer(obstacle);
    } else {
      this.onWrongAnswer(obstacle);
    }

    obstacle.destroy();
  }

  onCorrectAnswer(obstacle) {
    this.score += 100;
    this.correctCount++;
    this.scoreText.setText('SCORE: ' + String(this.score).padStart(3, '0'));

    console.log('✓ Correct! Score:', this.score);

    // Visual feedback
    this.cameras.main.flash(150, 0, 255, 0, false, 0.3);
    
    // Obstacle explosion effect
    this.tweens.add({
      targets: obstacle,
      scale: 1.8,
      alpha: 0,
      angle: 360,
      duration: 400,
      ease: 'Power2'
    });

    // Increase difficulty
    this.baseScrollSpeed = Math.min(1.8, this.baseScrollSpeed + 0.1);

    // Clear all obstacles from current question
    this.obstacles.getChildren().forEach(obs => {
      if (obs.questionId === obstacle.questionId && obs !== obstacle) {
        const labelData = this.activeLabels.find(ld => ld.obstacle === obs);
        if (labelData && labelData.label) {
          labelData.label.destroy();
        }
        obs.destroy();
      }
    });

    // Speed up scroll
    this.tweens.add({
      targets: this,
      currentScrollSpeed: this.baseScrollSpeed,
      duration: 500
    });

    // Next question
    this.questionIndex++;
    this.time.delayedCall(1000, () => {
      if (this.lives > 0) this.spawnMCQ();
    });
  }

  onWrongAnswer(obstacle) {
    this.lives = Math.max(0, this.lives - 1);
    const lostHeart = this.hearts.pop();
    if (lostHeart) {
      this.tweens.add({
        targets: lostHeart,
        scale: 0,
        angle: 180,
        duration: 300,
        onComplete: () => lostHeart.destroy()
      });
    }

    console.log('✗ Wrong! Lives remaining:', this.lives);

    // Negative feedback
    this.cameras.main.shake(250, 0.008);
    this.cameras.main.flash(150, 255, 0, 0, false, 0.4);

    // Obstacle shake
    this.tweens.add({
      targets: obstacle,
      angle: '+=360',
      scale: 0.5,
      alpha: 0,
      duration: 400,
      ease: 'Power2'
    });

    // Check game over
    if (this.lives <= 0) {
      this.gameOver();
      return;
    }

    // Continue with next question
    this.questionIndex++;
    this.time.delayedCall(1000, () => {
      if (this.lives > 0) this.spawnMCQ();
    });
  }

  gameOver() {
    console.log('GAME OVER! Final Score:', this.score);
    
    this.isPausedForQuestion = true;
    
    // Stop scrolling
    this.tweens.add({
      targets: this,
      currentScrollSpeed: 0,
      duration: 1000
    });

    // Fade out
    this.cameras.main.fadeOut(1500, 0, 0, 0);
    
    this.time.delayedCall(1500, () => {
      // Redirect to results page
      window.location.href = '/results.html?score=' + this.score;
    });
  }
}

window.GameScene = GameScene;