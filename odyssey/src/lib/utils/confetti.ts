/**
 * Physics-based 2D confetti & starburst particle system inspired by Streaks & Fabulous.
 * Spawns confetti ribbons & sparkling particles from the click/tap origin (or center screen)
 * that explode radially, arc upward, and fall realistically with gravity & 3D rotation.
 */

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  color: string;
  shape: "rect" | "circle";
  rotation: number;
  rotationSpeed: number;
  rotationX: number;
  rotationXSpeed: number;
  opacity: number;
  decay: number;
  gravity: number;
  wobble: number;
  wobbleSpeed: number;
}

const DEFAULT_CONFETTI_COLORS = [
  "#6C00FF", // Primary Violet
  "#10B981", // Emerald
  "#2563EB", // Royal Blue
  "#F59E0B", // Amber Gold
  "#EC4899", // Hot Pink
  "#06B6D4", // Cyan
  "#8B5CF6", // Purple
  "#FFD700", // Bright Gold
  "#FFFFFF", // Shimmer White
];

let globalParticles: ConfettiParticle[] = [];
let animationFrameId: number | null = null;
let activeCanvas: HTMLCanvasElement | null = null;
let activeCtx: CanvasRenderingContext2D | null = null;

export function triggerStreaksConfetti(
  originX?: number,
  originY?: number,
  habitColor?: string
) {
  if (typeof window === "undefined") return;

  // Create or retrieve canvas overlay
  if (!activeCanvas || !document.body.contains(activeCanvas)) {
    let canvas = document.getElementById("odyssey-confetti-canvas") as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "odyssey-confetti-canvas";
      canvas.style.position = "fixed";
      canvas.style.top = "0";
      canvas.style.left = "0";
      canvas.style.width = "100vw";
      canvas.style.height = "100vh";
      canvas.style.pointerEvents = "none";
      canvas.style.zIndex = "99999";
      document.body.appendChild(canvas);
    }
    activeCanvas = canvas;
    activeCtx = canvas.getContext("2d");
  }

  if (!activeCanvas || !activeCtx) return;

  const width = (activeCanvas.width = window.innerWidth);
  const height = (activeCanvas.height = window.innerHeight);

  // Validate origin coordinates: fallback to viewport center if 0, NaN, or undefined
  const startX =
    typeof originX === "number" && !isNaN(originX) && originX > 0 && originX <= width
      ? originX
      : width / 2;
  const startY =
    typeof originY === "number" && !isNaN(originY) && originY > 0 && originY <= height
      ? originY
      : height / 2;

  // Build rich color palette heavily weighted by the habit's theme color if provided
  const palette = habitColor
    ? [
        habitColor,
        habitColor,
        habitColor,
        "#FFFFFF",
        "#FFD700",
        ...DEFAULT_CONFETTI_COLORS,
      ]
    : DEFAULT_CONFETTI_COLORS;

  const count = 52;

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.7;
    const speed = 4.5 + Math.random() * 9.5;
    const isCircle = Math.random() > 0.65;
    const size = isCircle ? 3.5 + Math.random() * 4 : 5.5 + Math.random() * 6.5;

    globalParticles.push({
      x: startX,
      y: startY,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (4.0 + Math.random() * 6.0), // Upward initial burst
      width: size,
      height: isCircle ? size : size * (Math.random() > 0.4 ? 1.4 : 0.8),
      color: palette[Math.floor(Math.random() * palette.length)],
      shape: isCircle ? "circle" : "rect",
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 16,
      rotationX: Math.random() * 360,
      rotationXSpeed: (Math.random() - 0.5) * 18,
      opacity: 1,
      decay: 0.011 + Math.random() * 0.013,
      gravity: 0.24 + Math.random() * 0.08,
      wobble: Math.random() * 10,
      wobbleSpeed: 0.1 + Math.random() * 0.1,
    });
  }

  function render() {
    if (!activeCtx || !activeCanvas) return;
    activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);

    const activeList: ConfettiParticle[] = [];
    const canvasH = activeCanvas.height;

    for (let i = 0; i < globalParticles.length; i++) {
      const p = globalParticles[i];
      if (p.opacity <= 0 || p.y > canvasH + 40) continue;

      p.wobble += p.wobbleSpeed;
      p.x += p.vx + Math.sin(p.wobble) * 0.6;
      p.y += p.vy;
      p.vy += p.gravity;
      p.vx *= 0.985; // Air drag
      p.rotation += p.rotationSpeed;
      p.rotationX += p.rotationXSpeed;
      p.opacity -= p.decay;

      activeCtx.save();
      activeCtx.translate(p.x, p.y);
      activeCtx.rotate((p.rotation * Math.PI) / 180);
      const scaleY = Math.cos((p.rotationX * Math.PI) / 180);
      activeCtx.scale(1, Math.max(0.12, Math.abs(scaleY)));
      activeCtx.globalAlpha = Math.max(0, p.opacity);
      activeCtx.fillStyle = p.color;

      if (p.shape === "circle") {
        activeCtx.beginPath();
        activeCtx.arc(0, 0, p.width / 2, 0, Math.PI * 2);
        activeCtx.fill();
      } else {
        activeCtx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
      }

      activeCtx.restore();
      activeList.push(p);
    }

    globalParticles = activeList;

    if (globalParticles.length > 0) {
      animationFrameId = requestAnimationFrame(render);
    } else {
      activeCtx.clearRect(0, 0, activeCanvas.width, activeCanvas.height);
      if (activeCanvas && activeCanvas.parentNode) {
        activeCanvas.parentNode.removeChild(activeCanvas);
      }
      activeCanvas = null;
      activeCtx = null;
      animationFrameId = null;
    }
  }

  if (!animationFrameId) {
    animationFrameId = requestAnimationFrame(render);
  }
}
