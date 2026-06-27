document.addEventListener('DOMContentLoaded', () => {
  const intro = document.getElementById('courtIntro');
  const h1    = document.querySelector('.hero h1');

  // Empty h1 now — intro overlay covers it while we wait
  if (h1?.dataset.text) h1.textContent = '';

  // After intro fades out: remove it, then start typewriter
  intro.addEventListener('animationend', (e) => {
    if (e.target !== intro) return;
    intro.remove();
    if (h1?.dataset.text) {
      typewriter(h1, h1.dataset.text, 32, () => {
        document.querySelector('.hero__sub')?.classList.add('revealed');
        document.querySelector('.hero .btn')?.classList.add('revealed');
      });
    }
  });

  // Scroll-reveal with per-element stagger
  const io = new IntersectionObserver((entries) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (isIntersecting) {
        target.classList.add('revealed');
        io.unobserve(target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' });

  document.querySelectorAll('.reveal').forEach((el, i) => {
    el.style.setProperty('--stagger', `${(i % 4) * 0.1}s`);
    io.observe(el);
  });

  // Gavel-strike on CTA button clicks
  document.querySelectorAll('.btn').forEach(btn => {
    btn.addEventListener('click', function () {
      this.classList.add('btn--strike');
      setTimeout(() => this.classList.remove('btn--strike'), 280);
    });
  });
});

function typewriter(el, text, speed, onDone) {
  const cursor = document.createElement('span');
  cursor.className = 'tw-cursor';
  el.appendChild(cursor);
  let i = 0;
  const t = setInterval(() => {
    if (i < text.length) {
      cursor.before(text.charAt(i++));
    } else {
      clearInterval(t);
      onDone?.();
      setTimeout(() => cursor.classList.add('tw-cursor--done'), 1100);
    }
  }, speed);
}
