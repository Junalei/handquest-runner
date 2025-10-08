// ====== Grab elements ======
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');

// ====== Global variables ======
window.currentAction = "none"; // 'jump', 'left', 'right', 'stop'
let lastAction = "none";
let activeHand = null;

// ====== Initialize MediaPipe Hands ======
const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
});

hands.setOptions({
  maxNumHands: 1,
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

  if (count === 0) return "stop";        // ✊ closed fist
  if (count === 5) return "jump";        // 🖐️ open palm
  if (fingers[1] && !fingers[2] && count === 1) return "left";  // ☝️ index only
  if (fingers[1] && fingers[2] && count === 2) return "right";  // ✌️ peace sign
  return "none";
}

/**
 * Main onResults handler - NOW ONLY PROCESSES FIRST DETECTED HAND
 */
function onResults(results) {
  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    // ✅ ONLY USE THE FIRST HAND DETECTED (index 0)
    const landmarks = results.multiHandLandmarks[0];
    const handLabel = results.multiHandedness[0].label; // "Left" or "Right"
    const isRightHand = handLabel === "Right";

    // Lock to first detected hand
    if (!activeHand) {
      activeHand = handLabel;
      console.log(`🖐️ Locked to ${handLabel} hand`);
    }

    // Draw hand landmarks
    drawConnectors(canvasCtx, landmarks, HAND_CONNECTIONS, { 
      color: '#00FF88', 
      lineWidth: 2 
    });
    drawLandmarks(canvasCtx, landmarks, { 
      color: '#FF0066', 
      lineWidth: 1 
    });

    // Gesture detection
    const fingers = getFingersUp(landmarks, isRightHand);
    const action = detectGesture(fingers);

    // Update action only when gesture changes
    if (action !== lastAction && action !== "none") {
      console.log(`🎮 ${handLabel} HAND → ${action.toUpperCase()}`);
      lastAction = action;
      window.currentAction = action;
    }

    // Display current action on screen
    canvasCtx.fillStyle = "yellow";
    canvasCtx.font = "28px Arial";
    canvasCtx.strokeStyle = "black";
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeText(`${handLabel} Hand`, 20, 40);
    canvasCtx.fillText(`${handLabel} Hand`, 20, 40);
    
    // canvasCtx.fillStyle = "lime";
    // canvasCtx.strokeText(`Action: ${window.currentAction.toUpperCase()}`, 20, 75);
    // canvasCtx.fillText(`Action: ${window.currentAction.toUpperCase()}`, 20, 75);

  } else {
    // No hand detected - reset
    canvasCtx.fillStyle = "white";
    canvasCtx.font = "24px Arial";
    canvasCtx.strokeStyle = "black";
    canvasCtx.lineWidth = 3;
    canvasCtx.strokeText("No hand detected", 20, 40);
    canvasCtx.fillText("No hand detected", 20, 40);
    
    window.currentAction = "none";
    lastAction = "none";
    activeHand = null; // Reset so next hand can be detected
  }
  // Inside onResults() function (near bottom)
  document.getElementById("actionDisplay").innerText = `Action: ${window.currentAction.toUpperCase()}`;


  canvasCtx.restore();
}

// ====== Keyboard Controls (Backup) ======
document.addEventListener("keydown", (event) => {
  switch (event.key) {
    case "ArrowUp":
      window.currentAction = "jump";
      console.log("⌨️ KEYBOARD → JUMP");
      break;
    case "ArrowDown":
      window.currentAction = "stop";
      console.log("⌨️ KEYBOARD → STOP");
      break;
    case "ArrowLeft":
      window.currentAction = "left";
      console.log("⌨️ KEYBOARD → LEFT");
      break;
    case "ArrowRight":
      window.currentAction = "right";
      console.log("⌨️ KEYBOARD → RIGHT");
      break;
  }
});

document.addEventListener("keyup", () => {
  window.currentAction = "none"; // stop action when key is released
});

console.log("✅ Hand tracker initialized");
console.log("🖐️ Show ONE hand (left or right) to control");
console.log("   ☝️ Index finger = LEFT");
console.log("   ✌️ Peace sign = RIGHT");
console.log("   🖐️ Open palm = JUMP");
console.log("   ✊ Closed fist = STOP");