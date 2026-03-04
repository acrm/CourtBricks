import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';

interface Vec2 { x: number; y: number }
interface Ball { pos: Vec2; vel: Vec2; radius: number; color: string }
interface Paddle { y: number; dy: number; height: number }
interface Block { x: number; y: number; color: string; pieceId: number }
interface ActiveTetromino { id: number; blocks: Block[]; paddleHitsSinceLastFall: number }
interface ScoreDeltaFx {
  id: number;
  delta: number;
  text: string;
  color: string;
  startedAt: number;
  durationMs: number;
}

const TETROMINO_SHAPES: ReadonlyArray<ReadonlyArray<Vec2>> = [
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 2, y: 0 }, { x: 3, y: 0 }],
  [{ x: 0, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 1, y: 0 }, { x: 2, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }, { x: 2, y: 1 }],
  [{ x: 0, y: 0 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: 1, y: 1 }],
];

type Side = 'left' | 'right';
type Phase = 'countdown' | 'playing' | 'gameover' | 'finished';
type BonusKind = 'palette-color' | 'white-color';

interface BonusOffer {
  kind: BonusKind;
  color: string;
  cost: number;
  effectDurationMs: number;
  side: Side;
  spawnedAt: number;
  expiresAt: number;
}

interface GameState {
  ball: Ball;
  leftPaddle: Paddle;
  rightPaddle: Paddle;
  phase: Phase;
  countdown: number;
  phaseTimer: number;
  blocks: Block[];
  activeTetromino: ActiveTetromino | null;
  paddleHitCount: number;
  score: number;
  lastOuterSide: Side | null;
  ballTrail: Vec2[];
  nextPieceId: number;
  bonusOffer: BonusOffer | null;
  lastBonusSpawnAt: number;
  currentBallSide: Side;
  ballSideEnteredAt: number;
  scoreFx: ScoreDeltaFx[];
  nextScoreFxId: number;
  totalScore: number;
  sessionScore: number;
  musicEnabled: boolean;
  soundsEnabled: boolean;
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

interface MouseControls {
  active: boolean;
  y: number | null;
}

interface Bounds {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  topPanelHeight: number;
  sideMargin: number;
}

function getBounds(w: number, h: number): Bounds {
  const topPanelHeight = Math.max(h * GAME_CONFIG.topPanelRatio, 50);
  const sideMargin = Math.max(w * GAME_CONFIG.sideMarginRatio, 40);

  return {
    left: sideMargin,
    right: w - sideMargin,
    top: topPanelHeight,
    bottom: h,
    width: w - sideMargin * 2,
    height: h - topPanelHeight,
    topPanelHeight,
    sideMargin,
  };
}

function getRandomBlockColor(): string {
  return GAME_CONFIG.blockColors[Math.floor(Math.random() * GAME_CONFIG.blockColors.length)];
}

function getRandomDifferentColor(currentColor: string): string {
  const available = GAME_CONFIG.blockColors.filter((color) => color !== currentColor);
  return available[Math.floor(Math.random() * available.length)] ?? GAME_CONFIG.blockColors[0];
}

function getRandomDifferentBonusColor(currentBallColor: string): string {
  // Don't offer bonus for the same color the ball is already
  const availableColors = GAME_CONFIG.blockColors.filter((color) => color !== currentBallColor);
  if (availableColors.length === 0) {
    return GAME_CONFIG.blockColors[0];
  }
  return availableColors[Math.floor(Math.random() * availableColors.length)];
}

function makeBall(w: number, h: number, towardLeft?: boolean): Ball {
  const bounds = getBounds(w, h);
  const radius = Math.min(bounds.width, bounds.height) * GAME_CONFIG.ballRadiusRatio;
  const speed = Math.min(bounds.width, bounds.height) * GAME_CONFIG.initialBallSpeedRatio;
  const angle = (Math.random() * Math.PI) / 3 - Math.PI / 6;
  const dir = towardLeft === undefined ? (Math.random() < 0.5 ? 1 : -1) : (towardLeft ? -1 : 1);

  return {
    pos: { x: w / 2, y: h / 2 },
    vel: { x: dir * speed * Math.cos(angle), y: speed * Math.sin(angle) },
    radius,
    color: GAME_CONFIG.ballWhiteColor,
  };
}

function makeInitialState(w: number, h: number, preserveTotal = false, prevTotal = 0, musicOn = true, soundsOn = true): GameState {
  const bounds = getBounds(w, h);
  const paddleHeight = bounds.height * GAME_CONFIG.paddleHeightRatio;
  const centerPaddleY = bounds.top + bounds.height / 2 - paddleHeight / 2;
  const ball = makeBall(w, h);
  const grid = getGridDimensions(w, h);
  const now = performance.now();
  const currentBallSide = getBallSide(ball.pos.x, grid.zoneLeft, grid.zoneRight);

  return {
    ball,
    leftPaddle: { y: centerPaddleY, dy: 0, height: paddleHeight },
    rightPaddle: { y: centerPaddleY, dy: 0, height: paddleHeight },
    phase: 'countdown',
    countdown: GAME_CONFIG.countdownSeconds,
    phaseTimer: 0,
    blocks: [],
    activeTetromino: null,
    paddleHitCount: 0,
    score: 0,
    lastOuterSide: null,
    ballTrail: [],
    nextPieceId: 1,
    bonusOffer: null,
    lastBonusSpawnAt: 0,
    currentBallSide,
    ballSideEnteredAt: now,
    scoreFx: [],
    nextScoreFxId: 1,
    totalScore: preserveTotal ? prevTotal : 0,
    sessionScore: 0,
    musicEnabled: musicOn,
    soundsEnabled: soundsOn,
  };
}

function getGridDimensions(w: number, h: number): {
  blockSize: number;
  blockWidth: number;
  blockHeight: number;
  zoneLeft: number;
  zoneRight: number;
  zoneWidth: number;
} {
  const bounds = getBounds(w, h);
  const blockSize = bounds.height / GAME_CONFIG.tetrisGridRows;
  const zoneWidth = blockSize * GAME_CONFIG.tetrisGridCols;
  const zoneLeft = bounds.left + (bounds.width - zoneWidth) / 2;
  const zoneRight = zoneLeft + zoneWidth;
  const blockWidth = blockSize;
  const blockHeight = blockSize;

  return { blockSize, blockWidth, blockHeight, zoneLeft, zoneRight, zoneWidth };
}

function spawnTetromino(blocks: Block[], pieceId: number): Block[] {
  const shape = TETROMINO_SHAPES[Math.floor(Math.random() * TETROMINO_SHAPES.length)];
  const color = getRandomBlockColor();

  const minX = Math.min(...shape.map((cell) => cell.x));
  const maxX = Math.max(...shape.map((cell) => cell.x));
  const spawnMinX = -minX;
  const spawnMaxX = GAME_CONFIG.tetrisGridCols - 1 - maxX;

  if (spawnMaxX < spawnMinX) {
    return [];
  }

  const startX = spawnMinX + Math.floor(Math.random() * (spawnMaxX - spawnMinX + 1));
  const candidates: number[] = [];
  for (let i = spawnMinX; i <= spawnMaxX; i += 1) {
    candidates.push(i);
  }

  const ordered = [
    ...candidates.filter((x) => x >= startX),
    ...candidates.filter((x) => x < startX),
  ];

  for (const offsetX of ordered) {
    const cells = shape.map((cell) => ({ x: cell.x + offsetX, y: cell.y }));
    const canPlace = cells.every(
      (cell) => !blocks.some((block) => block.x === cell.x && block.y === cell.y),
    );

    if (!canPlace) {
      continue;
    }

    return cells.map((cell) => ({ ...cell, color, pieceId }));
  }

  return [];
}

function getBallSide(ballX: number, zoneLeft: number, zoneRight: number): Side {
  if (ballX < zoneLeft) {
    return 'left';
  }
  if (ballX > zoneRight) {
    return 'right';
  }
  return ballX < (zoneLeft + zoneRight) / 2 ? 'left' : 'right';
}

function canPieceMoveDown(pieceBlocks: Block[], allBlocks: Block[]): boolean {
  return pieceBlocks.every((cell) => {
    const nextY = cell.y + 1;
    if (nextY >= GAME_CONFIG.tetrisGridRows) {
      return false;
    }

    return !allBlocks.some(
      (block) => block.pieceId !== cell.pieceId && block.x === cell.x && block.y === nextY,
    );
  });
}

function fallSettledPiecesOneStep(blocks: Block[]): Block[] {
  if (blocks.length === 0) {
    return blocks;
  }

  const byPiece = new Map<number, Block[]>();
  blocks.forEach((block) => {
    if (!byPiece.has(block.pieceId)) {
      byPiece.set(block.pieceId, []);
    }
    byPiece.get(block.pieceId)?.push(block);
  });

  const movablePieceIds = new Set<number>();
  byPiece.forEach((pieceBlocks, pieceId) => {
    if (canPieceMoveDown(pieceBlocks, blocks)) {
      movablePieceIds.add(pieceId);
    }
  });

  if (movablePieceIds.size === 0) {
    return blocks;
  }

  return blocks.map((block) => (
    movablePieceIds.has(block.pieceId)
      ? { ...block, y: block.y + 1 }
      : block
  ));
}

function getRandomBonusOffer(side: Side, now: number, currentBallColor: string): BonusOffer {
  const options: BonusOffer[] = [];
  
  // Only offer palette color if ball is not already that color
  if (currentBallColor !== GAME_CONFIG.ballWhiteColor) {
    const paletteColor = getRandomDifferentBonusColor(currentBallColor);
    options.push({
      kind: 'palette-color',
      color: paletteColor,
      cost: GAME_CONFIG.bonusColorCost,
      effectDurationMs: 0,
      side,
      spawnedAt: now,
      expiresAt: now + GAME_CONFIG.bonusOfferLifetimeMs,
    });
  }
  
  // Only offer white color if ball is not already white
  if (currentBallColor !== GAME_CONFIG.ballWhiteColor) {
    options.push({
      kind: 'white-color',
      color: GAME_CONFIG.ballWhiteColor,
      cost: GAME_CONFIG.bonusWhiteCost,
      effectDurationMs: 0,
      side,
      spawnedAt: now,
      expiresAt: now + GAME_CONFIG.bonusOfferLifetimeMs,
    });
  }
  
  // If ball is white, offer only palette colors
  if (currentBallColor === GAME_CONFIG.ballWhiteColor) {
    const paletteColor = getRandomBlockColor();
    options.push({
      kind: 'palette-color',
      color: paletteColor,
      cost: GAME_CONFIG.bonusColorCost,
      effectDurationMs: 0,
      side,
      spawnedAt: now,
      expiresAt: now + GAME_CONFIG.bonusOfferLifetimeMs,
    });
  }

  return options[Math.floor(Math.random() * options.length)];
}

function canShowBonusOffer(state: GameState, now: number): boolean {
  if (state.phase !== 'playing' || state.bonusOffer === null) {
    return false;
  }

  if (state.score < state.bonusOffer.cost) {
    return false;
  }

  return now - state.ballSideEnteredAt >= GAME_CONFIG.bonusRequiredZoneStayMs;
}

function pushScoreFx(state: GameState, delta: number, now: number): void {
  const color = delta >= 0 ? 'rgb(80, 235, 120)' : 'rgb(255, 95, 95)';
  const text = delta >= 0 ? `+${delta}` : `${delta}`;

  state.scoreFx.push({
    id: state.nextScoreFxId,
    delta,
    text,
    color,
    startedAt: now,
    durationMs: GAME_CONFIG.scoreFxDurationMs,
  });
  state.nextScoreFxId += 1;
}

function tryPurchaseBonus(state: GameState, now: number, playSound: (key: string) => void): boolean {
  if (!canShowBonusOffer(state, now) || state.bonusOffer === null) {
    return false;
  }

  state.score -= state.bonusOffer.cost;
  pushScoreFx(state, -state.bonusOffer.cost, now);
  state.ball.color = state.bonusOffer.color;
  state.bonusOffer = null;
  state.lastBonusSpawnAt = now;
  playSound('bonusPurchase');
  return true;
}

function getBonusWidgetRect(
  bounds: Bounds,
  grid: { zoneLeft: number; zoneRight: number },
  offerSide: Side,
  canvasHeight: number,
): {
  x: number;
  y: number;
  size: number;
} {
  const size = canvasHeight * GAME_CONFIG.bonusWidgetSizeRatio;
  const y = bounds.top + (bounds.height - size) / 2;
  const sideCenterX = offerSide === 'left'
    ? (bounds.left + grid.zoneLeft) / 2
    : (grid.zoneRight + bounds.right) / 2;

  return {
    x: sideCenterX - size / 2,
    y,
    size,
  };
}

function canTetrominoMoveDown(tetromino: Block[], blocks: Block[]): boolean {
  return tetromino.every((cell) => {
    const nextY = cell.y + 1;
    if (nextY >= GAME_CONFIG.tetrisGridRows) {
      return false;
    }
    return !blocks.some((block) => block.x === cell.x && block.y === nextY);
  });
}

function moveTetrominoDown(tetromino: Block[]): Block[] {
  return tetromino.map((cell) => ({ ...cell, y: cell.y + 1 }));
}



function updatePaddles(
  state: GameState,
  keys: Keys,
  touch: TouchControls,
  mouse: MouseControls,
  paddleSpeed: number,
  bounds: Bounds,
): void {
  if (mouse.active && mouse.y !== null) {
    const targetY = mouse.y - state.leftPaddle.height / 2;
    const clampedY = Math.max(bounds.top, Math.min(bounds.bottom - state.leftPaddle.height, targetY));
    state.leftPaddle.y = clampedY;
    state.rightPaddle.y = clampedY;
    state.leftPaddle.dy = 0;
    state.rightPaddle.dy = 0;
    return;
  }

  if (touch.left !== null) {
    // Invert Y for real mobile devices (portrait mode rotation causes inversion)
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

  if (touch.right !== null) {
    // Invert Y for real mobile devices (portrait mode rotation causes inversion)
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
    bounds.top,
    Math.min(bounds.bottom - state.leftPaddle.height, state.leftPaddle.y + state.leftPaddle.dy),
  );
  state.rightPaddle.y = Math.max(
    bounds.top,
    Math.min(bounds.bottom - state.rightPaddle.height, state.rightPaddle.y + state.rightPaddle.dy),
  );
}

function detectOuterSide(ballX: number, ballRadius: number, zoneLeft: number, zoneRight: number): Side | null {
  if (ballX + ballRadius < zoneLeft) {
    return 'left';
  }
  if (ballX - ballRadius > zoneRight) {
    return 'right';
  }
  return null;
}

function stepGame(
  state: GameState,
  dt: number,
  w: number,
  h: number,
  keys: Keys,
  touch: TouchControls,
  mouse: MouseControls,
  playSound: (key: string) => void,
): GameState {
  const now = performance.now();
  const s: GameState = {
    ...state,
    ball: { ...state.ball, pos: { ...state.ball.pos }, vel: { ...state.ball.vel } },
    leftPaddle: { ...state.leftPaddle },
    rightPaddle: { ...state.rightPaddle },
    blocks: state.blocks.map((block) => ({ ...block })),
    activeTetromino: state.activeTetromino
      ? {
        id: state.activeTetromino.id,
        blocks: state.activeTetromino.blocks.map((b) => ({ ...b })),
        paddleHitsSinceLastFall: state.activeTetromino.paddleHitsSinceLastFall,
      }
      : null,
    ballTrail: [...state.ballTrail],
    scoreFx: state.scoreFx.map((fx) => ({ ...fx })),
  };

  s.scoreFx = s.scoreFx.filter((fx) => now - fx.startedAt <= fx.durationMs);

  const bounds = getBounds(w, h);
  const grid = getGridDimensions(w, h);
  const paddleSpeed = bounds.height * GAME_CONFIG.paddleSpeedRatio;

  if (s.phase === 'countdown') {
    s.phaseTimer += dt;
    if (s.phaseTimer >= 1000) {
      s.phaseTimer = 0;
      s.countdown -= 1;
      if (s.countdown >= 0) {
        playSound('countdownTick');
      }
      if (s.countdown < 0) {
        s.phase = 'playing';
      }
    }
    updatePaddles(s, keys, touch, mouse, paddleSpeed, bounds);
    return s;
  }

  if (s.phase === 'gameover' || s.phase === 'finished') {
    updatePaddles(s, keys, touch, mouse, paddleSpeed, bounds);
    return s;
  }

  updatePaddles(s, keys, touch, mouse, paddleSpeed, bounds);

  // Update ball trail
  s.ballTrail.push({ x: s.ball.pos.x, y: s.ball.pos.y });
  if (s.ballTrail.length > GAME_CONFIG.ballTrailLength) {
    s.ballTrail.shift();
  }

  const frameFactor = dt / 16.67;
  const curSpeed = Math.hypot(s.ball.vel.x, s.ball.vel.y);
  const newSpeed = curSpeed + GAME_CONFIG.ballSpeedIncrement * Math.min(bounds.width, bounds.height) * frameFactor;
  const speedRatio = curSpeed === 0 ? 1 : newSpeed / curSpeed;

  s.ball.pos.x += s.ball.vel.x * frameFactor;
  s.ball.pos.y += s.ball.vel.y * frameFactor;
  s.ball.vel.x *= speedRatio;
  s.ball.vel.y *= speedRatio;

  if (s.ball.pos.y - s.ball.radius < bounds.top) {
    s.ball.pos.y = bounds.top + s.ball.radius;
    s.ball.vel.y = Math.abs(s.ball.vel.y);
    playSound('wallHit');
  }
  if (s.ball.pos.y + s.ball.radius > bounds.bottom) {
    s.ball.pos.y = bounds.bottom - s.ball.radius;
    s.ball.vel.y = -Math.abs(s.ball.vel.y);
    playSound('wallHit');
  }

  const leftPaddleX = bounds.left;
  const rightPaddleX = bounds.right - GAME_CONFIG.paddleWidth;

  let paddleHit = false;

  if (
    s.ball.vel.x < 0
    && s.ball.pos.x - s.ball.radius <= leftPaddleX + GAME_CONFIG.paddleWidth
    && s.ball.pos.x > leftPaddleX
    && s.ball.pos.y >= s.leftPaddle.y
    && s.ball.pos.y <= s.leftPaddle.y + s.leftPaddle.height
  ) {
    paddleHit = true;
    s.ball.pos.x = leftPaddleX + GAME_CONFIG.paddleWidth + s.ball.radius;
    const relY = (s.ball.pos.y - (s.leftPaddle.y + s.leftPaddle.height / 2)) / (s.leftPaddle.height / 2);
    const angle = relY * (Math.PI / 3);
    const speed = Math.hypot(s.ball.vel.x, s.ball.vel.y);
    s.ball.vel.x = speed * Math.cos(angle);
    s.ball.vel.y = speed * Math.sin(angle);
    playSound('paddleHit');
  }

  if (
    s.ball.vel.x > 0
    && s.ball.pos.x + s.ball.radius >= rightPaddleX
    && s.ball.pos.x < rightPaddleX + GAME_CONFIG.paddleWidth
    && s.ball.pos.y >= s.rightPaddle.y
    && s.ball.pos.y <= s.rightPaddle.y + s.rightPaddle.height
  ) {
    paddleHit = true;
    s.ball.pos.x = rightPaddleX - s.ball.radius;
    const relY = (s.ball.pos.y - (s.rightPaddle.y + s.rightPaddle.height / 2)) / (s.rightPaddle.height / 2);
    const angle = relY * (Math.PI / 3);
    const speed = Math.hypot(s.ball.vel.x, s.ball.vel.y);
    s.ball.vel.x = -speed * Math.cos(angle);
    s.ball.vel.y = speed * Math.sin(angle);
    playSound('paddleHit');
  }

  if (paddleHit) {
    s.paddleHitCount += 1;

    // Try to spawn tetromino if none exists
    if (!s.activeTetromino) {
      const newBlocks = spawnTetromino(s.blocks, s.nextPieceId);
      if (newBlocks.length > 0) {
        s.activeTetromino = { id: s.nextPieceId, blocks: newBlocks, paddleHitsSinceLastFall: 0 };
        s.nextPieceId += 1;
      }
    } else {
      // Move tetromino down by one cell on every paddle hit
      s.activeTetromino.paddleHitsSinceLastFall += 1;
      
      if (canTetrominoMoveDown(s.activeTetromino.blocks, s.blocks)) {
        s.activeTetromino.blocks = moveTetrominoDown(s.activeTetromino.blocks);
        s.activeTetromino.paddleHitsSinceLastFall = 0;
      } else {
        // Freeze tetromino: add to blocks
        s.blocks.push(...s.activeTetromino.blocks);
        s.activeTetromino = null;

        // Try to spawn new one
        const newBlocks = spawnTetromino(s.blocks, s.nextPieceId);
        if (newBlocks.length > 0) {
          s.activeTetromino = { id: s.nextPieceId, blocks: newBlocks, paddleHitsSinceLastFall: 0 };
          s.nextPieceId += 1;
        }
      }
    }

    // Settled pieces can fall as complete figures, one cell per step
    s.blocks = fallSettledPiecesOneStep(s.blocks);
  }

  // Bonus offer lifecycle (spawn not more than once in 10s, always opposite to ball side)
  const ballSide = getBallSide(s.ball.pos.x, grid.zoneLeft, grid.zoneRight);
  if (ballSide !== s.currentBallSide) {
    s.currentBallSide = ballSide;
    s.ballSideEnteredAt = now;
  }
  const bonusSide: Side = ballSide === 'left' ? 'right' : 'left';

  if (s.bonusOffer) {
    if (now >= s.bonusOffer.expiresAt) {
      playSound('bonusExpire');
      s.bonusOffer = null;
      s.lastBonusSpawnAt = now;
    } else if (s.bonusOffer.side !== bonusSide) {
      s.bonusOffer = { ...s.bonusOffer, side: bonusSide };
    }
  }

  if (!s.bonusOffer && now -s.lastBonusSpawnAt >= GAME_CONFIG.bonusOfferIntervalMs) {
    s.bonusOffer = getRandomBonusOffer(bonusSide, now, s.ball.color);
    s.lastBonusSpawnAt = now;
    playSound('bonusAppear');
  }

  const removed = new Set<number>();
  const allBlocks = s.activeTetromino ? [...s.blocks, ...s.activeTetromino.blocks] : s.blocks;
  let collidedThisFrame = false;

  allBlocks.forEach((block, index) => {
    if (collidedThisFrame) {
      return;
    }

    const blockX = grid.zoneLeft + block.x * grid.blockWidth;
    const blockY = bounds.top + block.y * grid.blockHeight;

    const nearestX = Math.max(blockX, Math.min(s.ball.pos.x, blockX + grid.blockWidth));
    const nearestY = Math.max(blockY, Math.min(s.ball.pos.y, blockY + grid.blockHeight));

    const dx = s.ball.pos.x - nearestX;
    const dy = s.ball.pos.y - nearestY;
    const hit = dx * dx + dy * dy <= s.ball.radius * s.ball.radius;

    if (!hit) {
      return;
    }

    const match = s.ball.color === GAME_CONFIG.ballWhiteColor || s.ball.color === block.color;

    if (match) {
      removed.add(index);
      s.ball.color = getRandomDifferentColor(s.ball.color);
      collidedThisFrame = true;
      playSound('blockDestroy');
      return;
    }

    // Reflect ball and push it away from block to prevent sticking
    playSound('blockHit');
    if (Math.abs(dx) > Math.abs(dy)) {
      s.ball.vel.x = -s.ball.vel.x;
      // Push ball out horizontally
      if (dx > 0) {
        s.ball.pos.x = blockX + grid.blockWidth + s.ball.radius;
      } else {
        s.ball.pos.x = blockX - s.ball.radius;
      }
    } else {
      s.ball.vel.y = -s.ball.vel.y;
      // Push ball out vertically
      if (dy > 0) {
        s.ball.pos.y = blockY + grid.blockHeight + s.ball.radius;
      } else {
        s.ball.pos.y = blockY - s.ball.radius;
      }
    }

    collidedThisFrame = true;
  });

  // Process removed blocks
  const staticBlocksCount = s.blocks.length;
  const removedStatic = new Set<number>();
  const removedActive = new Set<number>();

  removed.forEach((index) => {
    if (index < staticBlocksCount) {
      removedStatic.add(index);
    } else {
      removedActive.add(index - staticBlocksCount);
    }
  });

  s.blocks = s.blocks.filter((_, index) => !removedStatic.has(index));
  if (s.activeTetromino) {
    s.activeTetromino.blocks = s.activeTetromino.blocks.filter((_, index) => !removedActive.has(index));
    if (s.activeTetromino.blocks.length === 0) {
      s.activeTetromino = null;
    }
  }

  const newOuterSide = detectOuterSide(s.ball.pos.x, s.ball.radius, grid.zoneLeft, grid.zoneRight);
  if (newOuterSide !== null) {
    if (s.lastOuterSide !== null && s.lastOuterSide !== newOuterSide) {
      s.score += 1;
      pushScoreFx(s, 1, now);
      playSound('scoreGain');
    }
    s.lastOuterSide = newOuterSide;
  }

  if (s.ball.pos.x + s.ball.radius < bounds.left || s.ball.pos.x - s.ball.radius > bounds.right) {
    s.phase = 'gameover';
    s.countdown = GAME_CONFIG.countdownSeconds;
    s.phaseTimer = 0;
    playSound('gameOver');
  }

  return s;
}

function renderGame(ctx: CanvasRenderingContext2D, state: GameState): void {
  const { width: w, height: h } = ctx.canvas;
  const now = performance.now();
  const bounds = getBounds(w, h);
  const grid = getGridDimensions(w, h);

  // Background
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);

  // Top panel
  ctx.fillStyle = GAME_CONFIG.topPanelColor;
  ctx.fillRect(0, 0, w, bounds.topPanelHeight);
  ctx.strokeStyle = GAME_CONFIG.panelBorderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, bounds.topPanelHeight - 1, w, 1);

  // Score in top panel (left side)
  const scoreFontSize = Math.round(bounds.topPanelHeight * 0.5);
  ctx.font = `bold ${scoreFontSize}px monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SCORE: ${state.score}`, 20, bounds.topPanelHeight / 2);

  // Score change animation (+/-)
  state.scoreFx.forEach((fx) => {
    const age = now - fx.startedAt;
    if (age < 0 || age > fx.durationMs) {
      return;
    }

    const t = age / fx.durationMs;
    const alpha = 1 - t;
    const y = bounds.topPanelHeight / 2 - t * Math.max(14, bounds.topPanelHeight * 0.35);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${Math.round(scoreFontSize * 0.6)}px monospace`;
    ctx.fillStyle = fx.color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.text, 20 + Math.round(scoreFontSize * 3.4), y);
    ctx.restore();
  });

  // Buttons in top panel
  const buttonSize = bounds.topPanelHeight * 0.55;
  const buttonGap = 10;
  const buttonY = bounds.topPanelHeight / 2 - buttonSize / 2;
  
  // Right side buttons: Music, Sounds, Settings
  const rightButtonsX = w - (buttonSize + buttonGap) * 3 - 10;
  
  // Music button
  ctx.fillStyle = state.musicEnabled ? 'rgba(100,200,100,0.6)' : 'rgba(100,100,100,0.4)';
  ctx.fillRect(rightButtonsX, buttonY, buttonSize, buttonSize);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 2;
  ctx.strokeRect(rightButtonsX, buttonY, buttonSize, buttonSize);
  ctx.font = `${Math.round(buttonSize * 0.35)}px monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.9)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('♪', rightButtonsX + buttonSize / 2, buttonY + buttonSize / 2);
  
  // Sounds button
  const soundsX = rightButtonsX + buttonSize + buttonGap;
  ctx.fillStyle = state.soundsEnabled ? 'rgba(100,200,100,0.6)' : 'rgba(100,100,100,0.4)';
  ctx.fillRect(soundsX, buttonY, buttonSize, buttonSize);
  ctx.strokeRect(soundsX, buttonY, buttonSize, buttonSize);
  ctx.fillText('♫', soundsX + buttonSize / 2, buttonY + buttonSize / 2);
  
  // Settings button
  const settingsX = soundsX + buttonSize + buttonGap;
  ctx.fillStyle = 'rgba(100,100,100,0.4)';
  ctx.fillRect(settingsX, buttonY, buttonSize, buttonSize);
  ctx.strokeRect(settingsX, buttonY, buttonSize, buttonSize);
  ctx.font = `${Math.round(buttonSize * 0.25)}px monospace`;
  ctx.fillText('SET', settingsX + buttonSize / 2, buttonY + buttonSize / 2);
  
  // Finish button (left side, after score)
  if (state.phase === 'playing') {
    const finishX = 270;
    const finishWidth = buttonSize * 1.5;
    ctx.fillStyle = 'rgba(200,80,80,0.6)';
    ctx.fillRect(finishX, buttonY, finishWidth, buttonSize);
    ctx.strokeRect(finishX, buttonY, finishWidth, buttonSize);
    ctx.font = `${Math.round(buttonSize * 0.28)}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillText('FINISH', finishX + finishWidth / 2, buttonY + buttonSize / 2);
  }

  // Tetris zone highlight
  ctx.fillStyle = GAME_CONFIG.tetrisZoneHighlight;
  ctx.fillRect(grid.zoneLeft, bounds.top, grid.zoneWidth, bounds.height);

  ctx.strokeStyle = GAME_CONFIG.tetrisZoneStroke;
  ctx.lineWidth = 2;
  ctx.strokeRect(grid.zoneLeft, bounds.top, grid.zoneWidth, bounds.height);

  // Blocks (static)
  state.blocks.forEach((block) => {
    const blockX = grid.zoneLeft + block.x * grid.blockWidth;
    const blockY = bounds.top + block.y * grid.blockHeight;

    ctx.fillStyle = block.color;
    ctx.fillRect(blockX + 1, blockY + 1, grid.blockWidth - 2, grid.blockHeight - 2);

    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(blockX + 1, blockY + 1, grid.blockWidth - 2, grid.blockHeight - 2);
  });

  // Active tetromino
  if (state.activeTetromino) {
    state.activeTetromino.blocks.forEach((block) => {
      const blockX = grid.zoneLeft + block.x * grid.blockWidth;
      const blockY = bounds.top + block.y * grid.blockHeight;

      ctx.fillStyle = block.color;
      ctx.fillRect(blockX + 1, blockY + 1, grid.blockWidth - 2, grid.blockHeight - 2);

      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 2;
      ctx.strokeRect(blockX + 1, blockY + 1, grid.blockWidth - 2, grid.blockHeight - 2);
    });
  }

  // Paddles
  const leftPaddleX = bounds.left;
  const rightPaddleX = bounds.right - GAME_CONFIG.paddleWidth;
  
  ctx.fillStyle = GAME_CONFIG.leftPaddleColor;
  ctx.fillRect(leftPaddleX, state.leftPaddle.y, GAME_CONFIG.paddleWidth, state.leftPaddle.height);
  
  ctx.fillStyle = GAME_CONFIG.rightPaddleColor;
  ctx.fillRect(rightPaddleX, state.rightPaddle.y, GAME_CONFIG.paddleWidth, state.rightPaddle.height);

  // Ball trail
  for (let i = 0; i < state.ballTrail.length; i += 1) {
    const trailPos = state.ballTrail[i];
    const t = i / Math.max(1, state.ballTrail.length - 1);
    const opacity = GAME_CONFIG.ballTrailOpacityEnd + t * (GAME_CONFIG.ballTrailOpacityStart - GAME_CONFIG.ballTrailOpacityEnd);
    const radius = state.ball.radius * (0.5 + t * 0.5);

    ctx.beginPath();
    ctx.arc(trailPos.x, trailPos.y, radius, 0, Math.PI * 2);
    
    // Parse color and add opacity
    const color = state.ball.color;
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      ctx.fillStyle = `rgba(${r},${g},${b},${opacity})`;
    } else {
      ctx.fillStyle = `rgba(255,255,255,${opacity})`;
    }
    ctx.fill();
  }

  // Ball
  ctx.beginPath();
  ctx.arc(state.ball.pos.x, state.ball.pos.y, state.ball.radius, 0, Math.PI * 2);
  ctx.fillStyle = state.ball.color;
  ctx.fill();

  if (canShowBonusOffer(state, now) && state.bonusOffer) {
    const widget = getBonusWidgetRect(bounds, { zoneLeft: grid.zoneLeft, zoneRight: grid.zoneRight }, state.bonusOffer.side, h);
    const remaining = Math.max(0, state.bonusOffer.expiresAt - now);
    const ratio = remaining / GAME_CONFIG.bonusOfferLifetimeMs;
    const centerX = widget.x + widget.size / 2;
    const centerY = widget.y + widget.size / 2;

    ctx.fillStyle = 'rgba(20,20,20,0.75)';
    ctx.fillRect(widget.x, widget.y, widget.size, widget.size);
    ctx.strokeStyle = 'rgba(255,255,255,0.45)';
    ctx.lineWidth = 3;
    ctx.strokeRect(widget.x, widget.y, widget.size, widget.size);

    ctx.beginPath();
    ctx.arc(centerX, centerY, widget.size * 0.49, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * ratio);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.font = `bold ${Math.round(widget.size * 0.28)}px monospace`;
    ctx.fillStyle = state.bonusOffer.color;
    ctx.fillText(state.bonusOffer.kind === 'white-color' ? 'W' : '●', centerX, centerY - widget.size * 0.2);

    ctx.font = `bold ${Math.round(widget.size * 0.12)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${state.bonusOffer.cost} pts`, centerX, centerY + widget.size * 0.08);

    ctx.font = `${Math.round(widget.size * 0.1)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('dur: 0s', centerX, centerY + widget.size * 0.25);
  }

  if (state.phase === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    const bigFont = Math.round(h * 0.22);
    ctx.font = `bold ${bigFont}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.countdown > 0 ? String(state.countdown) : 'GO!', w / 2, h / 2);
  }

  if (state.phase === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(h * 0.1)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText('GAME OVER', w / 2, h * 0.44);

    ctx.font = `${Math.round(h * 0.045)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText('Press ENTER or tap to restart', w / 2, h * 0.56);
  }

  if (state.phase === 'finished') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(h * 0.08)}px monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('GAME FINISHED', w / 2, h * 0.35);

    ctx.font = `bold ${Math.round(h * 0.055)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`Session Score: ${state.sessionScore}`, w / 2, h * 0.48);

    const newTotal = state.totalScore + state.sessionScore;
    ctx.font = `bold ${Math.round(h * 0.045)}px monospace`;
    ctx.fillStyle = 'rgba(100,255,100,0.85)';
    ctx.fillText(`Total Score: ${newTotal}`, w / 2, h * 0.58);

    ctx.font = `${Math.round(h * 0.035)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('Tap or press ENTER to start new game', w / 2, h * 0.7);
  }

  if (state.phase === 'countdown' && state.paddleHitCount === 0) {
    const hintFont = Math.round(h * 0.03);
    ctx.font = `${hintFont}px monospace`;
    ctx.fillStyle = GAME_CONFIG.controlsHintColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText('Q/A - left paddle', bounds.left + GAME_CONFIG.paddleWidth + 12, bounds.bottom - 12);
    ctx.textAlign = 'right';
    ctx.fillText("]/' - right paddle | Hold LMB: sync", bounds.right - GAME_CONFIG.paddleWidth - 12, bounds.bottom - 12);
  }
}

function getCanvasDimensions(): { width: number; height: number; portrait: boolean } {
  const portrait = window.innerHeight > window.innerWidth;
  return {
    width: Math.max(window.innerWidth, window.innerHeight),
    height: Math.min(window.innerWidth, window.innerHeight),
    portrait,
  };
}

export default function PongGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<GameState | null>(null);
  const keysRef = useRef<Keys>({ q: false, a: false, bracketRight: false, quote: false });
  const touchRef = useRef<TouchControls>({ left: null, right: null });
  const mouseRef = useRef<MouseControls>({ active: false, y: null });
  const activeTouchesRef = useRef<Map<number, Side>>(new Map());
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const [portraitMode, setPortraitMode] = useState(false);
  
  // Audio system
  const musicRef = useRef<HTMLAudioElement[]>([]);
  const soundsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const currentMusicIndexRef = useRef<number>(0);

  // Load audio on mount
  useEffect(() => {
    // Load music tracks
    GAME_CONFIG.musicTracks.forEach((src) => {
      const audio = new Audio(src);
      audio.loop = false;
      audio.volume = 0.3;
      musicRef.current.push(audio);
    });

    // Setup music rotation
    const playNextMusic = () => {
      if (!stateRef.current?.musicEnabled) return;
      
      const tracks = musicRef.current;
      if (tracks.length === 0) return;
      
      currentMusicIndexRef.current = (currentMusicIndexRef.current + 1) % tracks.length;
      const nextTrack = tracks[currentMusicIndexRef.current];
      nextTrack.currentTime = 0;
      nextTrack.play().catch(() => {});
    };

    musicRef.current.forEach((track) => {
      track.addEventListener('ended', playNextMusic);
    });

    // Load sound effects
    Object.entries(GAME_CONFIG.sounds).forEach(([key, src]) => {
      const audio = new Audio(src);
      audio.volume = 0.5;
      soundsRef.current[key] = audio;
    });

    // Start first track
    setTimeout(() => {
      if (musicRef.current.length > 0 && stateRef.current?.musicEnabled) {
        musicRef.current[0].play().catch(() => {});
      }
    }, 500);

    return () => {
      musicRef.current.forEach((track) => {
        track.pause();
        track.remove();
      });
      Object.values(soundsRef.current).forEach((sound) => {
        sound.remove();
      });
    };
  }, []);

  const playSound = (soundKey: string) => {
    if (!stateRef.current?.soundsEnabled) return;
    const sound = soundsRef.current[soundKey];
    if (sound) {
      sound.currentTime = 0;
      sound.play().catch(() => {});
    }
  };

  const toggleMusic = () => {
    if (!stateRef.current) return;
    stateRef.current.musicEnabled = !stateRef.current.musicEnabled;
    
    if (stateRef.current.musicEnabled) {
      const currentTrack = musicRef.current[currentMusicIndexRef.current];
      if (currentTrack) {
        currentTrack.play().catch(() => {});
      }
    } else {
      musicRef.current.forEach(track => track.pause());
    }
  };

  const toggleSounds = () => {
    if (!stateRef.current) return;
    stateRef.current.soundsEnabled = !stateRef.current.soundsEnabled;
  };

  const finishGame = () => {
    if (!stateRef.current || stateRef.current.phase !== 'playing') return;
    stateRef.current.phase = 'finished';
    stateRef.current.sessionScore = stateRef.current.score;
    playSound('gameOver');
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas === null) {
      return;
    }
    const canvasEl: HTMLCanvasElement = canvas;

    const init = () => {
      const dims = getCanvasDimensions();
      canvasEl.width = dims.width;
      canvasEl.height = dims.height;
      setPortraitMode(dims.portrait);
      stateRef.current = makeInitialState(canvasEl.width, canvasEl.height);

      // Request fullscreen on mobile devices
      if ('ontouchstart' in window && document.documentElement.requestFullscreen) {
        const requestFS = () => {
          document.documentElement.requestFullscreen().catch(() => {
            // Fullscreen request failed, ignore
          });
          // Remove listener after first attempt
          canvasEl.removeEventListener('touchstart', requestFS);
        };
        canvasEl.addEventListener('touchstart', requestFS, { once: true });
      }
    };

    init();

    function loop(timestamp: number) {
      const ctx = canvasEl.getContext('2d');
      if (!ctx || !stateRef.current) {
        return;
      }

      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;

      stateRef.current = stepGame(
        stateRef.current,
        dt,
        canvasEl.width,
        canvasEl.height,
        keysRef.current,
        touchRef.current,
        mouseRef.current,
        playSound,
      );
      renderGame(ctx, stateRef.current);

      rafRef.current = requestAnimationFrame(loop);
    }

    const getGamePoint = (clientX: number, clientY: number): Vec2 => {
      const rect = canvasEl.getBoundingClientRect();
      if (!portraitMode) {
        return { x: clientX - rect.left, y: clientY - rect.top };
      }

      const xInElement = clientX - rect.left;
      const yInElement = clientY - rect.top;

      return {
        x: yInElement,
        y: rect.width - xInElement,
      };
    };

    const getGameY = (clientX: number, clientY: number): number => {
      const point = getGamePoint(clientX, clientY);
      return point.y;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'q':
        case 'Q':
          keysRef.current.q = true;
          e.preventDefault();
          break;
        case 'a':
        case 'A':
          keysRef.current.a = true;
          e.preventDefault();
          break;
        case ']':
          keysRef.current.bracketRight = true;
          e.preventDefault();
          break;
        case "'":
          keysRef.current.quote = true;
          e.preventDefault();
          break;
        case 'Enter':
          if (stateRef.current?.phase === 'gameover') {
            stateRef.current = makeInitialState(canvasEl.width, canvasEl.height);
          }
          break;
        case ' ':
        case 'Spacebar':
          if (stateRef.current) {
            tryPurchaseBonus(stateRef.current, performance.now(), playSound);
          }
          e.preventDefault();
          break;
        default:
          break;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'q':
        case 'Q':
          keysRef.current.q = false;
          break;
        case 'a':
        case 'A':
          keysRef.current.a = false;
          break;
        case ']':
          keysRef.current.bracketRight = false;
          break;
        case "'":
          keysRef.current.quote = false;
          break;
        default:
          break;
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) {
        return;
      }

      mouseRef.current.active = true;
      mouseRef.current.y = getGameY(e.clientX, e.clientY);
      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseRef.current.active) {
        return;
      }

      mouseRef.current.y = getGameY(e.clientX, e.clientY);
      e.preventDefault();
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) {
        return;
      }

      mouseRef.current.active = false;
      mouseRef.current.y = null;
    };

    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const state = stateRef.current;
      
      if (state?.phase === 'gameover' || state?.phase === 'finished') {
        stateRef.current = makeInitialState(
          canvasEl.width,
          canvasEl.height,
          state.phase === 'finished',
          state.totalScore + state.sessionScore,
          state.musicEnabled,
          state.soundsEnabled
        );
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const touch = e.changedTouches[i];
        const point = getGamePoint(touch.clientX, touch.clientY);

        if (!state) continue;

        const bounds = getBounds(canvasEl.width, canvasEl.height);
        const grid = getGridDimensions(canvasEl.width, canvasEl.height);
        
        // Check button clicks in top panel
        if (point.y < bounds.topPanelHeight) {
          const buttonSize = bounds.topPanelHeight * 0.55;
          const buttonGap = 10;
          const buttonY = bounds.topPanelHeight / 2 - buttonSize / 2;
          const rightButtonsX = canvasEl.width - (buttonSize + buttonGap) * 3 - 10;
          
          // Music button
          if (point.x >= rightButtonsX && point.x <= rightButtonsX + buttonSize &&
              point.y >= buttonY && point.y <= buttonY + buttonSize) {
            toggleMusic();
            continue;
          }
          
          // Sounds button
          const soundsX = rightButtonsX + buttonSize + buttonGap;
          if (point.x >= soundsX && point.x <= soundsX + buttonSize &&
              point.y >= buttonY && point.y <= buttonY + buttonSize) {
            toggleSounds();
            continue;
          }
          
          // Finish button
          if (state.phase === 'playing') {
            const finishX = 270;
            const finishWidth = buttonSize * 1.5;
            if (point.x >= finishX && point.x <= finishX + finishWidth &&
                point.y >= buttonY && point.y <= buttonY + buttonSize) {
              finishGame();
              continue;
            }
          }
          
          // Ignore other clicks in top panel
          continue;
        }

        if (state && canShowBonusOffer(state, performance.now()) && state.bonusOffer) {
          const rect = getBonusWidgetRect(
            bounds,
            { zoneLeft: grid.zoneLeft, zoneRight: grid.zoneRight },
            state.bonusOffer.side,
            canvasEl.height,
          );
          const insideWidget = point.x >= rect.x
            && point.x <= rect.x + rect.size
            && point.y >= rect.y
            && point.y <= rect.y + rect.size;

          if (insideWidget) {
            tryPurchaseBonus(state, performance.now(), playSound);
            continue;
          }
        }

        // Determine which paddle was tapped (touch must be within paddle area +50% tolerance)
        const leftPaddleX = bounds.left;
        const rightPaddleX = bounds.right - GAME_CONFIG.paddleWidth;
        const paddleTolerance = state.leftPaddle.height * 0.5;
        
        let side: Side | null = null;
        
        // Check left paddle area
        const leftPaddleCenterY = state.leftPaddle.y + state.leftPaddle.height / 2;
        const inLeftPaddleX = point.x >= leftPaddleX && point.x <= leftPaddleX + GAME_CONFIG.paddleWidth * 1.5;
        const inLeftPaddleY = Math.abs(point.y - leftPaddleCenterY) <= state.leftPaddle.height / 2 + paddleTolerance;
        
        if (inLeftPaddleX && inLeftPaddleY) {
          side = 'left';
        }
        
        // Check right paddle area
        const rightPaddleCenterY = state.rightPaddle.y + state.rightPaddle.height / 2;
        const inRightPaddleX = point.x >= rightPaddleX - GAME_CONFIG.paddleWidth * 0.5 && point.x <= bounds.right;
        const inRightPaddleY = Math.abs(point.y - rightPaddleCenterY) <= state.rightPaddle.height / 2 + paddleTolerance;
        
        if (inRightPaddleX && inRightPaddleY) {
          side = 'right';
        }
        
        if (side === null) {
          continue;
        }

        activeTouchesRef.current.set(touch.identifier, side);

        const y = point.y;
        if (side === 'left') {
          touchRef.current.left = y;
        } else {
          touchRef.current.right = y;
        }
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const touch = e.changedTouches[i];
        const side = activeTouchesRef.current.get(touch.identifier);
        const y = getGameY(touch.clientX, touch.clientY);

        if (side === 'left') {
          touchRef.current.left = y;
        } else if (side === 'right') {
          touchRef.current.right = y;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      e.preventDefault();
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const touch = e.changedTouches[i];
        const side = activeTouchesRef.current.get(touch.identifier);
        activeTouchesRef.current.delete(touch.identifier);

        const hasSideTouch = Array.from(activeTouchesRef.current.values()).includes(side as Side);
        if (!hasSideTouch) {
          if (side === 'left') {
            touchRef.current.left = null;
          }
          if (side === 'right') {
            touchRef.current.right = null;
          }
        }
      }
    };

    const handleResize = () => {
      const dims = getCanvasDimensions();
      const prevW = canvasEl.width;
      const prevH = canvasEl.height;
      canvasEl.width = dims.width;
      canvasEl.height = dims.height;
      setPortraitMode(dims.portrait);

      if (!stateRef.current) {
        stateRef.current = makeInitialState(canvasEl.width, canvasEl.height);
        return;
      }

      const s = stateRef.current;
      const prevBounds = getBounds(prevW, prevH);
      const nextBounds = getBounds(canvasEl.width, canvasEl.height);
      const prevPaddleSpace = Math.max(1, prevBounds.height - s.leftPaddle.height);
      const leftRatio = (s.leftPaddle.y - prevBounds.top) / prevPaddleSpace;
      const rightRatio = (s.rightPaddle.y - prevBounds.top) / prevPaddleSpace;

      s.leftPaddle.height = nextBounds.height * GAME_CONFIG.paddleHeightRatio;
      s.rightPaddle.height = nextBounds.height * GAME_CONFIG.paddleHeightRatio;

      s.leftPaddle.y = nextBounds.top + leftRatio * Math.max(0, nextBounds.height - s.leftPaddle.height);
      s.rightPaddle.y = nextBounds.top + rightRatio * Math.max(0, nextBounds.height - s.rightPaddle.height);

      s.ball.radius = Math.min(nextBounds.width, nextBounds.height) * GAME_CONFIG.ballRadiusRatio;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);

    canvasEl.addEventListener('mousedown', handleMouseDown);
    canvasEl.addEventListener('mousemove', handleMouseMove);
    canvasEl.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvasEl.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvasEl.addEventListener('touchend', handleTouchEnd, { passive: false });
    canvasEl.addEventListener('touchcancel', handleTouchEnd, { passive: false });

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);

      canvasEl.removeEventListener('mousedown', handleMouseDown);
      canvasEl.removeEventListener('mousemove', handleMouseMove);
      canvasEl.removeEventListener('touchstart', handleTouchStart);
      canvasEl.removeEventListener('touchmove', handleTouchMove);
      canvasEl.removeEventListener('touchend', handleTouchEnd);
      canvasEl.removeEventListener('touchcancel', handleTouchEnd);

      cancelAnimationFrame(rafRef.current);
    };
  }, [portraitMode]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        touchAction: 'none',
        position: 'fixed',
        left: '50%',
        top: '50%',
        transform: portraitMode
          ? 'translate(-50%, -50%) rotate(90deg)'
          : 'translate(-50%, -50%)',
        width: portraitMode ? '100vh' : '100vw',
        height: portraitMode ? '100vw' : '100vh',
      }}
    />
  );
}
