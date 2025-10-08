window.addEventListener('load', () => {
  let scene;

  // Auto-detect page
  if (window.location.pathname.includes('/upload')) {
    scene = window.PdfUploadScene;
  } else {
    scene = window.StartScene;
  }

  const config = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: 1280,
      height: 720,
    },
    scene: [scene],
  };

  // Prevent multiple games
  if (!window._handquestGame) {
    window._handquestGame = new Phaser.Game(config);
  }
});
