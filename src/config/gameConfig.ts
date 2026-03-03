export const GAME_CONFIG = {
  paddleWidth: 30,
  paddleHeightRatio: 0.66,
  paddleSpeedRatio: 0.012,

  ballRadiusRatio: 0.018,
  initialBallSpeedRatio: 0.05,
  ballSpeedIncrement: 0,

  countdownSeconds: 3,

  tetrisGridCols: 10,
  tetrisGridRows: 20,
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

  // Panel and margin configuration (at least 10% of screen dimension)
  minTopBottomPanelRatio: 0.1,
  minSidePanelRatio: 0.1,
  panelBackgroundColor: '#1a1a1a',
  panelBorderColor: 'rgba(255,255,255,0.15)',

  // Ball trail configuration
  ballTrailLength: 8,
  ballTrailOpacityStart: 0.4,
  ballTrailOpacityEnd: 0.05,

  tetrisBlockFallInterval: 500,
};

export type GameConfig = typeof GAME_CONFIG;
