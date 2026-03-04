import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';

interface Vec2 { x: number; y: number }
interface Ball { pos: Vec2; vel: Vec2; radius: number; color: string }
interface Paddle { y: number; dy: number; height: number }
interface Block { x: number; y: number; color: string; pieceId: number }
interface ActiveTetromino { id: number; blocks: Block[]; paddleHitsSinceLastFall: number }

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
type Phase = 'countdown' | 'playing' | 'gameover';
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

function makeInitialState(w: number, h: number): GameState {
  const bounds = getBounds(w, h);
  const paddleHeight = bounds.height * GAME_CONFIG.paddleHeightRatio;
  const centerPaddleY = bounds.top + bounds.height / 2 - paddleHeight / 2;

  return {
    ball: makeBall(w, h),
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

function getRandomBonusOffer(side: Side, now: number): BonusOffer {
  const options: BonusOffer[] = [
    {
      kind: 'palette-color',
      color: getRandomBlockColor(),
      cost: GAME_CONFIG.bonusColorCost,
      effectDurationMs: 0,
      side,
      spawnedAt: now,
      expiresAt: now + GAME_CONFIG.bonusOfferLifetimeMs,
    },
    {
      kind: 'white-color',
      color: GAME_CONFIG.ballWhiteColor,
      cost: GAME_CONFIG.bonusWhiteCost,
      effectDurationMs: 0,
      side,
      spawnedAt: now,
      expiresAt: now + GAME_CONFIG.bonusOfferLifetimeMs,
    },
  ];

  return options[Math.floor(Math.random() * options.length)];
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
  };

  const bounds = getBounds(w, h);
  const grid = getGridDimensions(w, h);
  const paddleSpeed = bounds.height * GAME_CONFIG.paddleSpeedRatio;

  if (s.phase === 'countdown') {
    s.phaseTimer += dt;
    if (s.phaseTimer >= 1000) {
      s.phaseTimer = 0;
      s.countdown -= 1;
      if (s.countdown < 0) {
        s.phase = 'playing';
      }
    }
    updatePaddles(s, keys, touch, mouse, paddleSpeed, bounds);
    return s;
  }

  if (s.phase === 'gameover') {
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
  }
  if (s.ball.pos.y + s.ball.radius > bounds.bottom) {
    s.ball.pos.y = bounds.bottom - s.ball.radius;
    s.ball.vel.y = -Math.abs(s.ball.vel.y);
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
  const bonusSide: Side = ballSide === 'left' ? 'right' : 'left';

  if (s.bonusOffer) {
    if (now >= s.bonusOffer.expiresAt) {
      s.bonusOffer = null;
      s.lastBonusSpawnAt = now;
    } else if (s.bonusOffer.side !== bonusSide) {
      s.bonusOffer = { ...s.bonusOffer, side: bonusSide };
    }
  }

  if (!s.bonusOffer && now - s.lastBonusSpawnAt >= GAME_CONFIG.bonusOfferIntervalMs) {
    s.bonusOffer = getRandomBonusOffer(bonusSide, now);
    s.lastBonusSpawnAt = now;
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
      return;
    }

    // Reflect ball and push it away from block to prevent sticking
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
    }
    s.lastOuterSide = newOuterSide;
  }

  if (s.ball.pos.x + s.ball.radius < bounds.left || s.ball.pos.x - s.ball.radius > bounds.right) {
    s.phase = 'gameover';
    s.countdown = GAME_CONFIG.countdownSeconds;
    s.phaseTimer = 0;
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
  ctx.fillStyle = GAME_CONFIG.panelBackgroundColor;
  ctx.fillRect(0, 0, w, bounds.topPanelHeight);
  ctx.strokeStyle = GAME_CONFIG.panelBorderColor;
  ctx.lineWidth = 1;
  ctx.strokeRect(0, bounds.topPanelHeight - 1, w, 1);

  // Score in top panel (left side)
  const scoreFontSize = Math.round(bounds.topPanelHeight * 0.5);
  ctx.font = `bold ${scoreFontSize}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`SCORE: ${state.score}`, 20, bounds.topPanelHeight / 2);

  // Settings button in top panel (right side)
  const buttonWidth = 100;
  const buttonHeight = bounds.topPanelHeight * 0.6;
  const buttonX = w - buttonWidth - 20;
  const buttonY = bounds.topPanelHeight / 2 - buttonHeight / 2;

  ctx.fillStyle = 'rgba(100,100,100,0.4)';
  ctx.fillRect(buttonX, buttonY, buttonWidth, buttonHeight);
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.strokeRect(buttonX, buttonY, buttonWidth, buttonHeight);

  const buttonFontSize = Math.round(buttonHeight * 0.4);
  ctx.font = `${buttonFontSize}px monospace`;
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SETTINGS', buttonX + buttonWidth / 2, buttonY + buttonHeight / 2);

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
  ctx.fillStyle = '#fff';
  const leftPaddleX = bounds.left;
  const rightPaddleX = bounds.right - GAME_CONFIG.paddleWidth;
  ctx.fillRect(leftPaddleX, state.leftPaddle.y, GAME_CONFIG.paddleWidth, state.leftPaddle.height);
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

  if (state.bonusOffer && state.phase === 'playing') {
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
      if (stateRef.current?.phase === 'gameover') {
        stateRef.current = makeInitialState(canvasEl.width, canvasEl.height);
        return;
      }

      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const touch = e.changedTouches[i];
        const state = stateRef.current;
        const point = getGamePoint(touch.clientX, touch.clientY);

        if (state?.phase === 'playing' && state.bonusOffer) {
          const bounds = getBounds(canvasEl.width, canvasEl.height);
          const grid = getGridDimensions(canvasEl.width, canvasEl.height);
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
            if (state.score >= state.bonusOffer.cost) {
              state.score -= state.bonusOffer.cost;
              state.ball.color = state.bonusOffer.color;
              state.bonusOffer = null;
              state.lastBonusSpawnAt = performance.now();
            }
            continue;
          }
        }

        const side: Side = point.x < canvasEl.width / 2 ? 'left' : 'right';
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
