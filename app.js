const modal = document.getElementById('modal');
const backdrop = document.getElementById('modal-backdrop');
const colorPreview = document.getElementById('color-preview');
const hexInput = document.getElementById('hex-input');
const rInput = document.getElementById('r-input');
const gInput = document.getElementById('g-input');
const bInput = document.getElementById('b-input');
const paletteEl = document.getElementById('palette');

let colorPicker = null;
let syncing = false;

// ── Palette ──────────────────────────────────────────────

const SWATCH_COUNT = 7;
const MIDDLE = 3;
const MIN_MIX = 0.1; // how close top/bottom get to white/black

let kebabDots = null;

const swatches = Array.from({ length: SWATCH_COUNT }, (_, i) => {
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
  for (let i = 0; i < SWATCH_COUNT; i++) {
    let cr, cg, cb;
    if (i <= MIDDLE) {
      // Tint: blend toward white
      const t = MIN_MIX + (1 - MIN_MIX) * (i / MIDDLE);
      cr = Math.round(r * t + 255 * (1 - t));
      cg = Math.round(g * t + 255 * (1 - t));
      cb = Math.round(b * t + 255 * (1 - t));
    } else {
      // Shade: blend toward black
      const t = 1 - (1 - MIN_MIX) * ((i - MIDDLE) / (SWATCH_COUNT - 1 - MIDDLE));
      cr = Math.round(r * t);
      cg = Math.round(g * t);
      cb = Math.round(b * t);
    }
    swatches[i].style.background = `rgb(${cr},${cg},${cb})`;
    if (i === MIDDLE && kebabDots) {
      const luma = (0.299 * cr + 0.587 * cg + 0.114 * cb) / 255;
      kebabDots.querySelector('svg').style.fill = luma > 0.45 ? '#000' : '#fff';
    }
  }
}

updatePalette(255, 0, 0);

// ── Modal ─────────────────────────────────────────────────

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function initColorPicker() {
  if (colorPicker) return;

  const width = Math.min(260, window.innerWidth - 80);

  colorPicker = new iro.ColorPicker('#color-wheel-container', {
    width,
    color: '#ff0000',
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
    colorPreview.style.background = '#' + clean;
    rInput.value = colorPicker.color.rgb.r;
    gInput.value = colorPicker.color.rgb.g;
    bInput.value = colorPicker.color.rgb.b;
    updatePalette(colorPicker.color.rgb.r, colorPicker.color.rgb.g, colorPicker.color.rgb.b);
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
