import { useEffect, useRef } from 'react';

const PADDLE_WIDTH = 14;
const PADDLE_HEIGHT_RATIO = 0.18;
const BALL_RADIUS_RATIO = 0.018;
const PADDLE_SPEED_RATIO = 0.012;
const INITIAL_BALL_SPEED_RATIO = 0.007;
const BALL_SPEED_INCREMENT = 0.0003;
const WIN_SCORE = 7;

interface Vec2 { x: number; y: number }
interface Ball { pos: Vec2; vel: Vec2; radius: number }
interface Paddle { y: number; dy: number; height: number }
interface Score { left: number; right: number }
type Phase = 'countdown' | 'playing' | 'scored' | 'gameover';

interface GameState {
  ball: Ball;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  score: Score;
  phase: Phase;
  winner: 'left' | 'right' | null;
  countdown: number;
  phaseTimer: number;
}

interface Keys {
  q: boolean;
  a: boolean;
  bracketRight: boolean;
  quote: boolean;
}

interface TouchControls {
  left: number | null;
  right: number | null;
}

function makeBall(w: number, h: number, towardsLeft?: boolean): Ball {
  const radius = Math.min(w, h) * BALL_RADIUS_RATIO;
  const speed = Math.min(w, h) * INITIAL_BALL_SPEED_RATIO;
  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  const dir = towardsLeft === undefined ? (Math.random() < 0.5 ? 1 : -1) : (towardsLeft ? -1 : 1);
  return {
    pos: { x: w / 2, y: h / 2 },
    vel: { x: dir * speed * Math.cos(angle), y: speed * Math.sin(angle) },
    radius,
  };
}

function makeInitialState(w: number, h: number): GameState {
  const paddleHeight = h * PADDLE_HEIGHT_RATIO;
  return {
    ball: makeBall(w, h),
    leftPaddle: { y: h / 2 - paddleHeight / 2, dy: 0, height: paddleHeight },
    rightPaddle: { y: h / 2 - paddleHeight / 2, dy: 0, height: paddleHeight },
    score: { left: 0, right: 0 },
    phase: 'countdown',
    winner: null,
    countdown: 3,
    phaseTimer: 0,
  };
}

function updatePaddles(
  state: GameState,
  keys: Keys,
  touch: TouchControls,
  paddleSpeed: number,
  h: number,
): void {
  // Left paddle
  if (touch.left !== null) {
    const targetY = touch.left - state.leftPaddle.height / 2;
    const diff = targetY - state.leftPaddle.y;
    state.leftPaddle.dy = Math.sign(diff) * Math.min(Math.abs(diff), paddleSpeed * 4);
  } else if (keys.q) {
    state.leftPaddle.dy = -paddleSpeed;
  } else if (keys.a) {
    state.leftPaddle.dy = paddleSpeed;
  } else {
    state.leftPaddle.dy = 0;
  }

  // Right paddle
  if (touch.right !== null) {
    const targetY = touch.right - state.rightPaddle.height / 2;
    const diff = targetY - state.rightPaddle.y;
    state.rightPaddle.dy = Math.sign(diff) * Math.min(Math.abs(diff), paddleSpeed * 4);
  } else if (keys.bracketRight) {
    state.rightPaddle.dy = -paddleSpeed;
  } else if (keys.quote) {
    state.rightPaddle.dy = paddleSpeed;
  } else {
    state.rightPaddle.dy = 0;
  }

  state.leftPaddle.y = Math.max(
    0,
    Math.min(h - state.leftPaddle.height, state.leftPaddle.y + state.leftPaddle.dy),
  );
  state.rightPaddle.y = Math.max(
    0,
    Math.min(h - state.rightPaddle.height, state.rightPaddle.y + state.rightPaddle.dy),
  );
}

function stepGame(
  state: GameState,
  dt: number,
  w: number,
  h: number,
  keys: Keys,
  touch: TouchControls,
): GameState {
  const s: GameState = {
    ...state,
    ball: { ...state.ball, pos: { ...state.ball.pos }, vel: { ...state.ball.vel } },
    leftPaddle: { ...state.leftPaddle },
    rightPaddle: { ...state.rightPaddle },
    score: { ...state.score },
  };

  const paddleSpeed = h * PADDLE_SPEED_RATIO;

  if (s.phase === 'countdown') {
    s.phaseTimer += dt;
    if (s.phaseTimer >= 1000) {
      s.phaseTimer = 0;
      s.countdown -= 1;
      if (s.countdown < 0) {
        s.phase = 'playing';
      }
    }
    updatePaddles(s, keys, touch, paddleSpeed, h);
    return s;
  }

  if (s.phase === 'scored') {
    s.phaseTimer += dt;
    updatePaddles(s, keys, touch, paddleSpeed, h);
    if (s.phaseTimer >= 1500) {
      if (s.score.left >= WIN_SCORE || s.score.right >= WIN_SCORE) {
        s.phase = 'gameover';
        s.winner = s.score.left >= WIN_SCORE ? 'left' : 'right';
      } else {
        s.ball = makeBall(w, h, Math.random() < 0.5);
        s.phase = 'countdown';
        s.countdown = 3;
        s.phaseTimer = 0;
      }
    }
    return s;
  }

  if (s.phase === 'gameover') {
    return s;
  }

  // playing
  updatePaddles(s, keys, touch, paddleSpeed, h);

  const frameFactor = dt / 16.67;
  const curSpeed = Math.hypot(s.ball.vel.x, s.ball.vel.y);
  const newSpeed = curSpeed + BALL_SPEED_INCREMENT * Math.min(w, h) * frameFactor;
  const speedRatio = newSpeed / curSpeed;

  s.ball.pos.x += s.ball.vel.x * frameFactor;
  s.ball.pos.y += s.ball.vel.y * frameFactor;
  s.ball.vel.x *= speedRatio;
  s.ball.vel.y *= speedRatio;

  // Top/bottom bounce
  if (s.ball.pos.y - s.ball.radius < 0) {
    s.ball.pos.y = s.ball.radius;
    s.ball.vel.y = Math.abs(s.ball.vel.y);
  }
  if (s.ball.pos.y + s.ball.radius > h) {
    s.ball.pos.y = h - s.ball.radius;
    s.ball.vel.y = -Math.abs(s.ball.vel.y);
  }

  // Left paddle hit
  if (
    s.ball.vel.x < 0 &&
    s.ball.pos.x - s.ball.radius <= PADDLE_WIDTH &&
    s.ball.pos.y >= s.leftPaddle.y &&
    s.ball.pos.y <= s.leftPaddle.y + s.leftPaddle.height
  ) {
    s.ball.pos.x = PADDLE_WIDTH + s.ball.radius;
    const relY =
      (s.ball.pos.y - (s.leftPaddle.y + s.leftPaddle.height / 2)) /
      (s.leftPaddle.height / 2);
    const angle = relY * (Math.PI / 3);
    const spd = Math.hypot(s.ball.vel.x, s.ball.vel.y);
    s.ball.vel.x = spd * Math.cos(angle);
    s.ball.vel.y = spd * Math.sin(angle);
  }

  // Right paddle hit
  if (
    s.ball.vel.x > 0 &&
    s.ball.pos.x + s.ball.radius >= w - PADDLE_WIDTH &&
    s.ball.pos.y >= s.rightPaddle.y &&
    s.ball.pos.y <= s.rightPaddle.y + s.rightPaddle.height
  ) {
    s.ball.pos.x = w - PADDLE_WIDTH - s.ball.radius;
    const relY =
      (s.ball.pos.y - (s.rightPaddle.y + s.rightPaddle.height / 2)) /
      (s.rightPaddle.height / 2);
    const angle = relY * (Math.PI / 3);
    const spd = Math.hypot(s.ball.vel.x, s.ball.vel.y);
    s.ball.vel.x = -spd * Math.cos(angle);
    s.ball.vel.y = spd * Math.sin(angle);
  }

  // Score
  if (s.ball.pos.x + s.ball.radius < 0) {
    s.score.right += 1;
    s.phase = 'scored';
    s.phaseTimer = 0;
  } else if (s.ball.pos.x - s.ball.radius > w) {
    s.score.left += 1;
    s.phase = 'scored';
    s.phaseTimer = 0;
  }

  return s;
}

function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width: w, height: h } = ctx.canvas;

  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // Center dashed line
  ctx.save();
  ctx.setLineDash([h / 30, h / 30]);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(w / 2, 0);
  ctx.lineTo(w / 2, h);
  ctx.stroke();
  ctx.restore();

  // Paddles
  ctx.fillStyle = '#fff';
  ctx.fillRect(0, state.leftPaddle.y, PADDLE_WIDTH, state.leftPaddle.height);
  ctx.fillRect(w - PADDLE_WIDTH, state.rightPaddle.y, PADDLE_WIDTH, state.rightPaddle.height);

  // Ball
  ctx.beginPath();
  ctx.arc(state.ball.pos.x, state.ball.pos.y, state.ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = '#fff';
  ctx.fill();

  // Scores
  const fontSize = Math.round(h * 0.1);
  ctx.font = `bold ${fontSize}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(String(state.score.left), w * 0.25, h * 0.04);
  ctx.fillText(String(state.score.right), w * 0.75, h * 0.04);

  if (state.phase === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, w, h);
    const bigFont = Math.round(h * 0.25);
    ctx.font = `bold ${bigFont}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.countdown > 0 ? String(state.countdown) : 'GO!', w / 2, h / 2);
  }

  if (state.phase === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(h * 0.1)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(state.winner === 'left' ? 'LEFT WINS!' : 'RIGHT WINS!', w / 2, h * 0.38);
    ctx.font = `${Math.round(h * 0.048)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(`${state.score.left} : ${state.score.right}`, w / 2, h * 0.53);
    ctx.font = `${Math.round(h * 0.042)}px monospace`;
    ctx.fillText('Tap or ENTER to restart', w / 2, h * 0.66);
  }

  // Controls hint on first countdown
  if (
    state.phase === 'countdown' &&
    state.score.left === 0 &&
    state.score.right === 0
  ) {
    const hf = Math.round(h * 0.038);
    ctx.font = `${hf}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Q ↑  A ↓', PADDLE_WIDTH + 8, h - 8);
    ctx.textAlign = 'right';
    ctx.fillText("↑ ]  ↓ '", w - PADDLE_WIDTH - 8, h - 8);
  }
}

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Keys>({ q: false, a: false, bracketRight: false, quote: false });
  const touchRef = useRef<TouchControls>({ left: null, right: null });
  const activeTouchesRef = useRef<Map<number, 'left' | 'right'>>(new Map());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const init = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      stateRef.current = makeInitialState(canvas.width, canvas.height);
    };

    init();

    function loop(timestamp: number) {
      const ctx = canvas!.getContext('2d');
      if (!ctx || !stateRef.current) return;

      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      stateRef.current = stepGame(
        stateRef.current,
        dt,
        canvas!.width,
        canvas!.height,
        keysRef.current,
        touchRef.current,
      );
      renderGame(ctx, stateRef.current);

      rafRef.current = requestAnimationFrame(loop);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'q': case 'Q': keysRef.current.q = true; e.preventDefault(); break;
        case 'a': case 'A': keysRef.current.a = true; e.preventDefault(); break;
        case ']': keysRef.current.bracketRight = true; e.preventDefault(); break;
        case "'": keysRef.current.quote = true; e.preventDefault(); break;
        case 'Enter':
          if (stateRef.current?.phase === 'gameover') {
            stateRef.current = makeInitialState(canvas.width, canvas.height);
          }
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'q': case 'Q': keysRef.current.q = false; break;
        case 'a': case 'A': keysRef.current.a = false; break;
        case ']': keysRef.current.bracketRight = false; break;
        case "'": keysRef.current.quote = false; break;
      }
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      if (stateRef.current?.phase === 'gameover') {
        stateRef.current = makeInitialState(canvas.width, canvas.height);
        return;
      }
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const side: 'left' | 'right' = t.clientX < canvas.width / 2 ? 'left' : 'right';
        activeTouchesRef.current.set(t.identifier, side);
        if (side === 'left') touchRef.current.left = t.clientY;
        else touchRef.current.right = t.clientY;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const side = activeTouchesRef.current.get(t.identifier);
        if (side === 'left') touchRef.current.left = t.clientY;
        else if (side === 'right') touchRef.current.right = t.clientY;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const side = activeTouchesRef.current.get(t.identifier);
        activeTouchesRef.current.delete(t.identifier);
        const hasSide = Array.from(activeTouchesRef.current.values()).includes(
          side as 'left' | 'right',
        );
        if (!hasSide) {
          if (side === 'left') touchRef.current.left = null;
          else if (side === 'right') touchRef.current.right = null;
        }
      }
    };

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      if (!stateRef.current || stateRef.current.phase === 'gameover') {
        init();
      } else {
        const s = stateRef.current;
        const ph = canvas.height * PADDLE_HEIGHT_RATIO;
        s.leftPaddle.height = ph;
        s.rightPaddle.height = ph;
        s.ball.radius = Math.min(canvas.width, canvas.height) * BALL_RADIUS_RATIO;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    window.addEventListener('resize', handleResize);

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100vw', height: '100vh', touchAction: 'none' }}
    />
  );
}
