const ENDPOINT = '/api/waitlist';
/** Design preview build (GitHub Pages): no backend, so sign-up only shows the success state. */
const PREVIEW = document.documentElement.hasAttribute('data-preview');
const PREVIEW_DELAY_MS = 500;
const LANG_KEY = 'casus_lang';
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TILE = 56;
/** Polish typesetting: a one-letter word never ends a line, so it is glued to the next word. */
const ORPHAN_RE = /(?<=^|[\s„(])([aiouwzAIOUWZ]) /g;

const COPY = {
  pl: {
    langSwitch: 'EN',
    langSwitchLang: 'en',
    login: 'Zaloguj',
    eyebrow: 'Przedpremiera',
    title: 'Asystent AI dla lekarzy',
    emailLabel: 'Adres e-mail',
    emailPlaceholder: 'twoj@adres.pl',
    submit: 'Zapisz się na listę',
    note: 'Rejestracja jest zamknięta. Powiadomimy Cię, gdy pojawi się miejsce.',
    f1t: 'Leki',
    f1d: 'Charakterystyki, dawkowanie, interakcje i refundacja z ministerialnej bazy leków.',
    f2t: 'Wytyczne',
    f2d: 'Odpowiedzi osadzone w aktualnych wytycznych, z odnośnikiem do fragmentu.',
    f3t: 'Kody ICD',
    f3d: 'ICD-10 i ICD-9 PL bez ręcznego przeszukiwania tabel.',
    invalid: 'Podaj poprawny adres e-mail.',
    sending: 'Wysyłanie…',
    ok: 'Dziękujemy. Jesteś na liście.',
    error: 'Nie udało się zapisać. Spróbuj ponownie za chwilę.',
    previewNote: 'Podgląd projektu: formularz nie zapisuje adresów.',
  },
  en: {
    langSwitch: 'PL',
    langSwitchLang: 'pl',
    login: 'Log in',
    eyebrow: 'Preview',
    title: 'An AI assistant for physicians',
    emailLabel: 'Email address',
    emailPlaceholder: 'you@example.com',
    submit: 'Join the waitlist',
    note: 'Registration is closed. We will let you know when a seat opens up.',
    f1t: 'Drugs',
    f1d: 'Summaries of product characteristics, dosing, interactions and reimbursement from the national drug database.',
    f2t: 'Guidelines',
    f2d: 'Answers grounded in current guidelines, with a link to the passage.',
    f3t: 'ICD codes',
    f3d: 'ICD-10 and ICD-9 PL without paging through tables.',
    invalid: 'Enter a valid email address.',
    sending: 'Sending…',
    ok: 'Thank you. You are on the list.',
    error: 'Could not save your address. Please try again shortly.',
    previewNote: 'Design preview: the form does not save addresses.',
  },
};

const readLang = () => {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    return stored in COPY ? stored : 'pl';
  } catch {
    return 'pl';
  }
};

const saveLang = (lang) => {
  try {
    localStorage.setItem(LANG_KEY, lang);
  } catch {
    /* private mode: the choice lasts for this page view only */
  }
};

let lang = readLang();
let statusKey = '';

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

const t = (key) => {
  const text = COPY[lang][key];
  return lang === 'pl' ? text.replace(ORPHAN_RE, '$1\u00a0') : text;
};

function setStatus(key, kind = '') {
  const status = document.getElementById('status');
  statusKey = key;
  status.textContent = key ? t(key) : '';
  status.dataset.kind = kind;
}

function applyLang() {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const toggle = document.getElementById('lang');
  toggle.textContent = t('langSwitch');
  toggle.lang = t('langSwitchLang');
  setStatus(statusKey, document.getElementById('status').dataset.kind);
}

/** FNV-1a: the same seed always yields the same pattern. */
const hash = (text) => {
  let x = 2166136261;
  for (let i = 0; i < text.length; i++) {
    x ^= text.charCodeAt(i);
    x = Math.imul(x, 16777619);
  }
  return x >>> 0;
};

/** First Mulberry32 draw: spreads the hash evenly so neighbouring tiles do not line up. */
const mulberry32 = (seed) => {
  let a = (seed + 0x6d2b79f5) | 0;
  a = Math.imul(a ^ (a >>> 15), 1 | a);
  a = (a + Math.imul(a ^ (a >>> 7), 61 | a)) ^ a;
  return ((a ^ (a >>> 14)) >>> 0) / 4294967296;
};

/** Two quarter arcs of a Smith tile, centred on the origin so CSS rotation turns it in place. */
const arcs = () => {
  const h = TILE / 2;
  return `M0 ${-h}A${h} ${h} 0 0 1 ${-h} 0M${h} 0A${h} ${h} 0 0 0 0 ${h}`;
};

const SPOT = 340;
const SPOT_EASE = 0.2;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

/**
 * Truchet–Smith pattern in three copies: a faint base, a glow copy inside a band of light that
 * sweeps across (CSS, composite-only) and a glow copy inside a spotlight that trails the pointer.
 * Each glow copy is counter-translated so its lines stay registered with the base. On a mouse,
 * the tile under the pointer turns a quarter, so the paths can be played with.
 */
function createPattern(host, area, seed) {
  const base = document.getElementById('pattern');
  const spot = document.getElementById('spot');
  const layers = [base, document.getElementById('pattern-wave'), document.getElementById('pattern-spot')];
  const spotLayer = layers[2];
  const d = arcs();
  let tiles = [];
  let angles = [];
  let cols = 0;
  let rows = 0;
  let last = -1;

  const build = () => {
    const nextCols = Math.ceil(host.clientWidth / TILE);
    const nextRows = Math.ceil(host.clientHeight / TILE);
    if (nextCols === cols && nextRows === rows) {
      return;
    }
    cols = nextCols;
    rows = nextRows;
    const width = cols * TILE;
    const height = rows * TILE;
    const ns = 'http://www.w3.org/2000/svg';
    const fragments = layers.map(() => document.createDocumentFragment());
    tiles = new Array(cols * rows);
    angles = new Array(cols * rows);
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const index = i * cols + j;
        angles[index] = mulberry32(hash(`${seed}:${i}:${j}`)) < 0.5 ? 90 : 0;
        tiles[index] = fragments.map((fragment) => {
          const group = document.createElementNS(ns, 'g');
          const path = document.createElementNS(ns, 'path');
          group.setAttribute('transform', `translate(${j * TILE + TILE / 2} ${i * TILE + TILE / 2})`);
          path.setAttribute('d', d);
          path.style.transform = `rotate(${angles[index]}deg)`;
          group.appendChild(path);
          fragment.appendChild(group);
          return path;
        });
      }
    }
    layers.forEach((svg, k) => {
      svg.setAttribute('width', String(width));
      svg.setAttribute('height', String(height));
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      svg.replaceChildren(fragments[k]);
    });
    base.parentElement.classList.add('ready');
  };

  const turn = (index) => {
    angles[index] += 90;
    const transform = `rotate(${angles[index]}deg)`;
    for (const path of tiles[index]) {
      path.style.transform = transform;
    }
  };

  const target = { x: 0, y: 0 };
  const current = { x: 0, y: 0 };
  let spotFrame = 0;
  let visible = false;

  const placeSpot = () => {
    const x = current.x - SPOT / 2;
    const y = current.y - SPOT / 2;
    spot.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    spotLayer.style.transform = `translate3d(${-x}px, ${-y}px, 0)`;
  };

  /** Decorative trailing: the light eases toward the pointer instead of being glued to it. */
  const followPointer = () => {
    const ease = reduceMotion.matches ? 1 : SPOT_EASE;
    current.x += (target.x - current.x) * ease;
    current.y += (target.y - current.y) * ease;
    placeSpot();
    const settled = Math.abs(target.x - current.x) < 0.5 && Math.abs(target.y - current.y) < 0.5;
    spotFrame = settled ? 0 : requestAnimationFrame(followPointer);
  };

  const hideSpot = () => {
    last = -1;
    visible = false;
    spot.classList.remove('on');
  };

  const onPointerMove = (event) => {
    if (!finePointer.matches) {
      return;
    }
    const rect = base.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    if (x < 0 || y < 0 || x >= host.clientWidth || y >= host.clientHeight) {
      hideSpot();
      return;
    }
    target.x = x;
    target.y = y;
    if (!visible) {
      visible = true;
      current.x = x;
      current.y = y;
      placeSpot();
      spot.classList.add('on');
    }
    if (!spotFrame) {
      spotFrame = requestAnimationFrame(followPointer);
    }
    if (reduceMotion.matches) {
      return;
    }
    const index = Math.floor(y / TILE) * cols + Math.floor(x / TILE);
    if (index !== last && tiles[index]) {
      last = index;
      turn(index);
    }
  };

  let frame = 0;
  new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(build);
  }).observe(host);
  area.addEventListener('pointermove', onPointerMove);
  area.addEventListener('pointerleave', hideSpot);
  build();
}

async function submitEmail(email) {
  if (PREVIEW) {
    await new Promise((resolve) => setTimeout(resolve, PREVIEW_DELAY_MS));
    return 'ok';
  }
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, lang }),
  });
  if (response.ok) {
    return 'ok';
  }
  return response.status === 400 ? 'invalid' : 'error';
}

function initForm() {
  const form = document.getElementById('waitlist');
  const email = document.getElementById('email');
  const button = form.querySelector('button[type="submit"]');
  const done = document.getElementById('done');

  const markInvalid = (invalid) => {
    if (invalid) {
      email.setAttribute('aria-invalid', 'true');
      return;
    }
    email.removeAttribute('aria-invalid');
  };

  email.addEventListener('input', () => markInvalid(false));

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = email.value.trim();
    if (!EMAIL_RE.test(value)) {
      markInvalid(true);
      setStatus('invalid', 'error');
      email.focus();
      return;
    }

    button.disabled = true;
    setStatus('sending');
    let result = 'error';
    try {
      result = await submitEmail(value);
    } catch {
      result = 'error';
    }
    button.disabled = false;

    if (result !== 'ok') {
      markInvalid(result === 'invalid');
      setStatus(result, 'error');
      return;
    }
    setStatus('');
    form.hidden = true;
    done.hidden = false;
    done.focus();
  });
}

function init() {
  document.getElementById('lang').addEventListener('click', () => {
    lang = lang === 'pl' ? 'en' : 'pl';
    saveLang(lang);
    applyLang();
  });
  document.getElementById('preview-note').hidden = !PREVIEW;
  applyLang();
  initForm();
  createPattern(document.getElementById('backdrop'), document.querySelector('.hero'), 'casus');
}

init();
