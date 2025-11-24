// ========== Debug (MOBILE system): press "D" to toggle ==========
(function () {
  const KEY = 'debug.v2';
  const root = document.documentElement;

  function isOn() { return root.getAttribute('data-debug') === '1'; }
  function set(on) {
    if (on) root.setAttribute('data-debug','1'); else root.removeAttribute('data-debug');
    localStorage.setItem(KEY, on ? '1' : '0');
    ensureLegend(on);
  }
  function ensureLegend(on) {
    let el = document.getElementById('debugLegend');
    if (!on) { if (el) el.remove(); return; }
    if (el) return;
    el = document.createElement('div');
    el.id = 'debugLegend';
    el.innerHTML = `
      <div class="row"><span class="sw blue"></span> Sections</div>
      <div class="row"><span class="sw green"></span> Containers / Cards</div>
      <div class="row"><span class="sw purple"></span> Measures / Gutters</div>
      <div class="row"><span class="sw orange"></span> Interactive</div>
      <div class="muted">Press “D” to toggle</div>
    `;
    document.body.appendChild(el);
  }

  // init from storage
  set(localStorage.getItem(KEY) === '1');

  // keyboard toggle
  document.addEventListener('keydown', (e) => {
    if (e.key.toLowerCase() !== 'd') return;
    set(!isOn());
  }, { passive: true });
})();

// ========== Timeline date width sync ==========
(function () {
  const TIMELINE_SELECTOR = '.section--timeline';
  const FIRST_DATE_SELECTOR = '.timeline-item:first-child .timeline-column--date';
  let rafId = 0;

  function measureAndApply() {
    rafId = 0;
    const timeline = document.querySelector(TIMELINE_SELECTOR);
    if (!timeline) return;
    const firstDateColumn = timeline.querySelector(FIRST_DATE_SELECTOR);
    if (!firstDateColumn) return;
    const width = firstDateColumn.getBoundingClientRect().width;
    if (!width) {
      timeline.style.removeProperty('--timeline-date-col');
      return;
    }
    timeline.style.setProperty('--timeline-date-col', `${width}px`);
  }

  function scheduleMeasurement() {
    if (rafId) return;
    rafId = window.requestAnimationFrame(measureAndApply);
  }

  function initTimelineWidthSync() {
    scheduleMeasurement();
    window.addEventListener('resize', scheduleMeasurement, { passive: true });
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(scheduleMeasurement).catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTimelineWidthSync, { once: true });
  } else {
    initTimelineWidthSync();
  }
})();

// ========== Theme Handling (Light/Dark toggle only) ==========
const root = document.documentElement;
const toggle = document.getElementById('themeToggle');
const footerLogo = document.getElementById('footerLogo');
const THEME_KEY = 'theme-mode';

function updateFooterLogo(mode) {
  if (!footerLogo) return;
  footerLogo.src = mode === 'dark' ? 'logo-white.svg' : 'logo-black.svg';
}

function updateContactIcons(mode) {
  const icons = document.querySelectorAll('.contact-icon');
  icons.forEach((icon) => {
    const lightSrc = icon.dataset.lightSrc || icon.getAttribute('src');
    const darkSrc = icon.dataset.darkSrc || lightSrc;
    const nextSrc = mode === 'dark' ? darkSrc : lightSrc;
    if (nextSrc && icon.getAttribute('src') !== nextSrc) {
      icon.setAttribute('src', nextSrc);
    }
  });
}

// Detect system preference once (used if no saved choice)
const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

function applyTheme(mode) {
  root.setAttribute('data-theme', mode);
  if (toggle) toggle.textContent = mode.charAt(0).toUpperCase() + mode.slice(1);
  updateFooterLogo(mode);
  updateContactIcons(mode);
}
function getCurrentTheme() {
  const saved = localStorage.getItem(THEME_KEY);
  if (saved === 'light' || saved === 'dark') return saved;
  return systemPrefersDark ? 'dark' : 'light';
}
function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'light' ? 'dark' : 'light';
  localStorage.setItem(THEME_KEY, next);
  applyTheme(next);
  document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: next } }));
}
if (toggle) {
  toggle.addEventListener('click', toggleTheme);
  applyTheme(getCurrentTheme());
} else {
  applyTheme(getCurrentTheme());
}


// ========== Header text fitting (fills target width) ==========
(function fitHeader() {
  const measureEl = document.querySelector('#header .header-measure');
  const textEl = document.getElementById('headerText');
  if (!measureEl || !textEl) return;

  const words = Array.from(textEl.querySelectorAll('.header-text__word'));
  if (words.length === 0) return;

  function targetWidth() { return measureEl.clientWidth; }

  function fitWord(word, maxWidth) {
    word.style.fontSize = '50px';
    word.style.display = 'inline-block';
    word.style.whiteSpace = 'nowrap';
    word.style.width = 'auto';

    let low = 6, high = 2400;
    for (let i = 0; i < 22; i++) {
      const mid = (low + high) / 2;
      word.style.fontSize = mid + 'px';
      const w = word.scrollWidth;
      if (w > maxWidth) high = mid; else low = mid;
    }

    word.style.fontSize = (low - 0.5) + 'px';
    word.style.display = 'block';
    word.style.whiteSpace = '';
    word.style.width = '100%';
  }

    function fit() {
      const maxW = targetWidth();
      if (maxW <= 0) return;

      textEl.style.whiteSpace = '';
      textEl.style.display = '';
      textEl.style.width = '';
      textEl.style.fontSize = '';

      words.forEach(word => {
        word.style.fontSize = '';
        word.style.display = '';
        word.style.whiteSpace = '';
        word.style.width = '';
        fitWord(word, maxW);
      });
    }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(fit);
    ro.observe(measureEl);
  } else {
    window.addEventListener('resize', fit, { passive: true });
  }

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(fit);
    } else {
    setTimeout(fit, 0);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fit();
  });

  fit();
})();

// ========== Subhead: line-by-line text fitting within the box ==========
(function fitSubhead() {
  const box = document.querySelector('#subhead .subhead-box');
  const lines = document.querySelectorAll('#subhead .subhead-line');
  if (!box || lines.length === 0) return;

  function paddingX(el) {
    const cs = getComputedStyle(el);
    return (parseFloat(cs.paddingLeft) || 0) + (parseFloat(cs.paddingRight) || 0);
  }

  function fitLine(line, maxWidth) {
    line.style.display = 'inline-block';
    line.style.whiteSpace = 'nowrap';

    let low = 6, high = 320; // safe bounds for subhead
    for (let i = 0; i < 18; i++) {
      const mid = (low + high) / 2;
      line.style.fontSize = mid + 'px';
      const w = line.scrollWidth;
      if (w > maxWidth) high = mid; else low = mid;
    }
    line.style.fontSize = (low - 0.5) + 'px';
  }

  function fitAll() {
    const maxW = box.clientWidth - paddingX(box);
    if (maxW <= 0) return;
    lines.forEach(line => fitLine(line, maxW));
  }

  if ('ResizeObserver' in window) {
    const ro = new ResizeObserver(fitAll);
    ro.observe(box);
  } else {
    window.addEventListener('resize', fitAll, { passive: true });
  }

  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(fitAll);
  } else {
    setTimeout(fitAll, 0);
  }

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) fitAll();
  });

  fitAll();
})();

  // ========== Mount demos on DOM ready ==========
  document.addEventListener('DOMContentLoaded', () => {
    // Make the SUBHEAD ARROW act as the theme toggle (click/keyboard)
  const arrow = document.querySelector('#subhead .subhead-arrow');
  if (arrow) {
    arrow.setAttribute('role', 'button');
    arrow.setAttribute('tabindex', '0');
    arrow.setAttribute('aria-label', 'Toggle theme (Light/Dark)');
    arrow.addEventListener('click', toggleTheme);
    arrow.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggleTheme();
      }
    });
  }
});
