import { difficultyLabel, roundTitle, normalizeTestName } from './quizHistory';

export const scoreSummary = (result) =>
  `${result.correctAnswers}/${result.totalQuestions} · ${roundTitle(
    result
  )} · ${
    normalizeTestName(result.customName) ? `${result.topic} · ` : ''
  }${difficultyLabel(result.difficulty)}${
    result.timeLimit === 0 ? ' · Untimed' : ''
  }${result.mode === 'practice' ? ' · Practice mode' : ''}`;
export const appUrl = () =>
  `${window.location.origin}${window.location.pathname}`;

const fitText = (ctx, text, maxWidth, fontSize, fontFamily) => {
  let size = fontSize;
  ctx.font = `${size}px ${fontFamily}`;
  while (ctx.measureText(text).width > maxWidth && size > 20) {
    size -= 1;
    ctx.font = `${size}px ${fontFamily}`;
  }
  ctx.fillText(text, 74, 391, maxWidth);
};

export const createScorecard = (result, url) =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 630;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Image export is unavailable in this browser.'));
      return;
    }
    ctx.fillStyle = '#f4f1e9';
    ctx.fillRect(0, 0, 1200, 630);
    ctx.strokeStyle = '#292f29';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(74, 116);
    ctx.lineTo(1126, 116);
    ctx.stroke();
    ctx.fillStyle = '#292f29';
    ctx.font = 'bold 40px Georgia';
    ctx.fillText('QuizApp.', 74, 82);
    ctx.font = '18px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('THE SCORECARD', 1126, 77);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#66695f';
    ctx.font = '21px monospace';
    ctx.fillText(
      result.mode === 'practice' ? 'PRACTICE ROUND' : 'EXAM ROUND',
      74,
      176
    );
    ctx.fillStyle = '#294c3d';
    ctx.font = '155px Georgia';
    ctx.fillText(String(result.correctAnswers), 66, 329);
    const scoreWidth = ctx.measureText(String(result.correctAnswers)).width;
    ctx.fillStyle = '#66695f';
    ctx.font = '58px Georgia';
    ctx.fillText(`/ ${result.totalQuestions}`, 88 + scoreWidth, 324);
    ctx.fillStyle = '#a74d32';
    fitText(ctx, roundTitle(result), 1040, 42, 'Georgia');
    ctx.fillStyle = '#66695f';
    ctx.font = '22px sans-serif';
    const seconds = Math.floor(result.timeTaken / 1000);
    ctx.fillText(
      `${
        normalizeTestName(result.customName) ? `${result.topic}  ·  ` : ''
      }${difficultyLabel(result.difficulty)}  ·  ${Math.round(
        (result.correctAnswers / result.totalQuestions) * 100
      )}% correct${
        result.timeLimit === 0 ? '  ·  Untimed' : ''
      }  ·  ${Math.floor(seconds / 60)}m ${seconds % 60}s`,
      74,
      440,
      1040
    );
    ctx.strokeStyle = '#d9d7cb';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(74, 499);
    ctx.lineTo(1126, 499);
    ctx.stroke();
    ctx.fillStyle = '#292f29';
    ctx.font = 'italic 30px Georgia';
    ctx.fillText('Your turn?', 74, 556);
    ctx.font = '18px sans-serif';
    ctx.textAlign = 'right';
    let displayUrl;
    try {
      const link = new URL(url);
      displayUrl = `${link.host}${link.pathname}`.replace(/\/$/, '');
    } catch {
      displayUrl = url;
    }
    ctx.fillText(displayUrl, 1126, 551, 790);
    canvas.toBlob(
      (blob) =>
        blob
          ? resolve(blob)
          : reject(new Error('We couldn’t create the scorecard image.')),
      'image/png'
    );
  });
