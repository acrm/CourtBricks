import i18next from 'i18next';

void i18next.init({
  lng: 'ru',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  resources: {
    ru: {
      translation: {
        score: 'СЧЕТ',
        gameOver: 'ПРОИГРЫШ',
        restartHint: 'Нажмите ENTER или тапните для новой игры',
        gameFinished: 'ИГРА ЗАВЕРШЕНА',
        sessionScore: 'Счет партии',
        totalScore: 'Суммарный счет',
        finishedHint: 'Тап или ENTER — начать новую партию',
        countdownGo: 'СТАРТ!',
        bonusPoints: 'очк.',
        bonusDuration: 'длит.',
        settingsShort: 'НАСТР',
        pauseTitle: 'ПАУЗА',
        pauseHint: 'Тапните, чтобы продолжить',
        controlsLeft: 'Q/A — левая ракетка',
        controlsRight: "]/' — правая ракетка | ЛКМ: синхрон",
      },
    },
    en: {
      translation: {
        score: 'SCORE',
        gameOver: 'GAME OVER',
        restartHint: 'Press ENTER or tap to restart',
        gameFinished: 'GAME FINISHED',
        sessionScore: 'Session Score',
        totalScore: 'Total Score',
        finishedHint: 'Tap or press ENTER to start new game',
        countdownGo: 'GO!',
        bonusPoints: 'pts',
        bonusDuration: 'dur',
        settingsShort: 'SET',
        pauseTitle: 'PAUSE',
        pauseHint: 'Tap to continue',
        controlsLeft: 'Q/A - left paddle',
        controlsRight: "]/' - right paddle | Hold LMB: sync",
      },
    },
  },
});

export default i18next;
