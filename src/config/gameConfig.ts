export const GAME_CONFIG = {
  paddleWidth: 45,
  paddleHeightRatio: 0.50,
  paddleSpeedRatio: 0.02,

  ballRadiusRatio: 0.03,
  initialBallSpeedRatio: 0.02,
  ballSpeedIncrement: 0,

  countdownSeconds: 3,

  tetrisGridCols: 6,
  tetrisGridRows: 12,
  centerZoneStartRatio: 0.3,
  centerZoneEndRatio: 0.7,
  tetrisZoneHighlight: 'rgba(64, 164, 255, 0.12)',
  tetrisZoneStroke: 'rgba(64, 164, 255, 0.55)',

  blockColors: ['#FF1744', '#F57C00', '#FBC02D', '#388E3C', '#0277BD'],
  ballWhiteColor: '#FFFFFF',

  mobileBorderWidth: 18,
  desktopBorderWidth: 10,
  borderColor: '#FFFFFF',

  topBottomBounceColor: 'rgba(255,255,255,0.25)',
  controlsHintColor: 'rgba(255,255,255,0.45)',

  // Panel and margin configuration
  topPanelRatio: 0.08,
  sideMarginRatio: 0.05,
  panelBackgroundColor: '#1a1a1a',
  panelBorderColor: 'rgba(255,255,255,0.15)',

  // Ball trail configuration
  ballTrailLength: 20,
  ballTrailOpacityStart: 0.3,
  ballTrailOpacityEnd: 0.01,

  // Bonus shop configuration
  bonusOfferIntervalMs: 10000,
  bonusOfferLifetimeMs: 10000,
  bonusRequiredZoneStayMs: 3000,
  bonusWidgetSizeRatio: 0.33,
  bonusColorCost: 3,
  bonusWhiteCost: 5,

  scoreFxDurationMs: 850,

  // UI colors
  leftPaddleColor: '#FF00FF',  // magenta
  rightPaddleColor: '#00FFFF', // cyan
  topPanelColor: '#FFD700',     // gold

  // Audio configuration
  musicTracks: ['/audio/cartoonish.mp3', '/audio/russian.mp3'],
  sounds: {
    paddleHit: '/audio/mixkit-golf-ball-hit-2105.wav',
    wallHit: '/audio/mixkit-hitting-golf-ball-2080.wav',
    blockHit: '/audio/mixkit-hitting-golf-ball-2080.wav',
    blockDestroy: '/audio/mixkit-arcade-score-interface-217.wav',
    scoreGain: '/audio/mixkit-arcade-score-interface-217.wav',
    countdownTick: '/audio/mixkit-arcade-player-select-2036.wav',
    gameOver: '/audio/mixkit-arcade-retro-game-over-213.wav',
    bonusAppear: '/audio/mixkit-arcade-bonus-alert-767.wav',
    bonusExpire: '/audio/mixkit-quick-lock-sound-2854.wav',
    bonusPurchase: '/audio/mixkit-magic-sweep-game-trophy-257.wav',
  },
};

export type GameConfig = typeof GAME_CONFIG;
