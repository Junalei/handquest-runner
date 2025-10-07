// Initialize Phaser game and start the StartScene

window.addEventListener('load', () => {
  const config = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 1280,
    height: 720,
    pixelArt: true, // keep pixelated look
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH
    },
    scene: [ window.StartScene ] // StartScene defined in startScene.js
  };

  // Prevent multiple games from being created during hot reloads
  if (!window._handquestGame) {
    window._handquestGame = new Phaser.Game(config);
  }
});
