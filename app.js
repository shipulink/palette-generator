const btn = document.querySelector('.pick-color-btn');
const colorPreview = document.getElementById('color-preview');
const modal = document.getElementById('modal');
const backdrop = document.getElementById('modal-backdrop');
const hexInput = document.getElementById('hex-input');
const rInput = document.getElementById('r-input');
const gInput = document.getElementById('g-input');
const bInput = document.getElementById('b-input');

let colorPicker = null;
let syncing = false;

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
    syncing = false;
  });

  // Populate inputs with initial color
  const c = colorPicker.color;
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

btn.addEventListener('click', openModal);
backdrop.addEventListener('click', closeModal);

// Hex input — strip non-hex chars, sync when 6 chars complete
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
    syncing = false;
  }
});

// RGB inputs — digits only, cap at 255, sync on every keystroke
function syncFromRGB() {
  if (syncing || !colorPicker) return;
  const r = clamp(parseInt(rInput.value) || 0, 0, 255);
  const g = clamp(parseInt(gInput.value) || 0, 0, 255);
  const b = clamp(parseInt(bInput.value) || 0, 0, 255);
  syncing = true;
  colorPicker.color.rgb = { r, g, b };
  colorPreview.style.background = colorPicker.color.hexString;
  hexInput.value = colorPicker.color.hexString.slice(1).toUpperCase();
  syncing = false;
}

[rInput, gInput, bInput].forEach((input) => {
  input.addEventListener('input', () => {
    let val = input.value.replace(/[^0-9]/g, '');
    if (val !== '' && parseInt(val) > 255) val = '255';
    if (val !== input.value) input.value = val;
    syncFromRGB();
  });

  // Clamp and fill empty field on blur
  input.addEventListener('blur', () => {
    const val = clamp(parseInt(input.value) || 0, 0, 255);
    input.value = val;
    syncFromRGB();
  });
});
