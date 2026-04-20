const modal = document.getElementById('modal');
const backdrop = document.getElementById('modal-backdrop');
const colorPreview = document.getElementById('color-preview');
const hexInput = document.getElementById('hex-input');
const rInput = document.getElementById('r-input');
const gInput = document.getElementById('g-input');
const bInput = document.getElementById('b-input');
const paletteEl = document.getElementById('palette');
const labelsEl = document.getElementById('palette-labels');
const topHSlider = document.getElementById('top-h');
const topSSlider = document.getElementById('top-s');
const topVSlider = document.getElementById('top-v');
const botHSlider = document.getElementById('bot-h');
const botSSlider = document.getElementById('bot-s');
const botVSlider = document.getElementById('bot-v');

let colorPicker = null;
let syncing = false;

// ── Color utilities ──────────────────────────────────────

function hsvToRgb(h, s, v) {
  const i = Math.floor(h / 60) % 6;
  const f = (h / 60) - Math.floor(h / 60);
  const p = v * (1 - s);
  const q = v * (1 - f * s);
  const t = v * (1 - (1 - f) * s);
  const r = [v, q, p, p, t, v][i];
  const g = [t, v, v, q, p, p][i];
  const b = [p, p, t, v, v, q][i];
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function rgbToHsv(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r)      h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else                h = (r - g) / d + 4;
    h = Math.round(h * 60);
    if (h < 0) h += 360;
  }
  return {
    h,
    s: max === 0 ? 0 : Math.round((d / max) * 100),
    v: Math.round(max * 100),
  };
}

function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

function randomBaseColor() {
  const h = Math.random() * 360;
  const s = 0.55 + Math.random() * 0.45;
  const v = 0.4  + Math.random() * 0.45;
  return hsvToRgb(h, s, v);
}

// ── State ─────────────────────────────────────────────────

const BASE = randomBaseColor();
let currentBase = { ...BASE };

const SWATCH_COUNT = 7;
const MIDDLE = 3;
const MIN_MIX = 0.25;

let topHSV = { h: 0, s: 0, v: 100 };
let botHSV = { h: 0, s: 0, v: 0 };

function resetEndColors(r, g, b) {
  const tr = Math.round(r * MIN_MIX + 255 * (1 - MIN_MIX));
  const tg = Math.round(g * MIN_MIX + 255 * (1 - MIN_MIX));
  const tb = Math.round(b * MIN_MIX + 255 * (1 - MIN_MIX));
  topHSV = rgbToHsv(tr, tg, tb);
  topHSlider.value = topHSV.h;
  topSSlider.value = topHSV.s;
  topVSlider.value = topHSV.v;

  const br = Math.round(r * MIN_MIX);
  const bg = Math.round(g * MIN_MIX);
  const bb = Math.round(b * MIN_MIX);
  botHSV = rgbToHsv(br, bg, bb);
  botHSlider.value = botHSV.h;
  botSSlider.value = botHSV.s;
  botVSlider.value = botHSV.v;
}

// ── Palette ──────────────────────────────────────────────

let kebabDots = null;
const labelCells = [];

const swatches = Array.from({ length: SWATCH_COUNT }, (_, i) => {
  const hexCell = document.createElement('span');
  const rCell   = document.createElement('span');
  const gCell   = document.createElement('span');
  const bCell   = document.createElement('span');
  [hexCell, rCell, gCell, bCell].forEach(el => labelsEl.appendChild(el));
  labelCells.push({ hex: hexCell, r: rCell, g: gCell, b: bCell });

  const div = document.createElement('div');
  div.className = 'swatch' + (i === MIDDLE ? ' swatch-middle' : '');
  if (i === MIDDLE) {
    div.addEventListener('click', openModal);
    kebabDots = document.createElement('div');
    kebabDots.className = 'swatch-kebab';
    kebabDots.innerHTML =
      '<svg viewBox="0 0 20 4" xmlns="http://www.w3.org/2000/svg">' +
      '<circle cx="2" cy="2" r="2"/>' +
      '<circle cx="10" cy="2" r="2"/>' +
      '<circle cx="18" cy="2" r="2"/>' +
      '</svg>';
    div.appendChild(kebabDots);
  }
  paletteEl.appendChild(div);
  return div;
});

function updatePalette(r, g, b) {
  const topRGB = hsvToRgb(topHSV.h, topHSV.s / 100, topHSV.v / 100);
  const botRGB = hsvToRgb(botHSV.h, botHSV.s / 100, botHSV.v / 100);

  for (let i = 0; i < SWATCH_COUNT; i++) {
    let cr, cg, cb;
    if (i <= MIDDLE) {
      const t = i / MIDDLE; // 0 = top color, 1 = base color
      cr = Math.round(topRGB.r * (1 - t) + r * t);
      cg = Math.round(topRGB.g * (1 - t) + g * t);
      cb = Math.round(topRGB.b * (1 - t) + b * t);
    } else {
      const t = (i - MIDDLE) / (SWATCH_COUNT - 1 - MIDDLE); // 0 = base, 1 = bottom
      cr = Math.round(r * (1 - t) + botRGB.r * t);
      cg = Math.round(g * (1 - t) + botRGB.g * t);
      cb = Math.round(b * (1 - t) + botRGB.b * t);
    }
    swatches[i].style.background = `rgb(${cr},${cg},${cb})`;

    const cells = labelCells[i];
    cells.hex.textContent = rgbToHex(cr, cg, cb).slice(1).toUpperCase();
    cells.r.textContent = cr;
    cells.g.textContent = cg;
    cells.b.textContent = cb;

    if (i === MIDDLE && kebabDots) {
      const luma = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255;
      kebabDots.querySelector('svg').style.fill = luma > 0.45 ? '#000' : '#fff';
    }
  }
}

resetEndColors(BASE.r, BASE.g, BASE.b);
updatePalette(BASE.r, BASE.g, BASE.b);

// ── End-color slider events ───────────────────────────────

[topHSlider, topSSlider, topVSlider].forEach(el => {
  el.addEventListener('input', () => {
    topHSV = { h: +topHSlider.value, s: +topSSlider.value, v: +topVSlider.value };
    updatePalette(currentBase.r, currentBase.g, currentBase.b);
  });
});

[botHSlider, botSSlider, botVSlider].forEach(el => {
  el.addEventListener('input', () => {
    botHSV = { h: +botHSlider.value, s: +botSSlider.value, v: +botVSlider.value };
    updatePalette(currentBase.r, currentBase.g, currentBase.b);
  });
});

// ── Modal ─────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function initColorPicker() {
  if (colorPicker) return;

  const width = Math.min(260, window.innerWidth - 80);

  colorPicker = new iro.ColorPicker('#color-wheel-container', {
    width,
    color: rgbToHex(BASE.r, BASE.g, BASE.b),
    borderWidth: 1,
    borderColor: '#374151',
    layout: [
      { component: iro.ui.Slider, options: { sliderType: 'hue' } },
      { component: iro.ui.Slider, options: { sliderType: 'saturation' } },
      { component: iro.ui.Slider, options: { sliderType: 'value' } },
    ],
  });

  colorPicker.on('color:change', (color) => {
    if (syncing) return;
    syncing = true;
    currentBase = { r: color.rgb.r, g: color.rgb.g, b: color.rgb.b };
    resetEndColors(color.rgb.r, color.rgb.g, color.rgb.b);
    colorPreview.style.background = color.hexString;
    hexInput.value = color.hexString.slice(1).toUpperCase();
    rInput.value = color.rgb.r;
    gInput.value = color.rgb.g;
    bInput.value = color.rgb.b;
    updatePalette(color.rgb.r, color.rgb.g, color.rgb.b);
    syncing = false;
  });

  const c = colorPicker.color;
  colorPreview.style.background = c.hexString;
  hexInput.value = c.hexString.slice(1).toUpperCase();
  rInput.value = c.rgb.r;
  gInput.value = c.rgb.g;
  bInput.value = c.rgb.b;
}

function openModal() {
  modal.classList.remove('hidden');
  initColorPicker();
}

function closeModal() {
  modal.classList.add('hidden');
}

backdrop.addEventListener('click', closeModal);

// ── Hex input ─────────────────────────────────────────────

hexInput.addEventListener('input', () => {
  const raw = hexInput.value;
  const clean = raw.replace(/[^0-9a-fA-F]/g, '').toUpperCase();
  if (clean !== raw) hexInput.value = clean;
  if (clean.length === 6 && !syncing && colorPicker) {
    syncing = true;
    colorPicker.color.hexString = '#' + clean;
    const { r, g, b } = colorPicker.color.rgb;
    currentBase = { r, g, b };
    resetEndColors(r, g, b);
    colorPreview.style.background = '#' + clean;
    rInput.value = r;
    gInput.value = g;
    bInput.value = b;
    updatePalette(r, g, b);
    syncing = false;
  }
});

// ── RGB inputs ────────────────────────────────────────────

function syncFromRGB() {
  if (syncing || !colorPicker) return;
  const r = clamp(parseInt(rInput.value) || 0, 0, 255);
  const g = clamp(parseInt(gInput.value) || 0, 0, 255);
  const b = clamp(parseInt(bInput.value) || 0, 0, 255);
  syncing = true;
  colorPicker.color.rgb = { r, g, b };
  currentBase = { r, g, b };
  resetEndColors(r, g, b);
  colorPreview.style.background = colorPicker.color.hexString;
  hexInput.value = colorPicker.color.hexString.slice(1).toUpperCase();
  updatePalette(r, g, b);
  syncing = false;
}

[rInput, gInput, bInput].forEach((input) => {
  input.addEventListener('input', () => {
    let val = input.value.replace(/[^0-9]/g, '');
    if (val !== '' && parseInt(val) > 255) val = '255';
    if (val !== input.value) input.value = val;
    syncFromRGB();
  });

  input.addEventListener('blur', () => {
    const val = clamp(parseInt(input.value) || 0, 0, 255);
    input.value = val;
    syncFromRGB();
  });
});
