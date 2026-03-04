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
};

export type GameConfig = typeof GAME_CONFIG;
