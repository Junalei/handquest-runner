// ====== Grab elements ======
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// ====== Global variables ======
window.currentAction = "none"; // 'jump', 'left', 'right', 'duck'
let lastAction = "none";

// ====== Initialize MediaPipe Hands ======
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 2, // ✅ detect both hands
  modelComplexity: 0,
  minDetectionConfidence: 0.6,
  minTrackingConfidence: 0.6,
});

hands.onResults(onResults);

// ====== Use webcam ======
const camera = new Camera(videoElement, {
  onFrame: async () => {
    await hands.send({ image: videoElement });
  },
  width: 640,
  height: 480,
});
camera.start();

/**
 * Determine which fingers are up.
 * Returns an array of booleans [thumb, index, middle, ring, pinky]
 */
function getFingersUp(landmarks, isRightHand) {
  const fingers = [];

  // Thumb: flip condition depending on hand
  if (isRightHand) {
    fingers.push(landmarks[4].x < landmarks[3].x); // right hand
  } else {
    fingers.push(landmarks[4].x > landmarks[3].x); // left hand
  }

  // Other fingers: tip.y < pip.y (lower value = higher finger)
  fingers.push(landmarks[8].y < landmarks[6].y);   // index
  fingers.push(landmarks[12].y < landmarks[10].y); // middle
  fingers.push(landmarks[16].y < landmarks[14].y); // ring
  fingers.push(landmarks[20].y < landmarks[18].y); // pinky
  return fingers;
}

/**
 * Detect gesture from finger states
 */
function detectGesture(fingers) {
  const count = fingers.filter(Boolean).length;

  if (count === 0) return "duck";        // ✊ closed fist
  if (count === 5) return "jump";        // 🖐️ open palm
  if (fingers[1] && !fingers[2] && count === 1) return "left";  // ☝️ index only
  if (fingers[1] && fingers[2] && count === 2) return "right";  // ✌️ peace sign
  return "none";
}

/**
 * Main onResults handler
 */
function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandedness) {
    for (let i = 0; i < results.multiHandLandmarks.length; i++) {
      const handLabel = results.multiHandedness[i].label; // "Left" or "Right"
      const isRightHand = handLabel === "Right";
      const landmarks = results.multiHandLandmarks[i];

      // Draw hand landmarks
      drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#00FF88', lineWidth: 2 });
      drawLandmarks(canvasCtx, landmarks, { color: '#FF0066', lineWidth: 1 });

      // Gesture detection
      const fingers = getFingersUp(landmarks, isRightHand);
      const action = detectGesture(fingers);

      // Trigger only when gesture changes
      if (action !== lastAction && action !== "none") {
        console.log(`🎮 ${handLabel.toUpperCase()} HAND Action: ${action.toUpperCase()}`);
        lastAction = action;
        window.currentAction = action;
      }

      // Display current action on screen
      canvasCtx.fillStyle = "yellow";
      canvasCtx.font = "24px Arial";
      canvasCtx.fillText(`Action: ${window.currentAction.toUpperCase()}`, 20, 40);
    }
  } else {
    // No hand detected
    canvasCtx.fillStyle = "white";
    canvasCtx.font = "20px Arial";
    canvasCtx.fillText("No hand detected", 20, 40);
    window.currentAction = "none";
  }

  canvasCtx.restore();
}

// ====== Keyboard Controls ======
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowUp":
      window.currentAction = "jump";
      console.log("🎮 KEYBOARD Action: JUMP");
      break;
    case "ArrowDown":
      window.currentAction = "duck";
      console.log("🎮 KEYBOARD Action: DUCK");
      break;
    case "ArrowLeft":
      window.currentAction = "left";
      console.log("🎮 KEYBOARD Action: LEFT");
      break;
    case "ArrowRight":
      window.currentAction = "right";
      console.log("🎮 KEYBOARD Action: RIGHT");
      break;
  }
});

document.addEventListener("keyup", () => {
  window.currentAction = "none"; // stop action when key is released
});
