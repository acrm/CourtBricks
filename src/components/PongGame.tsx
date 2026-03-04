import { useEffect, useRef, useState } from 'react';
import { GAME_CONFIG } from '../config/gameConfig';
import i18n from '../i18n';
import musicIconUrl from '@fortawesome/fontawesome-free/svgs/solid/music.svg';
import circleXmarkIconUrl from '@fortawesome/fontawesome-free/svgs/solid/circle-xmark.svg';
import volumeHighIconUrl from '@fortawesome/fontawesome-free/svgs/solid/volume-high.svg';
import volumeXmarkIconUrl from '@fortawesome/fontawesome-free/svgs/solid/volume-xmark.svg';
import gearIconUrl from '@fortawesome/fontawesome-free/svgs/solid/gear.svg';
import flagCheckeredIconUrl from '@fortawesome/fontawesome-free/svgs/solid/flag-checkered.svg';

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
  x?: number;
  y?: number;
  sizeScale?: number;
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
type Phase = 'mode-select' | 'countdown' | 'playing' | 'paused' | 'gameover' | 'finished';
type GameMode = 'endless' | '1min' | '3min' | '5min';
type BonusKind = 'palette-color' | 'white-color';

interface GameSession {
  mode: GameMode;
  score: number;
  timestamp: number;
  duration?: number;
}

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
  musicVolume: number;
  soundsVolume: number;
  autoPauseEnabled: boolean;
  language: 'ru' | 'en';
  showSettings: boolean;
  lastPaddleTouchAt: number;
  gameMode: GameMode;
  modeTimeMs: number;
  sessions: GameSession[];
  playStartTime?: number;
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

interface CircularButton {
  cx: number;
  cy: number;
  r: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface SettingsLayout {
  modal: Rect;
  close: Rect;
  rows: {
    musicVolume: number;
    soundsVolume: number;
    musicEnabled: number;
    soundsEnabled: number;
    autoPause: number;
    language: number;
  };
  labelX: number;
  valueX: number;
  valueWidth: number;
  rowHeight: number;
  titleY: number;
  hintY: number;
  controls: {
    musicMinus: Rect;
    musicPlus: Rect;
    soundsMinus: Rect;
    soundsPlus: Rect;
    musicToggle: Rect;
    soundsToggle: Rect;
    autoPauseToggle: Rect;
    langRu: Rect;
    langEn: Rect;
  };
}

interface TopPanelButtons {
  finish: CircularButton | null;
  music: CircularButton;
  sounds: CircularButton;
  settings: CircularButton;
}

type UiIconKey = 'musicOn' | 'musicOff' | 'soundsOn' | 'soundsOff' | 'settings' | 'finish';
type UiIcons = Partial<Record<UiIconKey, HTMLImageElement>>;
type BonusIconKey = 'red' | 'blue' | 'green' | 'yellow' | 'orange' | 'white';
type BonusIcons = Partial<Record<BonusIconKey, HTMLImageElement>>;

const TOTAL_SCORE_STORAGE_KEY = 'courtbricks.totalScore';
const SESSIONS_STORAGE_KEY = 'courtbricks.sessions';

function loadTotalScoreFromStorage(): number {
  if (typeof window === 'undefined') {
    return 0;
  }

  try {
    const rawValue = window.localStorage.getItem(TOTAL_SCORE_STORAGE_KEY);
    if (rawValue === null) {
      return 0;
    }
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed) || parsed < 0) {
      return 0;
    }
    return Math.floor(parsed);
  } catch {
    return 0;
  }
}

function loadSessionsFromStorage(): GameSession[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const rawValue = window.localStorage.getItem(SESSIONS_STORAGE_KEY);
    if (rawValue === null) {
      return [];
    }
    const parsed = JSON.parse(rawValue);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (s): s is GameSession =>
        s &&
        typeof s === 'object' &&
        ['endless', '1min', '3min', '5min'].includes(s.mode) &&
        typeof s.score === 'number' &&
        typeof s.timestamp === 'number' &&
        s.score >= 0 &&
        s.timestamp >= 0,
    );
  } catch {
    return [];
  }
}

function saveTotalScoreToStorage(totalScore: number): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(TOTAL_SCORE_STORAGE_KEY, String(Math.max(0, Math.floor(totalScore))));
  } catch {
    // Ignore storage failures
  }
}

function saveSessionsToStorage(sessions: GameSession[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sessions));
  } catch {
    // Ignore storage failures
  }
}

function finalizeRoundScore(state: GameState): void {
  const roundScore = Math.max(0, Math.floor(state.score));
  state.sessionScore = roundScore;
  state.totalScore += roundScore;
  saveTotalScoreToStorage(state.totalScore);
  
  // Calculate duration in milliseconds
  const duration = state.playStartTime !== undefined 
    ? Math.floor(performance.now() - state.playStartTime)
    : undefined;
  
  // Save session to history
  state.sessions.push({
    mode: state.gameMode,
    score: roundScore,
    timestamp: Date.now(),
    duration,
  });
  saveSessionsToStorage(state.sessions);
}

function selectGameMode(state: GameState, mode: GameMode): GameState {
  const modeTimeMap: Record<GameMode, number> = {
    endless: 0,
    '1min': 60000,
    '3min': 180000,
    '5min': 300000,
  };
  
  state.gameMode = mode;
  state.modeTimeMs = modeTimeMap[mode];
  state.phase = 'countdown';
  state.countdown = GAME_CONFIG.countdownSeconds;
  state.phaseTimer = 0;
  state.score = 0;
  state.blocks = [];
  state.activeTetromino = null;
  state.ballTrail = [];
  
  return state;
}

function startNewRoundFromCurrentState(
  prevState: GameState,
  width: number,
  height: number,
): GameState {
  const nextState = makeInitialState(width, height, prevState);
  return selectGameMode(nextState, prevState.gameMode);
}

function formatModeTimer(modeTimeMs: number): string {
  const totalSeconds = Math.max(0, Math.ceil(modeTimeMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function getEndScreenButtons(width: number, height: number): { newGame: Rect; mainMenu: Rect } {
  const buttonWidth = Math.min(320, width * 0.34);
  const buttonHeight = Math.min(74, Math.max(44, height * 0.1));
  const gap = Math.max(16, width * 0.035);
  const totalWidth = buttonWidth * 2 + gap;
  const startX = (width - totalWidth) / 2;
  const y = height * 0.73;

  return {
    newGame: { x: startX, y, w: buttonWidth, h: buttonHeight },
    mainMenu: { x: startX + buttonWidth + gap, y, w: buttonWidth, h: buttonHeight },
  };
}

function resolvePublicAssetPath(path: string): string {
  const normalized = path.replace(/^\/+/, '');
  const base = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  return `${base}${normalized}`;
}

function getTopPanelButtons(
  width: number,
  bounds: Bounds,
  showFinishButton: boolean,
  panelPadding: number,
): TopPanelButtons {
  const radius = Math.max(16, bounds.topPanelHeight * 0.46);
  const cy = bounds.topPanelHeight / 2;
  const gap = Math.max(8, radius * 0.35);

  const settingsCx = width - panelPadding - radius;
  const soundsCx = settingsCx - (radius * 2 + gap);
  const musicCx = soundsCx - (radius * 2 + gap);

  const scoreLabel = `${i18n.t('score')}: 999`;
  const estimatedCharWidth = Math.max(8, bounds.topPanelHeight * 0.24);
  const estimatedScoreWidth = scoreLabel.length * estimatedCharWidth;
  const finishDesiredCx = panelPadding + estimatedScoreWidth + radius + Math.max(14, radius * 0.8);
  const finishMaxCx = musicCx - (radius * 2 + gap);
  const finishCx = Math.max(panelPadding + radius, Math.min(finishDesiredCx, finishMaxCx));

  return {
    finish: showFinishButton
      ? { cx: finishCx, cy, r: radius }
      : null,
    music: { cx: musicCx, cy, r: radius },
    sounds: { cx: soundsCx, cy, r: radius },
    settings: { cx: settingsCx, cy, r: radius },
  };
}

function isPointInCircle(x: number, y: number, button: CircularButton): boolean {
  const dx = x - button.cx;
  const dy = y - button.cy;
  return dx * dx + dy * dy <= button.r * button.r;
}

function isPointInRect(x: number, y: number, rect: Rect): boolean {
  return x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;
}

function clampVolume(value: number): number {
  return Math.max(0, Math.min(1, Math.round(value * 10) / 10));
}

function getSettingsLayout(w: number, h: number): SettingsLayout {
  const modalWidth = Math.min(w * 0.82, 760);
  const modalHeight = Math.min(h * 0.82, 560);
  const modalX = (w - modalWidth) / 2;
  const modalY = (h - modalHeight) / 2;

  const padding = Math.max(14, modalWidth * 0.055);
  const titleHeight = Math.max(34, modalHeight * 0.14);
  const rowCount = 6;
  const rowGap = Math.max(8, modalHeight * 0.018);
  const hintHeight = Math.max(22, modalHeight * 0.08);

  const contentTop = modalY + padding + titleHeight;
  const contentBottom = modalY + modalHeight - padding - hintHeight;
  const totalGapsHeight = rowGap * (rowCount - 1);
  const rowHeight = Math.max(30, Math.min(56, (contentBottom - contentTop - totalGapsHeight) / rowCount));

  const labelX = modalX + padding;
  const valueX = modalX + modalWidth * 0.56;
  const valueRight = modalX + modalWidth - padding;
  const valueWidth = Math.max(120, valueRight - valueX);

  const squareButton = Math.max(28, Math.min(rowHeight * 0.85, 42));
  const toggleHeight = Math.max(28, Math.min(rowHeight * 0.86, 42));
  const toggleWidth = Math.max(110, Math.min(170, valueWidth));
  const toggleX = valueRight - toggleWidth;
  const closeSize = Math.max(26, Math.min(38, titleHeight * 0.6));

  const getRowY = (index: number): number => contentTop + index * (rowHeight + rowGap);

  const musicVolumeY = getRowY(0);
  const soundsVolumeY = getRowY(1);
  const musicEnabledY = getRowY(2);
  const soundsEnabledY = getRowY(3);
  const autoPauseY = getRowY(4);
  const languageY = getRowY(5);

  const volumeButtonY = (rowY: number) => rowY + (rowHeight - squareButton) / 2;
  const toggleY = (rowY: number) => rowY + (rowHeight - toggleHeight) / 2;
  const langGap = 8;
  const langButtonWidth = Math.max(50, (valueWidth - langGap) / 2);

  return {
    modal: { x: modalX, y: modalY, w: modalWidth, h: modalHeight },
    close: {
      x: modalX + modalWidth - padding - closeSize,
      y: modalY + Math.max(8, padding * 0.45),
      w: closeSize,
      h: closeSize,
    },
    rows: {
      musicVolume: musicVolumeY,
      soundsVolume: soundsVolumeY,
      musicEnabled: musicEnabledY,
      soundsEnabled: soundsEnabledY,
      autoPause: autoPauseY,
      language: languageY,
    },
    labelX,
    valueX,
    valueWidth,
    rowHeight,
    titleY: modalY + Math.max(10, padding * 0.55),
    hintY: modalY + modalHeight - Math.max(12, padding * 0.7) - hintHeight / 2,
    controls: {
      musicMinus: { x: valueX, y: volumeButtonY(musicVolumeY), w: squareButton, h: squareButton },
      musicPlus: { x: valueRight - squareButton, y: volumeButtonY(musicVolumeY), w: squareButton, h: squareButton },
      soundsMinus: { x: valueX, y: volumeButtonY(soundsVolumeY), w: squareButton, h: squareButton },
      soundsPlus: { x: valueRight - squareButton, y: volumeButtonY(soundsVolumeY), w: squareButton, h: squareButton },
      musicToggle: { x: toggleX, y: toggleY(musicEnabledY), w: toggleWidth, h: toggleHeight },
      soundsToggle: { x: toggleX, y: toggleY(soundsEnabledY), w: toggleWidth, h: toggleHeight },
      autoPauseToggle: { x: toggleX, y: toggleY(autoPauseY), w: toggleWidth, h: toggleHeight },
      langRu: { x: valueX, y: toggleY(languageY), w: langButtonWidth, h: toggleHeight },
      langEn: { x: valueX + langButtonWidth + langGap, y: toggleY(languageY), w: langButtonWidth, h: toggleHeight },
    },
  };
}

function handleSettingsInteraction(state: GameState, point: Vec2, w: number, h: number): boolean {
  if (!state.showSettings) {
    return false;
  }

  const layout = getSettingsLayout(w, h);
  const controls = layout.controls;

  if (!isPointInRect(point.x, point.y, layout.modal)) {
    state.showSettings = false;
    return true;
  }

  if (isPointInRect(point.x, point.y, layout.close)) {
    state.showSettings = false;
    return true;
  }

  if (isPointInRect(point.x, point.y, controls.musicMinus)) {
    state.musicVolume = clampVolume(state.musicVolume - 0.1);
    return true;
  }
  if (isPointInRect(point.x, point.y, controls.musicPlus)) {
    state.musicVolume = clampVolume(state.musicVolume + 0.1);
    return true;
  }

  if (isPointInRect(point.x, point.y, controls.soundsMinus)) {
    state.soundsVolume = clampVolume(state.soundsVolume - 0.1);
    return true;
  }
  if (isPointInRect(point.x, point.y, controls.soundsPlus)) {
    state.soundsVolume = clampVolume(state.soundsVolume + 0.1);
    return true;
  }

  if (isPointInRect(point.x, point.y, controls.musicToggle)) {
    state.musicEnabled = !state.musicEnabled;
    return true;
  }
  if (isPointInRect(point.x, point.y, controls.soundsToggle)) {
    state.soundsEnabled = !state.soundsEnabled;
    return true;
  }
  if (isPointInRect(point.x, point.y, controls.autoPauseToggle)) {
    state.autoPauseEnabled = !state.autoPauseEnabled;
    return true;
  }

  if (isPointInRect(point.x, point.y, controls.langRu)) {
    state.language = 'ru';
    void i18n.changeLanguage('ru');
    return true;
  }
  if (isPointInRect(point.x, point.y, controls.langEn)) {
    state.language = 'en';
    void i18n.changeLanguage('en');
    return true;
  }

  return true;
}

function getBounds(w: number, h: number, isMobile: boolean = false): Bounds {
  const topPanelHeight = Math.max(h * GAME_CONFIG.topPanelRatio, 50);
  const sideMargin = Math.max(
    w * GAME_CONFIG.sideMarginRatio,
    GAME_CONFIG.paddleWidth,
  );
  const bottomMargin = isMobile ? GAME_CONFIG.mobileBottomMargin : 0;

  return {
    left: sideMargin,
    right: w - sideMargin,
    top: topPanelHeight,
    bottom: h - bottomMargin,
    width: w - sideMargin * 2,
    height: h - topPanelHeight - bottomMargin,
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

function getColorIcon(color: string): BonusIconKey {
  // Map hex colors to bonus icon keys
  // blockColors: ['#FF1744' (red), '#F57C00' (orange), '#FBC02D' (yellow), '#388E3C' (green), '#0277BD' (blue)]
  const colorMap: Record<string, BonusIconKey> = {
    '#FF1744': 'red',
    '#F57C00': 'orange',
    '#FBC02D': 'yellow',
    '#388E3C': 'green',
    '#0277BD': 'blue',
  };
  return colorMap[color] ?? 'red';
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

function makeInitialState(
  w: number,
  h: number,
  prevState?: Partial<GameState>,
): GameState {
  const bounds = getBounds(w, h);
  const paddleHeight = bounds.height * GAME_CONFIG.paddleHeightRatio;
  const centerPaddleY = bounds.top + bounds.height / 2 - paddleHeight / 2;
  const ball = makeBall(w, h);
  const grid = getGridDimensions(w, h);
  const now = performance.now();
  const currentBallSide = getBallSide(ball.pos.x, grid.zoneLeft, grid.zoneRight);
  const totalScore = prevState?.totalScore ?? loadTotalScoreFromStorage();
  const sessions = prevState?.sessions ?? loadSessionsFromStorage();

  return {
    ball,
    leftPaddle: { y: centerPaddleY, dy: 0, height: paddleHeight },
    rightPaddle: { y: centerPaddleY, dy: 0, height: paddleHeight },
    phase: 'mode-select',
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
    totalScore,
    sessionScore: 0,
    musicEnabled: prevState?.musicEnabled ?? true,
    soundsEnabled: prevState?.soundsEnabled ?? true,
    musicVolume: prevState?.musicVolume ?? 1.0,
    soundsVolume: prevState?.soundsVolume ?? 1.0,
    autoPauseEnabled: prevState?.autoPauseEnabled ?? false,
    language: prevState?.language ?? 'ru',
    showSettings: false,
    lastPaddleTouchAt: now,
    gameMode: prevState?.gameMode ?? 'endless',
    modeTimeMs: 0,
    sessions,
    playStartTime: undefined,
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

function pushScoreFx(
  state: GameState,
  delta: number,
  now: number,
  options?: { x?: number; y?: number; sizeScale?: number },
): void {
  const color = delta >= 0 ? 'rgb(80, 235, 120)' : 'rgb(255, 95, 95)';
  const text = delta >= 0 ? `+${delta}` : `${delta}`;

  state.scoreFx.push({
    id: state.nextScoreFxId,
    delta,
    text,
    color,
    startedAt: now,
    durationMs: GAME_CONFIG.scoreFxDurationMs,
    x: options?.x,
    y: options?.y,
    sizeScale: options?.sizeScale,
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
  canvasHeight: number,
): {
  x: number;
  y: number;
  size: number;
} {
  // Icon size is half screen height
  const size = canvasHeight * 0.5;
  
  // Center vertically in the game area
  const y = bounds.top + (bounds.height - size) / 2;
  
  // Center horizontally in the tetris zone
  const zoneCenterX = (grid.zoneLeft + grid.zoneRight) / 2;

  return {
    x: zoneCenterX - size / 2,
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
  isMobile: boolean,
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

  // On mobile, sync paddles
  const syncPaddles = isMobile;

  if (touch.left !== null) {
    // Invert Y for real mobile devices (portrait mode rotation causes inversion)
    const targetY = touch.left - state.leftPaddle.height / 2;
    const diff = targetY - state.leftPaddle.y;
    state.leftPaddle.dy = Math.sign(diff) * Math.min(Math.abs(diff), paddleSpeed * 4);
    if (syncPaddles) {
      state.rightPaddle.dy = state.leftPaddle.dy;
    }
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
    if (syncPaddles) {
      state.leftPaddle.dy = state.rightPaddle.dy;
    }
  } else if (keys.bracketRight) {
    state.rightPaddle.dy = -paddleSpeed;
  } else if (keys.quote) {
    state.rightPaddle.dy = paddleSpeed;
  } else {
    if (!syncPaddles || touch.left === null) {
      state.rightPaddle.dy = 0;
    }
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
  isMobile: boolean,
  hasActivePaddleTouch: boolean,
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

  const bounds = getBounds(w, h, isMobile);
  const grid = getGridDimensions(w, h);
  const paddleSpeed = bounds.height * GAME_CONFIG.paddleSpeedRatio;

  // Mode selection screen - don't update game, just return
  if (s.phase === 'mode-select') {
    return s;
  }

  if (s.phase === 'countdown') {
    s.phaseTimer += dt;
    if (s.phaseTimer >= 500) {
      s.phaseTimer = 0;
      s.countdown -= 1;
      if (s.countdown >= 0) {
        playSound('countdownTick');
      }
      if (s.countdown < 0) {
        s.phase = 'playing';
        s.playStartTime = now;
      }
    }
    updatePaddles(s, keys, touch, mouse, paddleSpeed, bounds, isMobile);
    return s;
  }

  if (s.phase === 'paused') {
    return s;
  }

  if (s.showSettings) {
    return s;
  }

  if (s.phase === 'gameover' || s.phase === 'finished') {
    updatePaddles(s, keys, touch, mouse, paddleSpeed, bounds, isMobile);
    return s;
  }

  if (isMobile && s.autoPauseEnabled) {
    const hasTapLikeInput = hasActivePaddleTouch
      || touch.left !== null
      || touch.right !== null
      || mouse.active;

    if (hasTapLikeInput) {
      s.lastPaddleTouchAt = now;
    } else if (now - s.lastPaddleTouchAt > GAME_CONFIG.mobileAutoPauseDelayMs) {
      s.phase = 'paused';
      return s;
    }
  }

  updatePaddles(s, keys, touch, mouse, paddleSpeed, bounds, isMobile);

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
      pushScoreFx(s, 1, now, {
        x: s.ball.pos.x,
        y: s.ball.pos.y - s.ball.radius * 1.6,
        sizeScale: 2.1,
      });
      playSound('scoreGain');
    }
    s.lastOuterSide = newOuterSide;
  }

  // Update game mode timer
  if (s.gameMode !== 'endless') {
    // Timed modes: countdown
    if (s.modeTimeMs > 0) {
      s.modeTimeMs -= dt;
      if (s.modeTimeMs <= 0) {
        finalizeRoundScore(s);
        s.phase = 'finished';
        s.countdown = GAME_CONFIG.countdownSeconds;
        s.phaseTimer = 0;
        playSound('gameOver');
      }
    }
  } else {
    // Endless mode: count up
    s.modeTimeMs += dt;
  }

  if (s.ball.pos.x + s.ball.radius < bounds.left || s.ball.pos.x - s.ball.radius > bounds.right) {
    finalizeRoundScore(s);
    s.phase = 'gameover';
    s.countdown = GAME_CONFIG.countdownSeconds;
    s.phaseTimer = 0;
    playSound('gameOver');
  }

  return s;
}

function renderGame(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  uiIcons: UiIcons,
  isMobile: boolean = false,
  bonusIcons?: BonusIcons,
): void {
  const { width: w, height: h } = ctx.canvas;
  const now = performance.now();
  const bounds = getBounds(w, h, isMobile);
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

  const panelPadding = Math.max(bounds.sideMargin, GAME_CONFIG.paddleWidth);

  // Score in top panel (left side)
  const scoreFontSize = Math.round(bounds.topPanelHeight * 0.5);
  const scoreLabel = `${i18n.t('score')}: ${state.score}`;
  ctx.font = `bold ${scoreFontSize}px monospace`;
  ctx.fillStyle = 'rgba(0,0,0,0.8)';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(scoreLabel, panelPadding, bounds.topPanelHeight / 2);

  // Score change animation (+/-)
  state.scoreFx.forEach((fx) => {
    const age = now - fx.startedAt;
    if (age < 0 || age > fx.durationMs) {
      return;
    }

    const t = age / fx.durationMs;
    const alpha = 1 - t;
    const rise = t * Math.max(18, scoreFontSize * 0.7);
    const x = fx.x ?? (panelPadding + Math.round(scoreFontSize * 3.4));
    const y = (fx.y ?? (bounds.topPanelHeight / 2)) - rise;
    const isNearBall = fx.x !== undefined && fx.y !== undefined;
    const sizeScale = fx.sizeScale ?? 1;
    const fontSize = isNearBall
      ? Math.round(Math.max(state.ball.radius * 2.7, scoreFontSize * 1.35) * sizeScale)
      : Math.round(scoreFontSize * 0.6 * sizeScale);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = fx.color;
    ctx.textAlign = isNearBall ? 'center' : 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(fx.text, x, y);
    ctx.restore();
  });

  // Circular icon buttons in top panel
  const showFinishButton = state.phase === 'playing' && state.gameMode === 'endless';
  const buttons = getTopPanelButtons(w, bounds, showFinishButton, panelPadding);

  const drawRoundButton = (
    button: CircularButton,
    fill: string,
    iconKey: UiIconKey,
    fallbackLabel: string,
    iconScale = 1.35,
  ) => {
    ctx.beginPath();
    ctx.arc(button.cx, button.cy, button.r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();

    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.stroke();

    const icon = uiIcons[iconKey];
    if (icon && icon.complete && icon.naturalWidth > 0) {
      const size = Math.round(button.r * iconScale * 1.45);
      ctx.drawImage(icon, button.cx - size / 2, button.cy - size / 2, size, size);
      return;
    }

    ctx.font = `bold ${Math.round(button.r * 1.15)}px monospace`;
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(fallbackLabel, button.cx, button.cy + 1);
  };

  drawRoundButton(
    buttons.music,
    state.musicEnabled ? 'rgba(92, 199, 92, 0.85)' : 'rgba(120,120,120,0.6)',
    state.musicEnabled ? 'musicOn' : 'musicOff',
    state.musicEnabled ? '♪' : '✕',
  );
  drawRoundButton(
    buttons.sounds,
    state.soundsEnabled ? 'rgba(92, 199, 92, 0.85)' : 'rgba(120,120,120,0.6)',
    state.soundsEnabled ? 'soundsOn' : 'soundsOff',
    state.soundsEnabled ? '🔊' : '🔇',
  );
  drawRoundButton(buttons.settings, 'rgba(120,120,120,0.7)', 'settings', '⚙', 1.25);

  if (buttons.finish !== null) {
    drawRoundButton(buttons.finish, 'rgba(214, 76, 76, 0.9)', 'finish', '⛳', 1.24);
  }

  // Timer for all modes (countdown for timed, count up for endless)
  if (state.phase !== 'mode-select') {
    const timerText = formatModeTimer(state.modeTimeMs);
    const estimatedCharWidth = Math.max(8, bounds.topPanelHeight * 0.24);
    const safeScoreLabel = `${i18n.t('score')}: 999`;
    const safeScoreWidth = safeScoreLabel.length * estimatedCharWidth;
    const timerLeft = panelPadding + safeScoreWidth + Math.max(12, bounds.topPanelHeight * 0.2);
    const timerRight = buttons.music.cx - buttons.music.r - Math.max(12, bounds.topPanelHeight * 0.2);

    if (timerRight > timerLeft) {
      const timerCenterX = (timerLeft + timerRight) / 2;
      const maxTimerWidth = timerRight - timerLeft;
      let timerFontSize = Math.round(bounds.topPanelHeight * 0.48);
      const minTimerFontSize = 14;

      ctx.font = `bold ${timerFontSize}px monospace`;
      while (timerFontSize > minTimerFontSize && ctx.measureText(timerText).width > maxTimerWidth) {
        timerFontSize -= 1;
        ctx.font = `bold ${timerFontSize}px monospace`;
      }

      if (ctx.measureText(timerText).width <= maxTimerWidth) {
        ctx.fillStyle = 'rgba(0,0,0,0.85)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(timerText, timerCenterX, bounds.topPanelHeight / 2);
      }
    }
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
    const widget = getBonusWidgetRect(bounds, { zoneLeft: grid.zoneLeft, zoneRight: grid.zoneRight }, h);
    const iconSize = widget.size;
    const iconX = widget.x;
    const iconY = widget.y;

    // Draw bonus icon
    if (state.bonusOffer.kind === 'white-color') {
      const iconKey = 'white';
      const icon = bonusIcons?.[iconKey];
      if (icon && icon.complete) {
        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
      } else {
        // Fallback: white circle
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#FFFFFF';
        ctx.fill();
      }
    } else {
      // Draw bonus color icon
      const iconKey = getColorIcon(state.bonusOffer.color);
      const icon = bonusIcons?.[iconKey];
      if (icon && icon.complete) {
        ctx.drawImage(icon, iconX, iconY, iconSize, iconSize);
      } else {
        // Fallback: colored circle
        ctx.beginPath();
        ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = state.bonusOffer.color;
        ctx.fill();
      }
    }
  }

  if (state.phase === 'countdown') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    const bigFont = Math.round(h * 0.22);
    ctx.font = `bold ${bigFont}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(state.countdown > 0 ? String(state.countdown) : i18n.t('countdownGo'), w / 2, h / 2);
  }

  if (state.phase === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.62)';
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(h * 0.09)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(i18n.t('pauseTitle'), w / 2, h * 0.45);

    ctx.font = `${Math.round(h * 0.038)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.78)';
    ctx.fillText(i18n.t('pauseHint'), w / 2, h * 0.56);
  }

  if (state.phase === 'gameover') {
    ctx.fillStyle = 'rgba(0,0,0,0.65)';
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(h * 0.1)}px monospace`;
    ctx.fillStyle = '#fff';
    ctx.fillText(i18n.t('gameOver'), w / 2, h * 0.44);

    ctx.font = `${Math.round(h * 0.045)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.fillText(i18n.t('sessionScore') + `: ${state.sessionScore}`, w / 2, h * 0.56);

    const endButtons = getEndScreenButtons(w, h);
    const endButtonFont = Math.round(Math.max(18, Math.min(34, h * 0.04)));
    const drawEndButton = (rect: Rect, label: string, fill: string) => {
      ctx.fillStyle = fill;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.font = `bold ${endButtonFont}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    };

    drawEndButton(endButtons.newGame, i18n.t('newGame'), 'rgba(92, 199, 92, 0.9)');
    drawEndButton(endButtons.mainMenu, i18n.t('mainMenu'), 'rgba(120,120,120,0.85)');
  }

  if (state.phase === 'finished') {
    ctx.fillStyle = 'rgba(0,0,0,0.75)';
    ctx.fillRect(bounds.left, bounds.top, bounds.width, bounds.height);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `bold ${Math.round(h * 0.08)}px monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText(i18n.t('gameFinished'), w / 2, h * 0.35);

    ctx.font = `bold ${Math.round(h * 0.055)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${i18n.t('sessionScore')}: ${state.sessionScore}`, w / 2, h * 0.48);

    ctx.font = `bold ${Math.round(h * 0.045)}px monospace`;
    ctx.fillStyle = 'rgba(100,255,100,0.85)';
    ctx.fillText(`${i18n.t('totalScore')}: ${state.totalScore}`, w / 2, h * 0.58);

    ctx.font = `${Math.round(h * 0.035)}px monospace`;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText(i18n.t('finishedHint'), w / 2, h * 0.67);

    const endButtons = getEndScreenButtons(w, h);
    const endButtonFont = Math.round(Math.max(18, Math.min(34, h * 0.04)));
    const drawEndButton = (rect: Rect, label: string, fill: string) => {
      ctx.fillStyle = fill;
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.font = `bold ${endButtonFont}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    };

    drawEndButton(endButtons.newGame, i18n.t('newGame'), 'rgba(92, 199, 92, 0.9)');
    drawEndButton(endButtons.mainMenu, i18n.t('mainMenu'), 'rgba(120,120,120,0.85)');
  }

  if (state.phase === 'countdown' && state.paddleHitCount === 0) {
    const hintFont = Math.round(h * 0.03);
    ctx.font = `${hintFont}px monospace`;
    ctx.fillStyle = GAME_CONFIG.controlsHintColor;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.fillText(i18n.t('controlsLeft'), bounds.left + GAME_CONFIG.paddleWidth + 12, bounds.bottom - 12);
    ctx.textAlign = 'right';
    ctx.fillText(i18n.t('controlsRight'), bounds.right - GAME_CONFIG.paddleWidth - 12, bounds.bottom - 12);
  }

  // Settings modal
  if (state.showSettings) {
    ctx.fillStyle = 'rgba(0,0,0,0.85)';
    ctx.fillRect(0, 0, w, h);

    const layout = getSettingsLayout(w, h);
    const { modal, close, rows, controls } = layout;
    const titleFont = Math.round(Math.max(28, Math.min(54, modal.h * 0.1)));
    const rowFont = Math.round(Math.max(16, Math.min(30, layout.rowHeight * 0.52)));
    const buttonFont = Math.round(Math.max(14, Math.min(24, layout.rowHeight * 0.48)));
    const hintFont = Math.round(Math.max(12, Math.min(20, layout.rowHeight * 0.4)));

    const drawRectButton = (rect: Rect, label: string, active = false) => {
      ctx.fillStyle = active ? 'rgba(92, 199, 92, 0.9)' : 'rgba(80,80,80,0.9)';
      ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      ctx.fillStyle = 'rgba(0,0,0,0.9)';
      ctx.font = `bold ${buttonFont}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2);
    };

    const drawRowLabel = (label: string, rowY: number) => {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.font = `bold ${rowFont}px monospace`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(label, layout.labelX, rowY + layout.rowHeight / 2);
    };

    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(modal.x, modal.y, modal.w, modal.h);
    ctx.strokeStyle = '#FFD700';
    ctx.lineWidth = 3;
    ctx.strokeRect(modal.x, modal.y, modal.w, modal.h);

    drawRectButton(close, '×');

    ctx.font = `bold ${titleFont}px monospace`;
    ctx.fillStyle = '#FFD700';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(i18n.t('settingsTitle'), w / 2, layout.titleY);

    drawRowLabel(i18n.t('musicVolume'), rows.musicVolume);
    drawRectButton(controls.musicMinus, '−');
    drawRectButton(controls.musicPlus, '+');
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `bold ${rowFont}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.round(state.musicVolume * 100)}%`,
      layout.valueX + layout.valueWidth / 2,
      rows.musicVolume + layout.rowHeight / 2,
    );

    drawRowLabel(i18n.t('soundsVolume'), rows.soundsVolume);
    drawRectButton(controls.soundsMinus, '−');
    drawRectButton(controls.soundsPlus, '+');
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.font = `bold ${rowFont}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(
      `${Math.round(state.soundsVolume * 100)}%`,
      layout.valueX + layout.valueWidth / 2,
      rows.soundsVolume + layout.rowHeight / 2,
    );

    drawRowLabel(i18n.t('musicEnabled'), rows.musicEnabled);
    drawRectButton(controls.musicToggle, state.musicEnabled ? i18n.t('on').toUpperCase() : i18n.t('off').toUpperCase(), state.musicEnabled);

    drawRowLabel(i18n.t('soundsEnabled'), rows.soundsEnabled);
    drawRectButton(controls.soundsToggle, state.soundsEnabled ? i18n.t('on').toUpperCase() : i18n.t('off').toUpperCase(), state.soundsEnabled);

    drawRowLabel(i18n.t('autoPause'), rows.autoPause);
    drawRectButton(controls.autoPauseToggle, state.autoPauseEnabled ? i18n.t('on').toUpperCase() : i18n.t('off').toUpperCase(), state.autoPauseEnabled);

    drawRowLabel(i18n.t('language'), rows.language);
    drawRectButton(controls.langRu, '🇷🇺 RU', state.language === 'ru');
    drawRectButton(controls.langEn, '🇺🇸 EN', state.language === 'en');

    ctx.fillStyle = 'rgba(255,255,255,0.72)';
    ctx.font = `${hintFont}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(i18n.t('settingsHint'), w / 2, layout.hintY);
  }

  // Mode selection screen
  if (state.phase === 'mode-select') {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.round(h * 0.08)}px monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(i18n.t('selectMode'), w / 2, h * 0.1);

    const modeButtonHeight = h * 0.12;
    const modeButtonY = h * 0.25;
    const modeButtons: { mode: GameMode; label: string; x: number }[] = [
      { mode: '1min', label: i18n.t('mode1min') || '1 MIN', x: w * 0.1 },
      { mode: '3min', label: i18n.t('mode3min') || '3 MIN', x: w * 0.35 },
      { mode: '5min', label: i18n.t('mode5min') || '5 MIN', x: w * 0.6 },
      { mode: 'endless', label: i18n.t('modeEndless') || 'ENDLESS', x: w * 0.1 },
    ];

    const modeButtonWidth = w * 0.25;
    modeButtons.forEach((btn, idx) => {
      const y = modeButtonY + (idx < 3 ? 0 : modeButtonHeight * 1.3);
      ctx.fillStyle = 'rgba(100,100,100,0.8)';
      ctx.fillRect(btn.x, y, modeButtonWidth, modeButtonHeight);
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 3;
      ctx.strokeRect(btn.x, y, modeButtonWidth, modeButtonHeight);
      ctx.fillStyle = '#FFF';
      ctx.font = `bold ${Math.round(modeButtonHeight * 0.45)}px monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(btn.label, btn.x + modeButtonWidth / 2, y + modeButtonHeight / 2);
    });

    // Settings button
    const settingsBtnY = modeButtonY + modeButtonHeight * 2.8;
    ctx.fillStyle = 'rgba(80,80,80,0.8)';
    ctx.fillRect(w * 0.1, settingsBtnY, modeButtonWidth, modeButtonHeight * 0.8);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.1, settingsBtnY, modeButtonWidth, modeButtonHeight * 0.8);
    ctx.fillStyle = '#BBB';
    ctx.font = `${Math.round(modeButtonHeight * 0.35)}px monospace`;
    ctx.fillText(i18n.t('settings'), w * 0.1 + modeButtonWidth / 2, settingsBtnY + modeButtonHeight * 0.4);

    // Statistics button
    ctx.fillStyle = 'rgba(80,80,80,0.8)';
    ctx.fillRect(w * 0.65, settingsBtnY, modeButtonWidth, modeButtonHeight * 0.8);
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.strokeRect(w * 0.65, settingsBtnY, modeButtonWidth, modeButtonHeight * 0.8);
    ctx.fillStyle = '#BBB';
    ctx.font = `${Math.round(modeButtonHeight * 0.35)}px monospace`;
    ctx.fillText(i18n.t('statistics'), w * 0.65 + modeButtonWidth / 2, settingsBtnY + modeButtonHeight * 0.4);

    // Total score display
    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${Math.round(h * 0.05)}px monospace`;
    ctx.textAlign = 'center';
    ctx.fillText(`${i18n.t('totalScore')}: ${Math.floor(state.totalScore)}`, w / 2, h * 0.82);
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
  const isTouchDeviceRef = useRef<boolean>(
    'ontouchstart' in window || navigator.maxTouchPoints > 0,
  );
  const [portraitMode, setPortraitMode] = useState(false);
  
  // Audio system
  const musicRef = useRef<HTMLAudioElement[]>([]);
  const soundsRef = useRef<{ [key: string]: HTMLAudioElement }>({});
  const currentMusicIndexRef = useRef<number>(0);
  const uiIconsRef = useRef<UiIcons>({});
  const bonusIconsRef = useRef<BonusIcons>({});

  // Load canvas SVG UI icons from Font Awesome package assets
  useEffect(() => {
    const iconSources: Record<UiIconKey, string> = {
      musicOn: musicIconUrl,
      musicOff: circleXmarkIconUrl,
      soundsOn: volumeHighIconUrl,
      soundsOff: volumeXmarkIconUrl,
      settings: gearIconUrl,
      finish: flagCheckeredIconUrl,
    };

    (Object.entries(iconSources) as Array<[UiIconKey, string]>).forEach(([key, src]) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
      uiIconsRef.current[key] = img;
    });

    // Load bonus icons
    const bonusIconSources: Record<BonusIconKey, string> = {
      red: 'img/red_bonus_256.png',
      blue: 'img/blue_bonus_256.png',
      green: 'img/green_bonus_256.png',
      yellow: 'img/yellow_bonus_256.png',
      orange: 'img/orange_bonus_256.png',
      white: 'img/white_bonus_256.png',
    };

    (Object.entries(bonusIconSources) as Array<[BonusIconKey, string]>).forEach(([key, src]) => {
      const img = new Image();
      img.decoding = 'async';
      img.src = resolvePublicAssetPath(src);
      bonusIconsRef.current[key] = img;
    });

    return () => {
      uiIconsRef.current = {};
      bonusIconsRef.current = {};
    };
  }, []);

  // Load audio on mount
  useEffect(() => {
    // Load music tracks
    GAME_CONFIG.musicTracks.forEach((src) => {
      const audio = new Audio(resolvePublicAssetPath(src));
      audio.loop = false;
      audio.volume = 0.3;
      musicRef.current.push(audio);
    });

    // Setup music rotation
    const playNextMusic = () => {
      if (!stateRef.current?.musicEnabled) return;
      
      const tracks = musicRef.current;
      if (tracks.length === 0) return;
      
      // Stop all tracks first to prevent overlapping
      tracks.forEach(t => {
        t.pause();
        t.currentTime = 0;
      });
      
      currentMusicIndexRef.current = (currentMusicIndexRef.current + 1) % tracks.length;
      const nextTrack = tracks[currentMusicIndexRef.current];
      nextTrack.currentTime = 0;
      nextTrack.play().catch(() => {});
    };

    // Setup ended listener for all tracks
    const endedListeners = new Map<HTMLAudioElement, () => void>();
    musicRef.current.forEach((track) => {
      const listener = playNextMusic;
      endedListeners.set(track, listener);
      track.addEventListener('ended', listener, { once: false });
    });

    // Load sound effects
    Object.entries(GAME_CONFIG.sounds).forEach(([key, src]) => {
      const audio = new Audio(resolvePublicAssetPath(src));
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
        track.currentTime = 0;
        const listener = endedListeners.get(track);
        if (listener) {
          track.removeEventListener('ended', listener);
        }
        track.remove();
      });
      Object.values(soundsRef.current).forEach((sound) => {
        sound.remove();
      });
      musicRef.current = [];
      soundsRef.current = {};
    };
  }, []);

  const playSound = (soundKey: string) => {
    if (!stateRef.current?.soundsEnabled) return;
    const sound = soundsRef.current[soundKey];
    if (sound) {
      sound.volume = stateRef.current.soundsVolume;
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
        currentTrack.volume = stateRef.current.musicVolume;
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
    if (!stateRef.current || stateRef.current.phase !== 'playing' || stateRef.current.gameMode !== 'endless') return;
    finalizeRoundScore(stateRef.current);
    stateRef.current.phase = 'finished';
    playSound('gameOver');
  };

  // Manage music volume and pause/resume
  useEffect(() => {
    const interval = setInterval(() => {
      if (!stateRef.current) return;
      
      // Update volumes
      musicRef.current.forEach(track => {
        track.volume = stateRef.current!.musicVolume;
      });
      Object.values(soundsRef.current).forEach(sound => {
        sound.volume = stateRef.current!.soundsVolume;
      });

      // Manage music based on phase
      const currentTrack = musicRef.current[currentMusicIndexRef.current];
      if (stateRef.current.phase === 'paused' || stateRef.current.showSettings) {
        if (currentTrack && !currentTrack.paused) {
          currentTrack.pause();
        }
      } else if (stateRef.current.phase === 'playing' || stateRef.current.phase === 'countdown') {
        if (stateRef.current.musicEnabled && currentTrack && currentTrack.paused) {
          currentTrack.play().catch(() => {});
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, []);

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
    };

    init();

    function loop(timestamp: number) {
      const ctx = canvasEl.getContext('2d');
      if (!ctx || !stateRef.current) {
        return;
      }

      const dt = Math.min(timestamp - lastTimeRef.current, 50);
      lastTimeRef.current = timestamp;
      const hasActivePaddleTouch = mouseRef.current.active
        || touchRef.current.left !== null
        || touchRef.current.right !== null;

      stateRef.current = stepGame(
        stateRef.current,
        dt,
        canvasEl.width,
        canvasEl.height,
        keysRef.current,
        touchRef.current,
        mouseRef.current,
        playSound,
        isTouchDeviceRef.current,
        hasActivePaddleTouch,
      );
      renderGame(ctx, stateRef.current, uiIconsRef.current, isTouchDeviceRef.current, bonusIconsRef.current);

      rafRef.current = requestAnimationFrame(loop);
    }

    const getGamePoint = (clientX: number, clientY: number): Vec2 => {
      const rect = canvasEl.getBoundingClientRect();
      const xInElement = clientX - rect.left;
      const yInElement = clientY - rect.top;

      if (!portraitMode) {
        return {
          x: (xInElement / rect.width) * canvasEl.width,
          y: (yInElement / rect.height) * canvasEl.height,
        };
      }

      const normalizedX = xInElement / rect.width;
      const normalizedY = yInElement / rect.height;

      return {
        x: normalizedY * canvasEl.width,
        y: (1 - normalizedX) * canvasEl.height,
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
          if (stateRef.current?.phase === 'gameover' || stateRef.current?.phase === 'finished') {
            const prevState = stateRef.current;
            stateRef.current = startNewRoundFromCurrentState(prevState, canvasEl.width, canvasEl.height);
          } else if (stateRef.current?.phase === 'paused') {
            stateRef.current.phase = 'countdown';
            stateRef.current.countdown = GAME_CONFIG.countdownSeconds;
            stateRef.current.phaseTimer = 0;
            stateRef.current.lastPaddleTouchAt = performance.now();
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

      const state = stateRef.current;
      if (!state) {
        return;
      }

      const point = getGamePoint(e.clientX, e.clientY);
      const bounds = getBounds(canvasEl.width, canvasEl.height, isTouchDeviceRef.current);

      if (state.phase === 'gameover' || state.phase === 'finished') {
        const endButtons = getEndScreenButtons(canvasEl.width, canvasEl.height);
        if (isPointInRect(point.x, point.y, endButtons.newGame)) {
          stateRef.current = startNewRoundFromCurrentState(state, canvasEl.width, canvasEl.height);
          e.preventDefault();
          return;
        }
        if (isPointInRect(point.x, point.y, endButtons.mainMenu)) {
          stateRef.current = makeInitialState(canvasEl.width, canvasEl.height, state);
          e.preventDefault();
          return;
        }
        e.preventDefault();
        return;
      }

      // Handle mode selection screen
      if (state.phase === 'mode-select') {
        const modeButtonHeight = canvasEl.height * 0.12;
        const modeButtonY = canvasEl.height * 0.25;
        const modeButtonWidth = canvasEl.width * 0.25;
        const modeButtons: Array<{ mode: GameMode; x: number; y: number }> = [
          { mode: '1min', x: canvasEl.width * 0.1, y: modeButtonY },
          { mode: '3min', x: canvasEl.width * 0.35, y: modeButtonY },
          { mode: '5min', x: canvasEl.width * 0.6, y: modeButtonY },
          { mode: 'endless', x: canvasEl.width * 0.1, y: modeButtonY + modeButtonHeight * 1.3 },
        ];

        for (const btn of modeButtons) {
          if (
            point.x >= btn.x &&
            point.x <= btn.x + modeButtonWidth &&
            point.y >= btn.y &&
            point.y <= btn.y + modeButtonHeight
          ) {
            selectGameMode(state, btn.mode);
            e.preventDefault();
            return;
          }
        }

        // Settings button
        const settingsBtnY = modeButtonY + modeButtonHeight * 2.8;
        if (
          point.x >= canvasEl.width * 0.1 &&
          point.x <= canvasEl.width * 0.1 + modeButtonWidth &&
          point.y >= settingsBtnY &&
          point.y <= settingsBtnY + modeButtonHeight * 0.8
        ) {
          state.showSettings = true;
          e.preventDefault();
          return;
        }

        e.preventDefault();
        return;
      }

      const panelPadding = Math.max(bounds.sideMargin, GAME_CONFIG.paddleWidth);
        const showFinishButtonForState = state.phase === 'playing' && state.gameMode === 'endless';
        const buttons = getTopPanelButtons(canvasEl.width, bounds, showFinishButtonForState, panelPadding);

      if (handleSettingsInteraction(state, point, canvasEl.width, canvasEl.height)) {
        e.preventDefault();
        return;
      }

      // Check button clicks in top panel
      if (point.y < bounds.topPanelHeight) {
        if (isPointInCircle(point.x, point.y, buttons.music)) {
          toggleMusic();
          e.preventDefault();
          return;
        }

        if (isPointInCircle(point.x, point.y, buttons.sounds)) {
          toggleSounds();
          e.preventDefault();
          return;
        }

        if (buttons.finish !== null && isPointInCircle(point.x, point.y, buttons.finish)) {
          finishGame();
          e.preventDefault();
          return;
        }

        if (isPointInCircle(point.x, point.y, buttons.settings)) {
          state.showSettings = !state.showSettings;
          e.preventDefault();
          return;
        }
      }

      if (state.phase === 'paused') {
        state.phase = 'countdown';
        state.countdown = GAME_CONFIG.countdownSeconds;
        state.phaseTimer = 0;
      }

      mouseRef.current.active = true;
      mouseRef.current.y = getGameY(e.clientX, e.clientY);

      if (state) {
        state.lastPaddleTouchAt = performance.now();
      }

      e.preventDefault();
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!mouseRef.current.active) {
        return;
      }

      mouseRef.current.y = getGameY(e.clientX, e.clientY);
      if (stateRef.current) {
        stateRef.current.lastPaddleTouchAt = performance.now();
      }
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
      if (!state) {
        return;
      }

      if (state.phase === 'paused') {
        state.phase = 'countdown';
        state.countdown = GAME_CONFIG.countdownSeconds;
        state.phaseTimer = 0;
        state.lastPaddleTouchAt = performance.now();
        return;
      }

      if (state.phase === 'gameover' || state.phase === 'finished') {
        const endButtons = getEndScreenButtons(canvasEl.width, canvasEl.height);

        for (let i = 0; i < e.changedTouches.length; i += 1) {
          const touchPoint = getGamePoint(e.changedTouches[i].clientX, e.changedTouches[i].clientY);
          if (isPointInRect(touchPoint.x, touchPoint.y, endButtons.newGame)) {
            stateRef.current = startNewRoundFromCurrentState(state, canvasEl.width, canvasEl.height);
            return;
          }
          if (isPointInRect(touchPoint.x, touchPoint.y, endButtons.mainMenu)) {
            stateRef.current = makeInitialState(canvasEl.width, canvasEl.height, state);
            return;
          }
        }
        return;
      }

      const bounds = getBounds(canvasEl.width, canvasEl.height, isTouchDeviceRef.current);
      const grid = getGridDimensions(canvasEl.width, canvasEl.height);
      const panelPadding = Math.max(bounds.sideMargin, GAME_CONFIG.paddleWidth);
      const showFinishButtonForState = state.phase === 'playing' && state.gameMode === 'endless';
      const buttons = getTopPanelButtons(canvasEl.width, bounds, showFinishButtonForState, panelPadding);

      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const touch = e.changedTouches[i];
        const point = getGamePoint(touch.clientX, touch.clientY);

        if (handleSettingsInteraction(state, point, canvasEl.width, canvasEl.height)) {
          continue;
        }
        
        // Check button clicks in top panel
        if (point.y < bounds.topPanelHeight) {
          if (isPointInCircle(point.x, point.y, buttons.music)) {
            toggleMusic();
            continue;
          }

          if (isPointInCircle(point.x, point.y, buttons.sounds)) {
            toggleSounds();
            continue;
          }

          if (buttons.finish !== null && isPointInCircle(point.x, point.y, buttons.finish)) {
            finishGame();
            continue;
          }

          if (isPointInCircle(point.x, point.y, buttons.settings)) {
            state.showSettings = !state.showSettings;
            continue;
          }

          // Ignore other clicks in top panel
          continue;
        }

        if (state && canShowBonusOffer(state, performance.now()) && state.bonusOffer) {
          const rect = getBonusWidgetRect(
            bounds,
            { zoneLeft: grid.zoneLeft, zoneRight: grid.zoneRight },
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

        const sideZonePadding = Math.max(8, GAME_CONFIG.paddleWidth * 0.2);
        let side: Side | null = null;
        if (point.x <= grid.zoneLeft - sideZonePadding) {
          side = 'left';
        } else if (point.x >= grid.zoneRight + sideZonePadding) {
          side = 'right';
        }

        if (side === null) {
          continue;
        }

        activeTouchesRef.current.set(touch.identifier, side);
        state.lastPaddleTouchAt = performance.now();

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
      const state = stateRef.current;
      for (let i = 0; i < e.changedTouches.length; i += 1) {
        const touch = e.changedTouches[i];
        const side = activeTouchesRef.current.get(touch.identifier);
        const y = getGameY(touch.clientX, touch.clientY);

        if (side === 'left') {
          touchRef.current.left = y;
          if (state) {
            state.lastPaddleTouchAt = performance.now();
          }
        } else if (side === 'right') {
          touchRef.current.right = y;
          if (state) {
            state.lastPaddleTouchAt = performance.now();
          }
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
      const prevBounds = getBounds(prevW, prevH, isTouchDeviceRef.current);
      const nextBounds = getBounds(canvasEl.width, canvasEl.height, isTouchDeviceRef.current);
      const prevPaddleSpace = Math.max(1, prevBounds.height - s.leftPaddle.height);
      const leftRatio = (s.leftPaddle.y - prevBounds.top) / prevPaddleSpace;
      const rightRatio = (s.rightPaddle.y - prevBounds.top) / prevPaddleSpace;

      s.leftPaddle.height = nextBounds.height * GAME_CONFIG.paddleHeightRatio;
      s.rightPaddle.height = nextBounds.height * GAME_CONFIG.paddleHeightRatio;

      s.leftPaddle.y = nextBounds.top + leftRatio * Math.max(0, nextBounds.height - s.leftPaddle.height);
      s.rightPaddle.y = nextBounds.top + rightRatio * Math.max(0, nextBounds.height - s.rightPaddle.height);

      s.ball.radius = Math.min(nextBounds.width, nextBounds.height) * GAME_CONFIG.ballRadiusRatio;
    };

    const handleVisibilityChange = () => {
      if (document.hidden && stateRef.current?.phase === 'playing') {
        stateRef.current.phase = 'paused';
        // Stop all music tracks completely when losing focus
        musicRef.current.forEach(track => {
          track.pause();
          track.currentTime = 0;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    document.addEventListener('visibilitychange', handleVisibilityChange);

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
      document.removeEventListener('visibilitychange', handleVisibilityChange);

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
