// YouXP boot loader — runs before React mounts
// Animates letters dropping in, fills progress bar, then slides up when React is ready
(function () {
  var loader  = document.getElementById('lxp-loader');
  var bar     = document.getElementById('lxp-bar');
  var letters = document.querySelectorAll('#lxp-title span');

  if (!loader || !bar) return;

  // Stagger letters dropping in
  letters.forEach(function (el, i) {
    setTimeout(function () { el.classList.add('lxp-v'); }, 80 + i * 90);
  });

  // Start progress bar after short delay
  setTimeout(function () { bar.style.width = '85%'; }, 200);

  // Watch for React root being populated
  var root = document.getElementById('root');
  var observer = new MutationObserver(function () {
    if (root && root.children.length > 0) {
      observer.disconnect();
      // Fill bar to 100%
      bar.style.transition = 'width 0.25s ease';
      bar.style.width = '100%';
      setTimeout(function () {
        loader.classList.add('lxp-exit');
        setTimeout(function () { loader.style.display = 'none'; }, 450);
      }, 200);
    }
  });
  observer.observe(root, { childList: true });

  // Safety fallback — dismiss after 4s regardless
  setTimeout(function () {
    observer.disconnect();
    bar.style.transition = 'width 0.2s ease';
    bar.style.width = '100%';
    setTimeout(function () {
      loader.classList.add('lxp-exit');
      setTimeout(function () { loader.style.display = 'none'; }, 450);
    }, 200);
  }, 4000);
})();
