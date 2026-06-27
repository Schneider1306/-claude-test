'use strict';

/* ================================================================
   INTRO
   ================================================================ */
(function () {
  const intro = document.getElementById('intro');
  if (!intro) return;

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro.remove();
    return;
  }

  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  history.scrollRestoration = 'manual';

  let done = false;

  function unlock() {
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    window.scrollTo(0, 0);
    intro.remove();
    revealHero();
  }

  function onAnimEnd(e) {
    if (e.animationName !== 'introFade') return;
    if (done) return;
    done = true;
    unlock();
  }

  // CSS animation drives the 25 s sequence; animationend is the trigger
  intro.addEventListener('animationend', onAnimEnd);
  // Fallback for iOS Safari where animationend can be unreliable
  setTimeout(function () { if (!done) { done = true; unlock(); } }, 25500);

  // Tap anywhere to skip
  intro.addEventListener('click', function () {
    if (done) return;
    done = true;
    intro.style.animation = 'none';
    void intro.offsetHeight;
    intro.style.transition = 'opacity 0.4s ease';
    intro.style.opacity = '0';
    revealHero();
    setTimeout(unlock, 400);
  }, { once: true });
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

  burger.addEventListener('click', (e) => {
    e.stopPropagation();
    burger.getAttribute('aria-expanded') === 'true' ? closeMenu() : openMenu();
  });

  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', closeMenu));

  // Close on outside click
  document.addEventListener('click', e => {
    if (
      menu.classList.contains('open') &&
      !menu.contains(e.target) &&
      !burger.contains(e.target)
    ) {
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
   ABOUT — expand / collapse (mobile)
   ================================================================ */
(function () {
  const btn   = document.getElementById('aboutExpand');
  const extra = document.getElementById('aboutExtra');
  if (!btn || !extra) return;

  btn.addEventListener('click', function () {
    const open = extra.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.querySelector('span').textContent = open ? 'Свернуть' : 'Подробнее';
  });
})();

/* ================================================================
   BACK TO TOP
   ================================================================ */
(function () {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      btn.classList.toggle('visible', window.scrollY > 800);
      ticking = false;
    });
  }, { passive: true });

  btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
})();

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
