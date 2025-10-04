// Testing lang ng UI, kumukuha lang sya ng most frequent na words sa PDF para gawing MCQs




// ====== Load questions from localStorage ======
let questions = [];
try {
  const stored = localStorage.getItem('handquest_questions');
  if (stored) {
    questions = JSON.parse(stored);
    console.log(`✅ Loaded ${questions.length} questions from localStorage`);
  } else {
    console.warn('⚠️ No questions found in localStorage');
    // Fallback demo  
    questions = [
      { question: "No Questions", choices: ["NA", "NA", "NA"], correctIndex: 1 },
      { question: "No Questions", choices: ["Berlin", "Paris", "Madrid"], correctIndex: 1 },
      { question: "No Questions", choices: ["15", "12", "18"], correctIndex: 0 }
    ];
  }
} catch (err) {
  console.error('Error loading questions:', err);
  questions = [{ question: "Error", choices: ["A", "B", "C"], correctIndex: 1 }];
}

// ====== Phaser 3 Game Configuration ======
const config = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: 'phaser-game',
  backgroundColor: '#87CEEB',
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { y: 0 },
      debug: false
    }
  },
  scene: {
    preload: preload,
    create: create,
    update: update
  }
};


async function fetchAndStoreQuestions() {
  try {
    // Replace with your backend API URL and any necessary headers/body
    const response = await fetch('http://localhost:8000/generate', {
      method: 'POST',
      body: yourPdfFileOrFormData, // You must handle file upload accordingly here
    });

    if (!response.ok) {
      console.warn('Failed to fetch questions from backend, using fallback.');
      return;
    }

    const data = await response.json();

    if (data.questions && data.questions.length > 0) {
      localStorage.setItem('handquest_questions', JSON.stringify(data.questions));
      console.log(`✅ Saved ${data.questions.length} questions to localStorage`);
    } else {
      console.warn('No questions returned from backend, using fallback.');
    }
  } catch (error) {
    console.error('Error fetching questions:', error);
  }
}

// Start the game after attempting to fetch questions
fetchAndStoreQuestions().then(() => {
const game = new Phaser.Game(config);
});




// ====== Global Game Variables ======
let player;
let cursors;
let lives = 3;
let score = 0;
let currentQuestionIndex = 0;
let livesText, scoreText, questionText;
let obstacles = [];
let lastActionTime = 0;
let gameSpeed = 2;
let obstacleTimer = 0;
let isGameOver = false;
let roadLines = [];
let groundGraphics;

// Lane configuration (3 lanes like Subway Surfer)
const LANES = {
  LEFT: 0,
  CENTER: 1,
  RIGHT: 2,
  positions: [280, 400, 520] // x positions on screen
};

// ====== Preload Assets ======
function preload() {
  // Using simple shapes, no assets needed
}

// ====== Create Game Scene ======
function create() {
  // Create perspective ground with graphics
  groundGraphics = this.add.graphics();
  drawPerspectiveRoad(groundGraphics);
  
  // Create animated road lines
  for (let i = 0; i < 8; i++) {
    const line = this.add.rectangle(400, 100 + i * 80, 10, 50, 0xFFFFFF);
    line.depth = -i; // Further lines appear smaller
    roadLines.push(line);
  }
  
  // Create player (red car with perspective)
  player = this.add.container(LANES.positions[LANES.CENTER], 480);
  
  // Car body (looks like it's going away from you)
  const carBody = this.add.rectangle(0, 0, 60, 80, 0xFF4444);
  const carTop = this.add.rectangle(0, -20, 50, 30, 0xCC2222);
  const carWindow = this.add.rectangle(0, -20, 35, 20, 0x4444FF, 0.5);
  
  player.add([carBody, carTop, carWindow]);
  player.currentLane = LANES.CENTER;
  player.targetX = LANES.positions[LANES.CENTER];
  
  // HUD with heart emoji
  livesText = this.add.text(16, 16, '❤️'.repeat(lives), { 
    fontSize: '32px', 
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 4
  });
  
  scoreText = this.add.text(650, 16, 'Score: ' + score, { 
    fontSize: '28px', 
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 4
  });
  
  // Question text at top center
  questionText = this.add.text(400, 80, '', { 
    fontSize: '32px', 
    fill: '#FFD700',
    stroke: '#000',
    strokeThickness: 6,
    align: 'center',
    fontStyle: 'bold',
    wordWrap: { width: 700 }
  }).setOrigin(0.5);
  
  // Keyboard controls (backup)
  cursors = this.input.keyboard.createCursorKeys();
  
  console.log('🎮 Subway Surfer style game created!');
  console.log('👋 Use hand gestures: ☝️ Left, ✌️ Right');
}

// ====== Draw Perspective Road ======
function drawPerspectiveRoad(graphics) {
  graphics.clear();
  
  // Sky
  graphics.fillStyle(0x87CEEB, 1);
  graphics.fillRect(0, 0, 800, 300);
  
  // Ground (perspective - wider at bottom)
  graphics.fillStyle(0x666666, 1);
  graphics.beginPath();
  graphics.moveTo(200, 300); // top left
  graphics.lineTo(600, 300); // top right
  graphics.lineTo(800, 600); // bottom right
  graphics.lineTo(0, 600);   // bottom left
  graphics.closePath();
  graphics.fillPath();
  
  // Road sides (brown dirt)
  graphics.fillStyle(0x8B4513, 1);
  // Left side
  graphics.fillTriangle(0, 300, 200, 300, 0, 600);
  // Right side
  graphics.fillTriangle(800, 300, 600, 300, 800, 600);
  
  // Lane dividers (white dashed lines)
  graphics.lineStyle(3, 0xFFFFFF, 1);
  // Left lane divider
  graphics.beginPath();
  graphics.moveTo(300, 300);
  graphics.lineTo(250, 600);
  graphics.strokePath();
  // Right lane divider
  graphics.beginPath();
  graphics.moveTo(500, 300);
  graphics.lineTo(550, 600);
  graphics.strokePath();
}

// ====== Update Loop ======
function update(time, delta) {
  if (isGameOver) return;
  
  // Animate road lines (moving toward player)
  roadLines.forEach((line, i) => {
    line.y += gameSpeed * 2;
    
    // Make lines bigger as they get closer (perspective)
    const scale = 0.5 + (line.y / 600) * 0.5;
    line.displayWidth = 10 * scale;
    line.displayHeight = 50 * scale;
    
    // Reset when line goes off screen
    if (line.y > 650) {
      line.y = 50;
    }
  });
  
  // Handle input
  handleHandInput();
  handleKeyboardInput();
  
  // Smooth lane switching
  player.x += (player.targetX - player.x) * 0.15;
  
  // Spawn obstacles
  obstacleTimer += delta;
  if (obstacleTimer > 4000) { // Every 4 seconds
    spawnQuestion(this);
    obstacleTimer = 0;
  }
  
  // Move obstacles toward player (perspective effect)
  obstacles = obstacles.filter(obs => {
    obs.container.y += gameSpeed * 2;
    
    // Scale obstacles as they approach (perspective)
    const scale = 0.3 + (obs.container.y / 600) * 0.7;
    obs.container.setScale(scale);
    
    // Check collision when obstacle reaches player
    if (obs.container.y > 450 && obs.container.y < 500 && !obs.hit) {
      const playerLane = player.currentLane;
      if (obs.lane === playerLane) {
        hitObstacle(obs);
        obs.hit = true;
      }
    }
    
    // Remove off-screen obstacles
    if (obs.container.y > 650) {
      obs.container.destroy();
      return false;
    }
    
    return true;
  });
  
  // Gradually increase difficulty
  gameSpeed = Math.min(gameSpeed + 0.0005, 5);
}

// ====== Handle Hand Tracking Input ======
function handleHandInput() {
  const action = window.currentAction;
  const now = Date.now();
  
  if (now - lastActionTime < 300) return;
  
  if (action === 'left' && player.currentLane > LANES.LEFT) {
    player.currentLane--;
    player.targetX = LANES.positions[player.currentLane];
    lastActionTime = now;
    console.log('👈 Moving LEFT to lane', player.currentLane);
  } else if (action === 'right' && player.currentLane < LANES.RIGHT) {
    player.currentLane++;
    player.targetX = LANES.positions[player.currentLane];
    lastActionTime = now;
    console.log('👉 Moving RIGHT to lane', player.currentLane);
  }
}

// ====== Handle Keyboard Input ======
function handleKeyboardInput() {
  const now = Date.now();
  if (now - lastActionTime < 200) return;
  
  if (cursors.left.isDown && player.currentLane > LANES.LEFT) {
    player.currentLane--;
    player.targetX = LANES.positions[player.currentLane];
    lastActionTime = now;
  } else if (cursors.right.isDown && player.currentLane < LANES.RIGHT) {
    player.currentLane++;
    player.targetX = LANES.positions[player.currentLane];
    lastActionTime = now;
  }
}

// ====== Spawn MCQ Question as Obstacles ======
function spawnQuestion(scene) {
  if (currentQuestionIndex >= questions.length) {
    endGame(scene, true);
    return;
  }
  
  const q = questions[currentQuestionIndex];
  currentQuestionIndex++;
  
  // Display question
  questionText.setText(truncateText(q.question, 50));
  
  // Spawn 3 obstacles (one per lane)
  for (let lane = 0; lane < 3; lane++) {
    const choice = q.choices[lane] || `Choice ${lane+1}`;
    const isCorrect = lane === q.correctIndex;
    
    // Create obstacle container
    const container = scene.add.container(LANES.positions[lane], 50);
    
    // Box color based on correctness
    const boxColor = isCorrect ? 0x44FF44 : 0xFF4444;
    const box = scene.add.rectangle(0, 0, 140, 100, boxColor);
    box.setStrokeStyle(6, 0x000000);
    
    // Choice text (truncated to fit)
    const text = scene.add.text(0, 0, truncateText(choice, 15), {
      fontSize: '22px',
      fill: '#000',
      fontStyle: 'bold',
      align: 'center',
      wordWrap: { width: 120 }
    }).setOrigin(0.5);
    
    container.add([box, text]);
    container.setScale(0.3); // Start small (far away)
    
    // Store obstacle data
    obstacles.push({
      container: container,
      lane: lane,
      isCorrect: isCorrect,
      hit: false
    });
  }
}

// ====== Truncate Text ======
function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - 3) + '...';
}

// ====== Handle Collision ======
function hitObstacle(obs) {
  if (obs.isCorrect) {
    score += 100;
    scoreText.setText('Score: ' + score);
    console.log('✅ Correct! +100 points');
    
    // Flash effect
    obs.container.list[0].setFillStyle(0xFFFF00);
    setTimeout(() => obs.container.destroy(), 200);
    
    // Clear question
    setTimeout(() => questionText.setText(''), 500);
  } else {
    lives--;
    livesText.setText('❤️'.repeat(Math.max(0, lives)));
    console.log('❌ Wrong! Lives:', lives);
    
    // Flash player
    player.list.forEach(part => {
      const originalColor = part.fillColor;
      part.setFillStyle(0xFFFFFF);
      setTimeout(() => part.setFillStyle(originalColor), 200);
    });
    
    if (lives <= 0) {
      endGame(this, false);
    }
  }
}

// ====== End Game ======
function endGame(scene, isWin) {
  isGameOver = true;
  
  // Darken screen
  const overlay = scene.add.rectangle(400, 300, 800, 600, 0x000000, 0.7);
  
  const message = isWin 
    ? `🎉 VICTORY!\n\nScore: ${score}\n\nAll questions answered correctly!`
    : `💔 GAME OVER\n\nScore: ${score}\n\nYou ran out of lives!`;
  
  const endText = scene.add.text(400, 250, message, {
    fontSize: '40px',
    fill: isWin ? '#FFD700' : '#FF4444',
    stroke: '#000',
    strokeThickness: 6,
    align: 'center',
    lineSpacing: 10
  }).setOrigin(0.5);
  
  // Restart button
  const restartBtn = scene.add.text(400, 450, '🔄 Click to Restart', {
    fontSize: '28px',
    fill: '#fff',
    backgroundColor: '#4444FF',
    padding: { x: 20, y: 10 },
    stroke: '#000',
    strokeThickness: 4
  }).setOrigin(0.5);
  
  restartBtn.setInteractive({ useHandCursor: true });
  restartBtn.on('pointerdown', () => location.reload());
  restartBtn.on('pointerover', () => restartBtn.setScale(1.1));
  restartBtn.on('pointerout', () => restartBtn.setScale(1));
  
  console.log(isWin ? '🏆 You won!' : '💀 Game over');
}

// ====== Initialize ======
console.log('🎮 Subway Surfer-style game initialized!');
console.log('📝 Questions loaded:', questions.length);
console.log('🎯 Move LEFT/RIGHT to hit green boxes (correct answers)');
console.log('❌ Avoid red boxes (wrong answers) or lose lives!');