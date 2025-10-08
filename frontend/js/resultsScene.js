/**
 * @class ResultsScene
 * @description This class represents the results/game-over screen.
 * It displays the final score to the player.
 */
class ResultsScene extends Phaser.Scene {
  constructor() {
    super({ key: 'ResultsScene' });
  }

  /**
   * @function preload
   * @description Loads all necessary assets for the results scene.
   */
  preload() {
    this.load.image('resultBackground', '/assets/sprites/environment/result.png');
    this.load.image('student', '/assets/sprites/player/player.png');
    this.load.image('scoreboard', '/assets/sprites/ui/scoreboard.png');
    // Load the new cheering sprite
    this.load.image('studentCheer', '/assets/sprites/player/cheer.png'); 
  }

  /**
   * @function create
   * @description Initializes game objects and displays the final score.
   */
  create() {
    const { width, height } = this.scale;
    const centerX = width / 2;
    const centerY = height / 2;

    // Add the background image
    const bg = this.add.image(centerX, centerY, 'resultBackground');
    // Scale the background to fit the screen
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    const scale = Math.max(scaleX, scaleY);
    bg.setScale(scale).setScrollFactor(0);

    // Add a semi-transparent overlay to dim the background
    this.add.rectangle(centerX, centerY, width, height, 0x000000, 0.5);

    // --- Student Cheering Animation ---

    // 1. Create the animation by defining the frames and their properties
    this.anims.create({
        key: 'cheer_animation',
        frames: [
            { key: 'student' },
            { key: 'studentCheer' }
        ],
        frameRate: 2, // Flips between the two images twice per second
        repeat: -1 // Loop forever
    });
    
    // 2. Add the student sprite and play the animation
    const student = this.add.sprite(width * 0.20, height * 0.75, 'student').setScale(1);
    student.play('cheer_animation');


    // Get the score from the URL parameter
    const urlParams = new URLSearchParams(window.location.search);
    const score = urlParams.get('score') || 0;

    // --- Scoreboard and Text Animation ---

    // 1. Create a container to hold both the scoreboard and text
    const container = this.add.container(centerX, centerY - 10);

    // 2. Create the scoreboard and text and add them to the container.
    // Their positions are now relative to the container's center (0,0).
    const scoreboard = this.add.image(0, 0, 'scoreboard')
      .setOrigin(0.5, 0.45) // This now sets the pivot for the entire container
      .setScale(0.7);
      
    const scoreText = this.add.text(0, 85, `SCORE\n${score}`, {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '50px',
      color: '#402c1b',
      align: 'center',
      lineSpacing: 15
    }).setOrigin(0.5);

    // Add the game objects to the container
    container.add([scoreboard, scoreText]);

    // 3. Start the continuous dangling animation on the container itself
    this.tweens.add({
      targets: container, // Animate the container, not the individual parts
      angle: 5, // Swing to 3 degrees
      ease: 'Sine.easeInOut',
      duration: 1800,
      delay: 100, // A brief delay before starting the swing
      yoyo: true, // Swing back and forth
      repeat: -1 // Loop forever
    });


    // Add the congratulatory message and prepare it for animation
    const congratsText = this.add.text(centerX, height * 0.2, 'CONGRATULATIONS!', {
      fontFamily: "'Press Start 2P', monospace",
      fontSize: '48px',
      color: '#ffbf00',
      stroke: '#000000',
      strokeThickness: 8
    }).setOrigin(0.5).setScale(0); // Start with a scale of 0 to be invisible

    // Add a pop-in tween for the congratulatory message
    this.tweens.add({
        targets: congratsText,
        scale: 1,
        ease: 'Back.easeOut',
        duration: 800,
        delay: 600 // Delay to appear after the scoreboard
    });

    // Add a "Play Again" text button
    const playAgainText = this.add.text(centerX, height - 100, 'Click to Play Again', {
        fontFamily: "'Press Start 2P', monospace",
        fontSize: '24px',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 6
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    // Make the "Play Again" button interactive
    playAgainText.on('pointerdown', () => {
        // Add a click animation before navigating
        this.tweens.add({
            targets: playAgainText,
            scale: 0.9, // Briefly shrink the text
            ease: 'Sine.easeInOut',
            duration: 100,
            yoyo: true, // Scale it back up
            onComplete: () => {
                // Navigate to the next page after the animation is complete
                window.location.href = '/upload';
            }
        });
    });

    // Add hover effects for the "Play Again" button
    playAgainText.on('pointerover', () => {
        this.tweens.add({
            targets: playAgainText,
            scale: 1.1,
            duration: 200,
            ease: 'Sine.easeInOut'
        });
    });

    playAgainText.on('pointerout', () => {
        this.tweens.add({
            targets: playAgainText,
            scale: 1,
            duration: 200,
            ease: 'Sine.easeInOut'
        });
    });
  }
}

// Make the ResultsScene class available globally
window.ResultsScene = ResultsScene;

