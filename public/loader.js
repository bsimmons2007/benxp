// YouXP boot loader — runs before React mounts
(function () {
  var loader = document.getElementById('lxp-loader');
  var bar    = document.getElementById('lxp-bar');
  var title  = document.getElementById('lxp-title');

  if (!loader || !bar || !title) return;

  // Trigger the two-part title animation (You slides down, XP slides up)
  setTimeout(function () { title.classList.add('lxp-v'); }, 80);

  // Start filling the progress bar shortly after
  setTimeout(function () { bar.style.width = '82%'; }, 220);

  // Watch for React to populate #root
  var root     = document.getElementById('root');
  var observer = new MutationObserver(function () {
    if (root && root.children.length > 0) {
      observer.disconnect();
      bar.style.transition = 'width 0.2s ease';
      bar.style.width = '100%';
      setTimeout(function () {
        loader.classList.add('lxp-exit');
        setTimeout(function () { loader.style.display = 'none'; }, 500);
      }, 180);
    }
  });
  observer.observe(root, { childList: true });

  // Safety fallback — dismiss after 5s regardless
  setTimeout(function () {
    observer.disconnect();
    bar.style.transition = 'width 0.2s ease';
    bar.style.width = '100%';
    setTimeout(function () {
      loader.classList.add('lxp-exit');
      setTimeout(function () { loader.style.display = 'none'; }, 500);
    }, 180);
  }, 5000);
})();
