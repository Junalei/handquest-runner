// frontend/js/pdfUpload.js
class PdfUploadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PdfUploadScene' });
  }

  preload() {
    this.load.image('lockers', '/assets/sprites/environment/lockers.png'); // background
    this.load.image('student', '/assets/sprites/player/student.png'); // bottom-left
    this.load.image('uploadBox', '/assets/sprites/ui/upload.png'); // drag/drop area visual
    this.load.image('pdfIcon', '/assets/sprites/ui/pdf.png'); // clickable upload button
  }

  create() {
    const { width, height } = this.scale;

    // --- Background ---
    const bg = this.add.image(0, 0, 'lockers').setOrigin(0, 0);
    const scaleX = width / bg.width;
    const scaleY = height / bg.height;
    bg.setScale(Math.max(scaleX, scaleY)).setScrollFactor(0);

    // --- Student ---
    const student = this.add.image(width * 0.13, height * 0.78, 'student')
      .setOrigin(0.5)
      .setScale(0.8);

    // --- Upload area (drag/drop) - visual only ---
    const uploadZone = this.add.image(width / 2, height * 0.45, 'uploadBox')
      .setOrigin(0.5)
      .setScale(0.9)
      .setAlpha(0.98);

    // 🌊 Floating animation (gentle up/down motion)
    this.tweens.add({
      targets: uploadZone,
      y: uploadZone.y - 10,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- PDF Button (clickable) ---
    const pdfButton = this.add.image(width * 0.88, height * 0.73, 'pdfIcon')
      .setOrigin(0.5)
      .setScale(0.9)
      .setAngle(8)
      .setInteractive({ useHandCursor: true });

    const basePdfScale = pdfButton.scale;

    pdfButton.on('pointerover', () => {
      this.tweens.killTweensOf(pdfButton);
      this.tweens.add({
        targets: pdfButton,
        scaleX: basePdfScale * 1.12,
        scaleY: basePdfScale * 1.12,
        duration: 180,
        ease: 'Power2',
      });
    });

    pdfButton.on('pointerout', () => {
      this.tweens.killTweensOf(pdfButton);
      this.tweens.add({
        targets: pdfButton,
        scaleX: basePdfScale,
        scaleY: basePdfScale,
        duration: 180,
        ease: 'Power2',
      });
    });

    // Small press animation and open file dialog
    pdfButton.on('pointerdown', () => {
      this.tweens.add({
        targets: pdfButton,
        scaleX: basePdfScale * 0.9,
        scaleY: basePdfScale * 0.9,
        duration: 100,
        yoyo: true,
        ease: 'Power1',
      });
      openFileDialog();
    });

    // --- Shared upload handler ---
    const handleFileUpload = (file) => {
      if (!file) return;

      // Accept PDFs by MIME or extension fallback
      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPdf) {
        // brief red flash to indicate wrong file
        pdfButton.setTint(0xff9999);
        uploadZone.setTint(0xff9999);
        setTimeout(() => {
          pdfButton.clearTint();
          uploadZone.clearTint();
        }, 600);
        return;
      }

      // Visual success animation:
      uploadZone.setTint(0x99ff99);
      this.tweens.add({
        targets: pdfButton,
        scaleX: basePdfScale * 1.15,
        scaleY: basePdfScale * 1.15,
        duration: 180,
        yoyo: true,
        ease: 'Cubic.easeOut',
      });

      // Simulated upload delay (replace with real upload call later)
      setTimeout(() => {
        uploadZone.clearTint();
        pdfButton.clearTint();
        window.location.href = '/game.html';
      }, 900);
    };

    // --- DOM file input flow used by clicking PDF button ---
    const openFileDialog = () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf';
      input.style.display = 'none';

      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        handleFileUpload(file);
      };

      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    };

    // Keyboard shortcut: Enter triggers file dialog
    this.input.keyboard.on('keydown-ENTER', openFileDialog);

    // --- Drag & drop handling ---
    const canvas = this.sys.game.canvas;
    let isOverUploadZone = false;

    const toGameCoords = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.scale.width / rect.width;
      const scaleY = this.scale.height / rect.height;
      const gx = (clientX - rect.left) * scaleX;
      const gy = (clientY - rect.top) * scaleY;
      return { gx, gy };
    };

    const onDragOver = (e) => {
      e.preventDefault();
      if (!e.dataTransfer) return;
      e.dataTransfer.dropEffect = 'copy';

      const { gx, gy } = toGameCoords(e.clientX, e.clientY);
      const bounds = uploadZone.getBounds();

      if (Phaser.Geom.Rectangle.Contains(bounds, gx, gy)) {
        if (!isOverUploadZone) {
          isOverUploadZone = true;
          uploadZone.setTint(0xffffaa);
          this.tweens.add({
            targets: uploadZone,
            scaleX: uploadZone.scale * 1.03,
            scaleY: uploadZone.scale * 1.03,
            duration: 140,
            ease: 'Power1',
          });
        }
      } else {
        if (isOverUploadZone) {
          isOverUploadZone = false;
          uploadZone.clearTint();
          this.tweens.add({
            targets: uploadZone,
            scaleX: uploadZone.scale,
            scaleY: uploadZone.scale,
            duration: 140,
            ease: 'Power1',
          });
        }
      }
    };

    const onDragLeave = (e) => {
      e.preventDefault();
      isOverUploadZone = false;
      uploadZone.clearTint();
      this.tweens.add({
        targets: uploadZone,
        scaleX: uploadZone.scale,
        scaleY: uploadZone.scale,
        duration: 120,
        ease: 'Power1',
      });
    };

    const onDrop = (e) => {
      e.preventDefault();
      uploadZone.clearTint();
      const { gx, gy } = toGameCoords(e.clientX, e.clientY);
      const bounds = uploadZone.getBounds();
      if (Phaser.Geom.Rectangle.Contains(bounds, gx, gy)) {
        const file = e.dataTransfer.files && e.dataTransfer.files[0];
        handleFileUpload(file);
      }
    };

    window.addEventListener('dragover', onDragOver);
    window.addEventListener('dragleave', onDragLeave);
    window.addEventListener('drop', onDrop);

    this.events.on('shutdown', () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    });
    this.events.on('destroy', () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('dragleave', onDragLeave);
      window.removeEventListener('drop', onDrop);
    });

    // --- Responsiveness ---
    this.scale.on('resize', () => {
      const { width, height } = this.scale;
      bg.setScale(Math.max(width / bg.width, height / bg.height));
      uploadZone.setPosition(width / 2, height * 0.48);
      student.setPosition(width * 0.13, height * 0.78);
      pdfButton.setPosition(width * 0.88, height * 0.7);
    });
  }
}

// Initialize Phaser game (if not already created)
window.addEventListener('load', () => {
  const config = {
    type: Phaser.AUTO,
    parent: 'phaser-container',
    width: 1280,
    height: 720,
    pixelArt: true,
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [PdfUploadScene],
  };

  if (!window._handquestGame) {
    window._handquestGame = new Phaser.Game(config);
  }
});
