'use strict';

/* ================================================================
   INTRO
   ================================================================ */
(function () {
  const intro = document.getElementById('intro');
  if (!intro) return;

  // Respect prefers-reduced-motion
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro.remove();
    return;
  }

  const logo = intro.querySelector('.intro__logo');
  const seen = sessionStorage.getItem('fj_intro_v2');

  // Lock body scroll while intro shows
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  history.scrollRestoration = 'manual';

  const APPEAR_MS = seen ? 500  : 1600;
  const HOLD_MS   = seen ? 300  : 5000;
  const FADE_MS   = seen ? 500  : 1400;

  function unlockAndReveal() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.scrollTo(0, 0);
    intro.remove();
    revealHero();
  }

  function dismissIntro() {
    setTimeout(revealHero, FADE_MS / 2);
    intro.style.transition = `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`;
    intro.style.opacity = '0';
    setTimeout(unlockAndReveal, FADE_MS);
  }

  function runIntro() {
    sessionStorage.setItem('fj_intro_v2', '1');
    logo.style.transition = [
      `opacity ${APPEAR_MS}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
      `transform ${APPEAR_MS}ms cubic-bezier(0.16, 0.84, 0.44, 1)`,
    ].join(', ');

    requestAnimationFrame(() => requestAnimationFrame(() => {
      logo.style.opacity = '1';
      logo.style.transform = 'translateY(0) scale(1)';
      setTimeout(dismissIntro, APPEAR_MS + HOLD_MS);
    }));
  }

  intro.addEventListener('click', function onSkip() {
    intro.removeEventListener('click', onSkip);
    revealHero();
    intro.style.transition = 'opacity 0.4s ease';
    intro.style.opacity = '0';
    setTimeout(unlockAndReveal, 400);
  });

  runIntro();
})();

/* ================================================================
   SCROLL REVEAL
   ================================================================ */
let heroRevealed = false;

function revealHero() {
  if (heroRevealed) return;
  heroRevealed = true;
  document.querySelectorAll('.hero [data-reveal]').forEach(el => {
    el.classList.add('visible');
  });
}

function setupReveal() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      target.classList.add('visible');
      io.unobserve(target);
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -24px 0px' });

  document.querySelectorAll('[data-reveal]').forEach(el => {
    // Hero elements are handled by revealHero(); skip if already visible
    if (!el.classList.contains('visible')) {
      io.observe(el);
    }
  });
}

/* ================================================================
   HEADER — shadow on scroll
   ================================================================ */
(function () {
  const header = document.getElementById('header');
  if (!header) return;
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      header.classList.toggle('scrolled', window.scrollY > 16);
      ticking = false;
    });
  }, { passive: true });
})();

/* ================================================================
   MOBILE MENU
   ================================================================ */
(function () {
  const burger = document.getElementById('burger');
  const menu   = document.getElementById('mobileMenu');
  if (!burger || !menu) return;

  function openMenu()  {
    burger.setAttribute('aria-expanded', 'true');
    menu.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeMenu() {
    burger.setAttribute('aria-expanded', 'false');
    menu.classList.remove('open');
    document.body.style.overflow = '';
  }

  burger.addEventListener('click', () => {
    burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  // Close on outside click
  document.addEventListener('click', e => {
    if (menu.classList.contains('open') && !menu.contains(e.target) && e.target !== burger) {
      closeMenu();
    }
  });
})();

/* ================================================================
   ACCORDION — practice (mobile) + FAQ
   ================================================================ */
function setupAccordions() {
  document.querySelectorAll('.acc-trigger, .faq-trigger').forEach(trigger => {
    trigger.addEventListener('click', function () {
      const expanded = this.getAttribute('aria-expanded') === 'true';
      const body = this.nextElementSibling;

      // Close other items in the same group
      const group = this.closest('.practice-accordion, .faq-list');
      if (group) {
        group.querySelectorAll('[aria-expanded="true"]').forEach(other => {
          if (other !== this) {
            other.setAttribute('aria-expanded', 'false');
            other.nextElementSibling.style.maxHeight = null;
          }
        });
      }

      this.setAttribute('aria-expanded', String(!expanded));
      body.style.maxHeight = expanded ? null : body.scrollHeight + 'px';
    });
  });
}

/* ================================================================
   INIT
   ================================================================ */
document.addEventListener('DOMContentLoaded', () => {
  setupAccordions();
  setupReveal();

  // If intro was removed (no-JS noscript or reduced-motion), reveal hero now
  if (!document.getElementById('intro')) {
    revealHero();
  }
});
