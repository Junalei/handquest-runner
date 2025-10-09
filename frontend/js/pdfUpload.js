class PdfUploadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PdfUploadScene" });
  }

  preload() {
    this.load.image("lockers", "/assets/sprites/environment/lockers.png");
    // Load all three frames for the student animation
    this.load.image("student_1", "/assets/sprites/player/student.png");
    this.load.image("student_2", "/assets/sprites/player/student-1.png");
    this.load.image("student_3", "/assets/sprites/player/student-2.png");
    this.load.image("uploadBox", "/assets/sprites/ui/upload.png");
    this.load.image("pdfIcon", "/assets/sprites/ui/pdf.png");
  }

  create() {
    const { width, height } = this.scale;

    // --- Student Animation ---
    // Create the animation using the preloaded images.
    // The frame sequence is explicitly defined to create the 1 -> 2 -> 3 -> 2 loop.
    this.anims.create({
      key: "student_speak",
      frames: [
        { key: "student_1" },
        { key: "student_2" },
        { key: "student_3" },
        { key: "student_2" }, // This creates the specific loop you wanted
      ],
      frameRate: 5, // You can adjust this value to make the animation faster or slower
      repeat: -1, // This makes the animation loop forever
    });

    // --- Background (scaled like StartScene) ---
    const bg = this.add.image(0, 0, "lockers").setOrigin(0, 0);
    const scaleX = this.scale.width / bg.width;
    const scaleY = this.scale.height / bg.height;
    const bgScale = Math.max(scaleX, scaleY);
    bg.setScale(bgScale).setScrollFactor(0);

    // Subtle dark overlay for readability
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0b1220, 0.25)
      .setOrigin(0);

    // --- Student (bottom-left corner, now an animated sprite) ---
    const student = this.add
      .sprite(this.scale.width * 0.13, this.scale.height * 0.9, "student_1")
      .setOrigin(0.5)
      .setScale(1.1);

    // Play the speaking animation we created earlier
    student.play("student_speak");

    // --- Upload area (floating animation) ---
    const uploadZone = this.add
      .image(this.scale.width / 2, this.scale.height * 0.45, "uploadBox")
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
      ease: "Sine.easeInOut",
    });

    // --- PDF button ---
    const pdfButton = this.add
      .image(width * 0.88, height * 0.73, "pdfIcon")
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
      ease: "Sine.easeInOut",
    });

    // Hover: quick highlight + rotation effect
    pdfButton.on("pointerover", () => {
      this.tweens.add({
        targets: pdfButton,
        angle: 12,
        duration: 200,
        ease: "Power2",
      });
    });

    pdfButton.on("pointerout", () => {
      this.tweens.add({
        targets: pdfButton,
        angle: 8,
        duration: 200,
        ease: "Power2",
      });
    });

    // Click: short bounce + open file dialog
    pdfButton.on("pointerdown", () => {
      this.tweens.add({
        targets: pdfButton,
        scaleX: basePdfScale * 0.85,
        scaleY: basePdfScale * 0.85,
        duration: 120,
        yoyo: true,
        ease: "Power1",
      });
      openFileDialog();
    });
    // --- Loading Indicator (centered, initially hidden) ---
    const loadingText = this.add
      .text(0, 0, "Generating Questions...", {
        fontFamily: "Arial",
        fontSize: "32px",
        color: "#FFFFFF",
        stroke: "#000000",
        strokeThickness: 0,
        padding: { x: 20, y: 10 },
      })
      .setOrigin(0.5)
      .setResolution(50);

    const cornerRadius = 15; // Define the radius of the corners
    const bgColor = 0xd2b48c;
    const bgAlpha = 0.7;

    const loadingBg = this.add.graphics();

    loadingBg.fillStyle(bgColor, bgAlpha);
    loadingBg.fillRoundedRect(
      -(loadingText.width / 2 + 20), // X position (centered around 0)
      -(loadingText.height / 2 + 10), // Y position (centered around 0)
      loadingText.width + 40,
      loadingText.height + 20,
      cornerRadius
    );
    loadingBg.setDepth(99); // Place it slightly below the text (default depth 100)

    // Position the container at the center of the screen
    this.loadingContainer = this.add
      .container(width / 2, height / 2, [loadingBg, loadingText])
      .setDepth(100);
    this.loadingContainer.setVisible(false); // Start hidden!

    const handleFileUpload = async (file) => {
      if (!file) return;

      const isPdf =
        file.type === "application/pdf" ||
        file.name.toLowerCase().endsWith(".pdf");

      if (!isPdf) {
        console.warn("❌ Not a PDF file!");
        return;
      }

      // 🚀 ACTION: SHOW LOADING 🚀
      this.loadingContainer.setVisible(true);

      try {
        // Prepare form
        const formData = new FormData();
        formData.append("file", file, file.name);

        // Send to backend
        const response = await fetch("http://localhost:8000/generate", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          console.error("❌ Upload failed with HTTP code:", response.status);
          return;
        }

        // Parse JSON
        const data = await response.json();
        if (data && data.questions && data.questions.length > 0) {
          localStorage.setItem(
            "handquest_questions",
            JSON.stringify(data.questions)
          );
          localStorage.setItem("uploaded_pdf_name", file.name);
          console.log(
            `✅ Upload and processing successful! ${data.questions.length} questions saved.`
          );

          // Add a tiny delay to ensure the user sees the screen change before redirect
          await new Promise((resolve) => setTimeout(resolve, 500));

          window.location.href = "/game"; // Go to game
        } else {
          console.error(
            "❌ Upload succeeded but no questions returned. Backend data:",
            data
          );
        }
      } catch (err) {
        console.error("❌ Error during upload:", err);
      } finally {
        this.loadingContainer.setVisible(false);
      }
    };

    // --- File dialog ---
    const openFileDialog = () => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".pdf";
      input.style.display = "none";
      input.onchange = (e) => {
        const file = e.target.files && e.target.files[0];
        handleFileUpload(file);
      };
      document.body.appendChild(input);
      input.click();
      document.body.removeChild(input);
    };

    // --- Keyboard shortcut ---
    this.input.keyboard.on("keydown-ENTER", openFileDialog);

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
      e.dataTransfer.dropEffect = "copy";

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
            ease: "Power1",
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
          ease: "Power1",
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

    window.addEventListener("dragover", onDragOver);
    window.addEventListener("drop", onDrop);

    this.events.on("shutdown", () => {
      window.removeEventListener("dragover", onDragOver);
      window.removeEventListener("drop", onDrop);
    });

    // --- Responsiveness (mirrors StartScene logic) ---
    const reposition = () => {
      const { width, height } = this.scale;
      bg.setScale(Math.max(width / bg.width, height / bg.height));
      uploadZone.setPosition(width / 2, height * 0.45);
      student.setPosition(width * 0.13, height * 0.78);
      pdfButton.setPosition(width * 0.88, height * 0.73);

      // 📐 Reposition Loading Elements: Center the entire container
      this.loadingContainer.setPosition(width / 2, height / 2);

      // Update the rounded background (Graphics object needs to be redrawn)
      const currentLoadingText = this.loadingContainer.getAt(1); // Text
      const currentLoadingBg = this.loadingContainer.getAt(0); // Graphics object

      if (currentLoadingText && currentLoadingBg && currentLoadingBg.clear) {
        const cornerRadius = 15;
        const bgColor = 0xd2b48c;
        const bgAlpha = 0.7;

        // 1. Clear the previous drawing
        currentLoadingBg.clear();

        // 2. Redraw the new rounded rectangle
        currentLoadingBg.fillStyle(bgColor, bgAlpha);
        currentLoadingBg.fillRoundedRect(
          -(currentLoadingText.width / 2), // X position (centered around 0, based on text size)
          -(currentLoadingText.height / 2), // Y position (centered around 0, based on text size)
          currentLoadingText.width,
          currentLoadingText.height,
          cornerRadius
        );
      }
    };

    this.scale.on("resize", reposition);
    reposition();
  }
}

// Expose the scene globally (to be loaded by your main.js)
window.PdfUploadScene = PdfUploadScene;
