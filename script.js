document.addEventListener('DOMContentLoaded', () => {
  const h1   = document.querySelector('.hero h1');
  const text = h1?.dataset.text || '';

  if (h1 && text) {
    h1.textContent = '';
    typewriter(h1, text, 32, () => {
      document.querySelector('.hero__sub')?.classList.add('revealed');
      document.querySelector('.hero .btn')?.classList.add('revealed');
    });
  }

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
