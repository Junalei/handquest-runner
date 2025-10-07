class PdfUploadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PdfUploadScene' });
  }

  preload() {
    this.load.image('lockers', '/assets/sprites/environment/lockers.png');
    this.load.image('student', '/assets/sprites/player/student.png');
    this.load.image('uploadBox', '/assets/sprites/ui/upload.png');
    this.load.image('pdfIcon', '/assets/sprites/ui/pdf.png');
  }

  create() {
    const { width, height } = this.scale;

    // --- Background (scaled like StartScene) ---
    const bg = this.add.image(0, 0, 'lockers').setOrigin(0, 0);
    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setScrollFactor(0);

    // Subtle dark overlay for readability
    this.add.rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1220, 0.25).setOrigin(0);

    // --- Student (bottom-left corner) ---
    const student = this.add.image(this.scale.width * 0.13, this.scale.height * 0.78, 'student')
      .setOrigin(0.5)
      .setScale(0.8);

    // --- Upload area (floating animation) ---
    const uploadZone = this.add.image(this.scale.width / 2, this.scale.height * 0.45, 'uploadBox')
      .setOrigin(0.5)
      .setScale(0.9)
      .setAlpha(0.98);

    // Smooth floating + subtle rotation to make it lively
    this.tweens.add({
      targets: uploadZone,
      y: uploadZone.y - 10,
      rotation: Phaser.Math.DegToRad(1.5),
      duration: 2500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // --- PDF button ---
    const pdfButton = this.add.image(width * 0.88, height * 0.73, 'pdfIcon')
      .setOrigin(0.5)
      .setScale(0.9)
      .setAngle(8)
      .setInteractive({ useHandCursor: true });

    const basePdfScale = pdfButton.scale;

    // Continuous subtle pulse animation (keeps running, even on hover)
    this.tweens.add({
      targets: pdfButton,
      scaleX: basePdfScale * 1.05,
      scaleY: basePdfScale * 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Hover: quick highlight + rotation effect
    pdfButton.on('pointerover', () => {
      this.tweens.add({
        targets: pdfButton,
        angle: 12,
        duration: 200,
        ease: 'Power2',
      });
    });

    pdfButton.on('pointerout', () => {
      this.tweens.add({
        targets: pdfButton,
        angle: 8,
        duration: 200,
        ease: 'Power2',
      });
    });

    // Click: short bounce + open file dialog
    pdfButton.on('pointerdown', () => {
      this.tweens.add({
        targets: pdfButton,
        scaleX: basePdfScale * 0.85,
        scaleY: basePdfScale * 0.85,
        duration: 120,
        yoyo: true,
        ease: 'Power1',
      });
      openFileDialog();
    });

    // --- File Upload Handler ---
    const handleFileUpload = (file) => {
      if (!file) return;

      const isPdf =
        file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');

      if (!isPdf) {
        pdfButton.setTint(0xff9999);
        uploadZone.setTint(0xff9999);
        setTimeout(() => {
          pdfButton.clearTint();
          uploadZone.clearTint();
        }, 600);
        return;
      }

      uploadZone.setTint(0x99ff99);
      this.tweens.add({
        targets: pdfButton,
        scaleX: basePdfScale * 1.15,
        scaleY: basePdfScale * 1.15,
        duration: 180,
        yoyo: true,
        ease: 'Cubic.easeOut',
      });

      setTimeout(() => {
        uploadZone.clearTint();
        pdfButton.clearTint();
        window.location.href = '/game.html';
      }, 900);
    };

    // --- File dialog ---
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

    // --- Keyboard shortcut ---
    this.input.keyboard.on('keydown-ENTER', openFileDialog);

    // --- Drag and Drop ---
    const canvas = this.sys.game.canvas;
    let isOverUploadZone = false;

    const toGameCoords = (clientX, clientY) => {
      const rect = canvas.getBoundingClientRect();
      const scaleX = this.scale.width / rect.width;
      const scaleY = this.scale.height / rect.height;
      return {
        gx: (clientX - rect.left) * scaleX,
        gy: (clientY - rect.top) * scaleY,
      };
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
      } else if (isOverUploadZone) {
        isOverUploadZone = false;
        uploadZone.clearTint();
        this.tweens.add({
          targets: uploadZone,
          scaleX: 0.9,
          scaleY: 0.9,
          duration: 140,
          ease: 'Power1',
        });
      }
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
    window.addEventListener('drop', onDrop);

    this.events.on('shutdown', () => {
      window.removeEventListener('dragover', onDragOver);
      window.removeEventListener('drop', onDrop);
    });

    // --- Responsiveness (mirrors StartScene logic) ---
    const reposition = () => {
      const { width, height } = this.scale;
      bg.setScale(Math.max(width / bg.width, height / bg.height));
      uploadZone.setPosition(width / 2, height * 0.45);
      student.setPosition(width * 0.13, height * 0.78);
      pdfButton.setPosition(width * 0.88, height * 0.73);
    };

    this.scale.on('resize', reposition);
    reposition();
  }
}

// Expose the scene globally (to be loaded by your main.js)
window.PdfUploadScene = PdfUploadScene;
