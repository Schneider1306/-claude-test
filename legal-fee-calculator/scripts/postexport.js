// Дорабатывает статический веб-экспорт Expo для установки как PWA на iPhone
// и для публикации через GitHub Pages по адресу /-claude-test/.
//
// Что делает:
//  1. Вставляет в <head> ссылку на manifest, apple-иконки и мета-теги PWA.
//  2. Регистрирует сервис-воркер.
//  3. Делает 404.html копией index.html (клиентская маршрутизация SPA).
//  4. Гарантирует наличие .nojekyll (иначе GitHub Pages прячет папку _expo).

const fs = require('fs');
const path = require('path');

const BASE = '/-claude-test';
const DIST = path.join(__dirname, '..', 'dist');
const INDEX = path.join(DIST, 'index.html');

if (!fs.existsSync(INDEX)) {
  console.error('Не найден dist/index.html. Сначала выполните web-export.');
  process.exit(1);
}

let html = fs.readFileSync(INDEX, 'utf8');

const headTags = `
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#1F3A5F" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="Стоимость юруслуг" />
    <link rel="manifest" href="${BASE}/manifest.webmanifest" />
    <link rel="apple-touch-icon" href="${BASE}/apple-touch-icon.png" />
    <link rel="icon" type="image/png" href="${BASE}/favicon.png" />
`;

const swScript = `
    <script>
      if ('serviceWorker' in navigator) {
        window.addEventListener('load', function () {
          navigator.serviceWorker.register('${BASE}/service-worker.js').catch(function () {});
        });
      }
    </script>
`;

// Удаляем существующий viewport, чтобы не было дублей, затем вставляем наши теги.
html = html.replace(/<meta[^>]*name=["']viewport["'][^>]*>\s*/gi, '');

if (html.includes('</head>')) {
  html = html.replace('</head>', `${headTags}</head>`);
} else {
  html = headTags + html;
}

if (html.includes('</body>')) {
  html = html.replace('</body>', `${swScript}</body>`);
} else {
  html = html + swScript;
}

fs.writeFileSync(INDEX, html, 'utf8');

// SPA-фолбэк: 404.html = index.html (для прямых ссылок и обновления страницы).
fs.writeFileSync(path.join(DIST, '404.html'), html, 'utf8');

// .nojekyll — чтобы GitHub Pages не игнорировал папку _expo.
fs.writeFileSync(path.join(DIST, '.nojekyll'), '', 'utf8');

console.log('PWA-доработка завершена: манифест, иконки, сервис-воркер, 404.html, .nojekyll.');
