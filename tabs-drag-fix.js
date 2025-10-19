// ======================================================================
// TriSports - Robust drag-to-scroll for iOS (Safari/Chrome/Edge)
// - Waits for DOM ready
// - Retries with MutationObserver if tabs appear later
// - Works even when parents interfere with native scrolling
// ======================================================================
(function () {
  var SELECTORS = [
    'header nav.tabs',
    'header .container nav.tabs',
    'nav.tabs',
    '[data-tabs]',
    '.tabs-nav'
  ];

  function findTabs() {
    for (var i = 0; i < SELECTORS.length; i++) {
      var el = document.querySelector(SELECTORS[i]);
      if (el) return el;
    }
    return null;
  }

  function ensureStyles(el) {
    if (!el) return;
    try {
      el.style.overflowX = 'scroll';
      el.style.overflowY = 'hidden';
      el.style.whiteSpace = 'nowrap';
      el.style.webkitOverflowScrolling = 'touch';
      el.style.touchAction = 'pan-x'; // iOS may ignore, but harmless
      el.style.minWidth = '0';
    } catch (e) {}
  }

  function install(el) {
    if (!el || el.__tabsDragInstalled) return;
    el.__tabsDragInstalled = true;
    ensureStyles(el);

    // Prevent vertical page scroll when swiping over the tabs
    var isDown = false, startX = 0, startScroll = 0;

    function onDown(clientX) {
      isDown = true;
      startX = clientX;
      startScroll = el.scrollLeft;
      // Disable native momentum during drag to avoid drift
      el.style.webkitOverflowScrolling = 'auto';
    }
    function onMove(clientX) {
      if (!isDown) return;
      var dx = clientX - startX;
      el.scrollLeft = startScroll - dx;
    }
    function onUp() {
      if (!isDown) return;
      isDown = false;
      // Re-enable momentum after drag
      el.style.webkitOverflowScrolling = 'touch';
    }

    // Touch handlers (iOS)
    el.addEventListener('touchstart', function (e) {
      var t = e.touches && e.touches[0]; if (!t) return;
      onDown(t.clientX);
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      var t = e.touches && e.touches[0]; if (!t) return;
      // Block vertical scrolling of the page while dragging horizontally
      e.preventDefault(); // requires passive:false
      onMove(t.clientX);
    }, { passive: false });

    el.addEventListener('touchend', onUp, { passive: true });
    el.addEventListener('touchcancel', onUp, { passive: true });

    // Mouse (for desktop testing)
    el.addEventListener('mousedown', function (e) { onDown(e.clientX); });
    window.addEventListener('mousemove', function (e) { onMove(e.clientX); });
    window.addEventListener('mouseup', onUp);

    // Convert vertical wheel to horizontal scroll (trackpads)
    el.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        el.scrollLeft += e.deltaY;
        e.preventDefault();
      }
    }, { passive: false });

    // If parents toggle styles dynamically, periodically re-assert ours (cheap)
    var last = 0;
    setInterval(function () {
      var now = el.scrollWidth;
      if (now !== last) {
        ensureStyles(el);
        last = now;
      }
    }, 1000);
  }

  function init() {
    var el = findTabs();
    if (el) install(el);

    // In case the header is rendered later (SPA / frameworks)
    var mo = new MutationObserver(function () {
      var el2 = findTabs();
      if (el2) install(el2);
    });
    mo.observe(document.documentElement, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
