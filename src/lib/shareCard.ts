import { ENERGY_LEVELS } from './rest';

/** Canvas colors matching `LEVEL_COLOR`. */
const LEVEL_HEX: Record<number, string> = {
  1: '#f43f5e',
  2: '#f97316',
  3: '#fbbf24',
  4: '#84cc16',
  5: '#10b981',
};

const EMBER = '#fb923c';
const WIDTH = 1080;
const HEIGHT = 1350;

export interface RechargeCard {
  /** e.g. "sleep time" */
  rechargeName: string;
  minutes: number;
  before?: number;
  after: number;
}

function loadImage(src: string): Promise<HTMLImageElement | undefined> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(undefined);
    img.src = src;
  });
}

/** Draw `img` to fill the canvas, cropping whatever overflows. */
function cover(ctx: CanvasRenderingContext2D, img: HTMLImageElement) {
  const scale = Math.max(WIDTH / img.width, HEIGHT / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (WIDTH - w) / 2, (HEIGHT - h) / 2, w, h);
}

function battery(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, level: number, dim = false) {
  const h = w * 0.48;
  const stroke = w * 0.05;
  ctx.save();
  ctx.globalAlpha = dim ? 0.55 : 1;
  ctx.strokeStyle = 'white';
  ctx.fillStyle = 'white';
  ctx.lineWidth = stroke;
  ctx.beginPath();
  ctx.roundRect(x, y, w * 0.9, h, w * 0.07);
  ctx.stroke();
  ctx.beginPath();
  ctx.roundRect(x + w * 0.92, y + h * 0.3, w * 0.06, h * 0.4, w * 0.02);
  ctx.fill();
  ctx.fillStyle = LEVEL_HEX[level];
  const pad = w * 0.065;
  const cell = (w * 0.9 - pad * 2) / 5;
  for (let i = 0; i < level; i++) {
    ctx.beginPath();
    ctx.roundRect(x + pad + i * cell + cell * 0.08, y + pad, cell * 0.84, h - pad * 2, w * 0.015);
    ctx.fill();
  }
  ctx.restore();
}

/** Render a portrait card celebrating a finished rest, as a PNG. */
export async function renderRechargeCard(card: RechargeCard): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas is not available');

  const [img] = await Promise.all([
    loadImage(`/battery-${card.after}.webp`),
    document.fonts.load('600 120px "Fraunces Variable"'),
    document.fonts.load('italic 600 80px "Fraunces Variable"'),
    document.fonts.load('700 40px "Nunito Variable"'),
  ]);

  ctx.fillStyle = '#1b1640';
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  if (img) cover(ctx, img);

  const shade = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  shade.addColorStop(0, 'rgba(20, 16, 48, 0.55)');
  shade.addColorStop(0.45, 'rgba(20, 16, 48, 0.72)');
  shade.addColorStop(1, 'rgba(12, 10, 30, 0.94)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  const left = 96;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.textBaseline = 'alphabetic';

  ctx.font = '800 34px "Nunito Variable", sans-serif';
  ctx.letterSpacing = '8px';
  ctx.fillText('RESTIVISM', left, 150);
  ctx.letterSpacing = '0px';

  const gained = card.before === undefined ? undefined : card.after - card.before;

  ctx.fillStyle = 'white';
  ctx.font = '600 136px "Fraunces Variable", serif';
  ctx.fillText('I recharged.', left, 420);

  if (gained !== undefined && gained > 0) {
    ctx.fillStyle = EMBER;
    ctx.font = '600 200px "Fraunces Variable", serif';
    ctx.fillText(`+${gained}`, left, 640);
    const numberWidth = ctx.measureText(`+${gained}`).width;
    ctx.font = '700 56px "Nunito Variable", sans-serif';
    ctx.fillText(`bar${gained === 1 ? '' : 's'}`, left + numberWidth + 24, 640);
  }

  // Before → after.
  const y = 720;
  if (card.before !== undefined) {
    battery(ctx, left, y, 260, card.before, true);
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    ctx.font = '600 90px "Fraunces Variable", serif';
    ctx.fillText('→', left + 300, y + 100);
    battery(ctx, left + 440, y, 260, card.after);
  } else {
    battery(ctx, left, y, 260, card.after);
  }

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 44px "Nunito Variable", sans-serif';
  ctx.fillText(
    `${card.minutes} minute${card.minutes === 1 ? '' : 's'} of ${card.rechargeName} · now ${ENERGY_LEVELS[card.after - 1].label.toLowerCase()}`,
    left,
    y + 220,
  );

  ctx.fillStyle = 'white';
  ctx.font = 'italic 600 96px "Fraunces Variable", serif';
  ctx.fillText('Rest is resistance.', left, HEIGHT - 150);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.font = '600 34px "Nunito Variable", sans-serif';
  ctx.fillText(window.location.host, left, HEIGHT - 86);

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not render card'))), 'image/png');
  });
}
