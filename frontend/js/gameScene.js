/**
 * @class GameScene
 * @description This class represents the main game scene in a Phaser 3 game.
 * It handles player movement, obstacle spawning (both random and multiple-choice questions),
 * collision detection, UI updates (score, lives), and game state management.
 * The game is an endless runner with an educational twist, where the player
 * must dodge obstacles and answer questions to score points.
 */
class GameScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameScene' });
  }

  /**
   * @function preload
   * @description Loads all necessary assets for the game before it starts.
   */
  preload() {
    // Add load error handling
    this.load.on('loaderror', (file) => {
      console.error('Error loading file:', file.src);
    });

    // Static background
    this.load.image('background', '/assets/sprites/environment/background.png');

    // sprites
    this.load.image('student', '/assets/sprites/player/user.png');
    // Load the running animation frames
    this.load.image('student-run-1', '/assets/sprites/player/user-1.png');
    this.load.image('student-run-2', '/assets/sprites/player/user-2.png');
    this.load.image('student-run-3', '/assets/sprites/player/user-3.png');
    this.load.image('heart', '/assets/sprites/ui/heart.png');

    // Obstacle Sprites (10 total as requested)
    this.load.image('obstacle1', '/assets/sprites/obstacles/bag.png');
    this.load.image('obstacle2', '/assets/sprites/obstacles/books.png');
    this.load.image('obstacle3', '/assets/sprites/obstacles/cat.png');
    this.load.image('obstacle4', '/assets/sprites/obstacles/laptop.png');
    this.load.image('obstacle5', '/assets/sprites/obstacles/pen.png');
    this.load.image('obstacle6', '/assets/sprites/obstacles/chair.png');
    this.load.image('obstacle7', '/assets/sprites/obstacles/computer.png');
    this.load.image('obstacle8', '/assets/sprites/obstacles/cpu.png');
    this.load.image('obstacle9', '/assets/sprites/obstacles/girl.png');
    this.load.image('obstacle10', '/assets/sprites/obstacles/keyboard.png');

    // extra UI art
    this.load.image('wood', '/assets/sprites/ui/wood.png');
    this.load.image('signboard', '/assets/sprites/ui/signboard.png');
  }

  /**
   * @function create
   * @description Initializes game objects, sets up UI, controls, and timers.
   */
  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;

    console.log('GameScene created. Canvas size:', width, 'x', height);

    // Check if physics is available
    if (!this.physics) {
      console.error('Physics system not initialized! Check main.js config.');
      return;
    }

    // --- STATIC BACKGROUND ---
    this.background = this.add.image(centerX, height / 2, 'background')
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(0);

    // Scale background to cover entire canvas
    const scaleX = width / this.background.width;
    const scaleY = height / this.background.height;
    const scale = Math.max(scaleX, scaleY);
    this.background.setScale(scale);

    console.log('Static background loaded');

    // --- LANES SETUP (Subway Surfer style - 3 lanes) ---
    // FIX: Reduced lane offset from 0.20 to 0.18 to bring lanes closer.
    const laneOffset = Math.round(width * 0.18); 
    this.lanes = [centerX - laneOffset, centerX, centerX + laneOffset];

    console.log('Lanes positioned at:', this.lanes);

    // --- PLAYER ANIMATION ---
    // 1. Create the running animation
    this.anims.create({
        key: 'run_animation',
        frames: [
            { key: 'student' },
            { key: 'student-run-1' },
            { key: 'student-run-2' },
            { key: 'student-run-3' }
        ],
        frameRate: 8, // Adjust for a smooth running speed
        repeat: -1 // Loop forever
    });

    // --- PLAYER ---
    // 2. Create the player sprite and play the animation
    this.playerY = height * 0.80; // Player positioned lower
    this.player = this.add.sprite(this.lanes[1], this.playerY, 'student')
      .setOrigin(0.52, 0.40) 
      .setScale(0.7) // Player slightly smaller
      .setDepth(90);
    this.player.play('run_animation');

    this.currentLane = 1;
    this.isMoving = false;
    this.isJumping = false;
    // The vertical offset for collision detection, starting with the value for the center lane.
    this.collisionYOffset = 80;

    // --- UI ---
    this.maxHearts = 3;
    this.hearts = [];
    for (let i = 0; i < this.maxHearts; i++) {
        this.hearts.push(this.add.image(40 + i * 57, 35, 'heart').setOrigin(0.0).setScale(0.18).setScrollFactor(0).setDepth(200));
    }

    // Add continuous animation to the hearts
    this.hearts.forEach((heart, index) => {
      this.tweens.add({
        targets: heart,
        scale: 0.20, // Pulse to a slightly larger size
        ease: 'Sine.easeInOut',
        duration: 1000,
        yoyo: true,
        repeat: -1,
        delay: index * 250 // Stagger the animation for a more dynamic feel
      });
    });

    this.lives = this.maxHearts;
    this.score = 0;
    this.scoreText = this.add.text(width - 50, 45, 'SCORE: 000', { fontFamily: "'Press Start 2P', monospace", fontSize: '22px', color: '#ffbf00', stroke: '#000000', strokeThickness: 4, align: 'right' }).setOrigin(1, 0).setScrollFactor(0).setDepth(200);

    // Add continuous animation to the score text
    this.tweens.add({
      targets: this.scoreText,
      scale: 1.05, // Pulse to a slightly larger size
      ease: 'Sine.easeInOut',
      duration: 1200,
      yoyo: true,
      repeat: -1
    });

    // Add signboard for the question
    this.signboard = this.add.image(centerX, 130, 'signboard')
      .setOrigin(0.5)
      .setScale(0.9)
      .setDepth(199)
      .setVisible(false);
    
    this.questionText = this.add.text(this.signboard.x, this.signboard.y - 5, '', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '18px',
      color: '#402c1b',
      align: 'center',
      lineSpacing: 8 
    }).setOrigin(0.5).setScrollFactor(0).setDepth(200).setVisible(false);

    // --- OBSTACLES ---
    this.obstaclesArray = [];
    this.obstacleKeys = ['obstacle1', 'obstacle2', 'obstacle3', 'obstacle4', 'obstacle5', 'obstacle6', 'obstacle7', 'obstacle8', 'obstacle9', 'obstacle10'];

    // --- GAME SETTINGS ---
    this.questions = [
        { question: "What is the capital of France?", choices: ["Paris","Rome","London"], answer: 0 },
        { question: "2 + 2 = ?", choices: ["3","4","5"], answer: 1 },
        { question: "Color of the sky?", choices: ["Green","Blue","Red"], answer: 1 },
        { question: "Python is a ___?", choices: ["Snake","Language","Food"], answer: 1 },
        { question: "HTML stands for?", choices: ["Markup","Code","Style"], answer: 0 },
        { question: "An ocean is made of?", choices: ["Desert","Water","Mountain"], answer: 1 },
        { question: "The sun rises in the?", choices: ["East","West","North"], answer: 0 },
    ];

    this.questionIndex = 0;
    this.correctCount = 0;
    this.gameIsOver = false;
    this.questionIsActive = false;

    // Perspective settings - Define lane-specific spawn points
    const spawnYCenter = height * 0.55;
    const spawnYSides = height * 0.55;
    const spawnXOffset = width * 0.04;
    const spawnXOffsetSide = width * 0.02;

    this.spawnPoints = [
      { x: centerX - 60, y: spawnYSides }, // left lane
      { x: centerX - 10, y: spawnYCenter },           
      { x: centerX + spawnXOffsetSide, y: spawnYSides }   
    ];
    
    this.randomObstacleStartScale = 0.05;
    this.mcqStartScale = 0.08;              
    
    this.endY = height;
    
    // NEW: Separate speeds for different obstacle types
    this.randomObstacleSpeed = 3.0; // Base speed for random obstacles, will increase
    this.mcqSpeed = 1.8;            // Constant speed for MCQs

    // --- CONTROLS ---
    this.input.keyboard.on('keydown-LEFT', () => this.moveToLane(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this.moveToLane(1));
    this.input.keyboard.on('keydown-A', () => this.moveToLane(-1));
    this.input.keyboard.on('keydown-D', () => this.moveToLane(1));
    this.input.keyboard.on('keydown-SPACE', () => this.jumpPlayer());

    // --- TIMERS FOR SPAWNING ---
    this.randomObstacleTimer = this.time.addEvent({
      delay: 3500,
      callback: this.spawnRandomObstacle,
      callbackScope: this,
      loop: true
    });

    this.mcqTimer = this.time.addEvent({
      delay: 6500,
      callback: this.spawnMCQ,
      callbackScope: this,
      loop: true
    });

    console.log('GameScene setup complete! Ready to run!');
  }

  /**
   * @function update
   * @description Main game loop, called on every frame.
   * @param {number} time - The current time.
   * @param {number} delta - The delta time in ms since the last frame.
   */
  update(time, delta) {
    if (this.gameIsOver) return;
    const deltaSeconds = delta / 1000;

    // Player lane switching
    if (this.player && this.player.active && !this.isJumping) {
      const targetX = this.lanes[this.currentLane];
      const diff = targetX - this.player.x;
      if (Math.abs(diff) > 1) this.player.x += diff * 0.15;
      else this.player.x = targetX;
    }

    // Update all obstacles
    this.obstaclesArray = this.obstaclesArray.filter(obsData => {
      if (!obsData.sprite || !obsData.sprite.active) {
          return false;
      }

      if (obsData.handled) {
          return true;
      }
      
      // Use the correct speed based on the obstacle type
      const currentSpeed = obsData.type === 'random' ? this.randomObstacleSpeed : this.mcqSpeed;
      obsData.progress = Math.min(obsData.progress + currentSpeed * deltaSeconds * 0.1, 1.2);
      
      const newY = Phaser.Math.Linear(obsData.initialY, this.endY, obsData.progress);
      const newX = Phaser.Math.Linear(obsData.initialX, obsData.targetX, obsData.progress);
      const scale = Phaser.Math.Linear(obsData.startScale, obsData.endScale, obsData.progress);

      obsData.sprite.x = newX;
      obsData.sprite.y = newY;
      obsData.sprite.setScale(scale);
      obsData.sprite.setDepth(10 + Math.floor(newY / 10));
      
      // Use the dynamic collision offset
      if (newY > this.playerY - this.collisionYOffset) {
        this.checkCollision(obsData);
      }

      if (newY > this.endY + 50) {
        obsData.sprite.destroy();
        return false;
      }
      
      return true;
    });
  }
  
  /**
   * @function checkCollision
   * @description Checks for collision between the player and an obstacle.
   * @param {object} obsData - The obstacle data object.
   */
  checkCollision(obsData) {
    const tolerance = 40 * obsData.sprite.scaleX;
    if (Math.abs(obsData.sprite.x - this.player.x) < tolerance && !this.isJumping) {
      this.handleCollision(obsData);
    }
  }

  /**
   * @function moveToLane
   * @description Moves the player to the left or right lane.
   * @param {number} direction - -1 for left, 1 for right.
   */
  moveToLane(direction) {
    if (this.gameIsOver) return;
    const newLane = Phaser.Math.Clamp(this.currentLane + direction, 0, this.lanes.length - 1);
    
    if (newLane !== this.currentLane) {
      this.currentLane = newLane;
      
      // FIX: Calculate target angle for tilting effect.
      // Lane 0 (left) -> angle = 8 (slight right tilt)
      // Lane 1 (center) -> angle = 0 (upright)
      // Lane 2 (right) -> angle = -8 (slight left tilt)
      const targetAngle = (1 - newLane) * 8;

      // FIX: Set a higher collision offset for side lanes to account for perspective.
      this.collisionYOffset = (newLane === 1) ? 70 : 70; 
      
      // Animate the player's tilt smoothly.
      this.tweens.add({
        targets: this.player,
        angle: targetAngle,
        duration: 250,
        ease: 'Quad.easeOut'
      });
    }
  }

  /**
   * @function jumpPlayer
   * @description Makes the player perform a jump.
   */
  jumpPlayer() {
    if (this.gameIsOver || this.isJumping) return;
    this.isJumping = true;
    this.tweens.add({ targets: this.player, y: this.playerY - 120, duration: 350, yoyo: true, ease: 'Quad.easeOut', onComplete: () => { this.isJumping = false; this.player.y = this.playerY; } });
  }

  /**
   * @function spawnRandomObstacle
   * @description Spawns a random, non-question obstacle in one of the three lanes.
   */
  spawnRandomObstacle() {
    if (this.gameIsOver || this.questionIsActive) return;
    
    this.mcqTimer.paused = true;
    
    this.randomObstacleTimer.delay = Phaser.Math.Between(3200, 3500);

    const laneIndex = Phaser.Math.Between(0, 2);
    const spriteKey = Phaser.Math.RND.pick(this.obstacleKeys);
    const spawnPoint = this.spawnPoints[laneIndex];
    
    const obstacle = this.add.sprite(spawnPoint.x, spawnPoint.y, spriteKey)
      .setOrigin(0.5)
      .setScale(0)
      .setDepth(10);
      
    this.obstaclesArray.push({
      sprite: obstacle,
      type: 'random',
      initialX: spawnPoint.x,
      initialY: spawnPoint.y,
      targetX: this.lanes[laneIndex],
      startScale: this.randomObstacleStartScale, 
      endScale: 0.6,
      progress: 0,
      handled: false
    });

    this.time.delayedCall(2000, () => {
        if (!this.gameIsOver) {
            this.mcqTimer.paused = false;
        }
    });
  }

  /**
   * @function spawnMCQ
   * @description Spawns a set of multiple-choice question obstacles.
   */
  spawnMCQ() {
    if (this.gameIsOver) return;

    this.questionIsActive = true;
    this.randomObstacleTimer.paused = true;

    this.signboard.setVisible(true).setAlpha(0);
    this.questionText.setVisible(true).setAlpha(0);
    this.tweens.add({ targets: [this.signboard, this.questionText], alpha: 1, duration: 400 });

    const q = this.questions[this.questionIndex % this.questions.length];
    
    const formattedQuestion = this.formatQuestionText(q.question, 20);
    this.questionText.setText(formattedQuestion);

    for (let i = 0; i < 3; i++) {
      const laneX = this.lanes[i];
      const spawnPoint = this.spawnPoints[i];
      
      const woodBg = this.add.image(0, 0, 'wood').setOrigin(0.5).setScale(2);
      const choiceText = this.add.text(0, -50, q.choices[i], {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '45px',
        color: '#ffffff',
        stroke: '#402c1b',
        strokeThickness: 4,
        align: 'center'
      }).setOrigin(0.5);

      const choiceContainer = this.add.container(spawnPoint.x, spawnPoint.y, [woodBg, choiceText]);
      choiceContainer.setSize(woodBg.displayWidth, woodBg.displayHeight);
      choiceContainer.setScale(0).setDepth(11);

      this.obstaclesArray.push({
        sprite: choiceContainer,
        type: 'choice',
        initialX: spawnPoint.x,
        initialY: spawnPoint.y,
        targetX: laneX,
        startScale: this.mcqStartScale, 
        endScale: 0.8,
        choiceIndex: i,
        correct: (i === q.answer),
        questionId: this.questionIndex,
        progress: 0,
        handled: false
      });
    }

    this.questionIndex++;
  }
  
  /**
   * @function formatQuestionText
   * @description Formats a string to have line breaks at a specific character length.
   * @param {string} text - The text to format.
   * @param {number} maxLength - The maximum length of a line.
   * @returns {string} The formatted text with newlines.
   */
  formatQuestionText(text, maxLength) {
    const words = text.split(' ');
    let lines = [];
    let currentLine = '';

    words.forEach(word => {
        if ((currentLine + word).length > maxLength) {
            lines.push(currentLine.trim());
            currentLine = '';
        }
        currentLine += word + ' ';
    });

    lines.push(currentLine.trim());
    return lines.join('\n');
  }

  /**
   * @function handleCollision
   * @description Central handler for any collision event.
   * @param {object} obsData - The obstacle data object.
   */
  handleCollision(obsData) {
    if (obsData.handled) return;

    if (obsData.type === 'choice') {
        this.obstaclesArray.forEach(obs => {
            if (obs.type === 'choice' && obs.questionId === obsData.questionId) {
                obs.handled = true;
            }
        });

        if (obsData.correct) {
            this.onCorrectAnswer(obsData);
        } else {
            this.onWrongAnswer(obsData);
        }
    } else if (obsData.type === 'random') {
        obsData.handled = true;
        this.onHitRandomObstacle(obsData);
    }
  }
  
  /**
   * @function onHitRandomObstacle
   * @description Logic for when the player hits a random obstacle.
   * @param {object} obsData - The obstacle data object.
   */
  onHitRandomObstacle(obsData) {
    this.loseLife();
    this.cameras.main.shake(250, 0.008);
    this.tweens.add({ targets: obsData.sprite, scale: 0, alpha: 0, angle: 360, duration: 300, onComplete: () => { 
        if (obsData.sprite && obsData.sprite.active) obsData.sprite.destroy(); 
    }});
  }

  /**
   * @function onCorrectAnswer
   * @description Logic for when the player chooses the correct answer.
   * @param {object} obsData - The obstacle data object.
   */
  onCorrectAnswer(obsData) {
    this.score += 100;
    this.correctCount++;
    this.scoreText.setText('SCORE: ' + String(this.score).padStart(3, '0'));
    
    // Speed for random obstacles increases with correct answers, up to a max cap.
    this.randomObstacleSpeed = Math.min(this.randomObstacleSpeed + 1, 8.0); 

    this.clearChoiceObstacles(obsData.questionId);
  }

  /**
   * @function onWrongAnswer
   * @description Logic for when the player chooses the wrong answer.
   * @param {object} obsData - The obstacle data object.
   */
  onWrongAnswer(obsData) {
    this.loseLife();
    this.cameras.main.shake(250, 0.008);
    this.clearChoiceObstacles(obsData.questionId);
  }
  
  /**
   * @function loseLife
   * @description Decrements player lives and updates the UI.
   */
  loseLife() {
    if (this.gameIsOver) return;
    this.lives = Math.max(0, this.lives - 1);
    const lostHeart = this.hearts.pop();
    if (lostHeart) {
      this.tweens.add({ targets: lostHeart, scale: 0, angle: 180, duration: 300, onComplete: () => lostHeart.destroy() });
    }
    console.log('Life lost! Lives remaining:', this.lives);
    if (this.lives <= 0) {
      this.gameOver();
    }
  }

  /**
   * @function clearChoiceObstacles
   * @description Removes all MCQ obstacles related to a specific question.
   * @param {number} questionId - The ID of the question to clear.
   */
  clearChoiceObstacles(questionId) {
    // Hide the signboard and question text
    this.tweens.add({
        targets: [this.signboard, this.questionText],
        alpha: 0,
        duration: 200,
        onComplete: () => {
            this.questionText.setText('');
            this.signboard.setVisible(false);
            this.questionText.setVisible(false);
        }
    });

    this.obstaclesArray.forEach(obs => {
      if (obs.type === 'choice' && obs.questionId === questionId) {
        // Since all choices are 'handled', the update loop will ignore them.
        // We can now safely destroy them without causing a crash.
        if (obs.sprite && obs.sprite.active) {
            obs.sprite.destroy();
        }
      }
    });

    // Reset the question flag and resume the random obstacle timer
    this.questionIsActive = false;
    this.time.delayedCall(1000, () => {
        if (!this.gameIsOver) {
            this.randomObstacleTimer.paused = false;
        }
    });
  }

  /**
   * @function gameOver
   * @description Ends the game and redirects to the results page.
   */
  gameOver() {
    console.log('GAME OVER! Final Score:', this.score);
    this.gameIsOver = true;
    
    if (this.randomObstacleTimer) this.randomObstacleTimer.destroy();
    if (this.mcqTimer) this.mcqTimer.destroy();

    this.cameras.main.fadeOut(1500, 0, 0, 0);
    this.time.delayedCall(1500, () => {
      window.location.href = '/results?score=' + this.score;
    });
  }
}

window.GameScene = GameScene;