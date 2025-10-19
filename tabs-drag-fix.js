// ======================================================================
// TriSports - Drag-to-scroll fallback for iOS Safari
// ======================================================================
(function () {
  var tabs = document.querySelector('header nav.tabs');
  if (!tabs) return;

  // Prevent vertical page scroll when swiping over tabs
  tabs.addEventListener('touchmove', function(e){ e.preventDefault(); }, {passive:false});

  // Drag-to-scroll (touch & mouse)
  var isDown = false, startX = 0, startScroll = 0;

  var onDown = function (clientX) {
    isDown = true;
    startX = clientX;
    startScroll = tabs.scrollLeft;
  };
  var onMove = function (clientX) {
    if (!isDown) return;
    var dx = clientX - startX;
    tabs.scrollLeft = startScroll - dx;
  };
  var onUp = function () { isDown = false; };

  // Touch
  tabs.addEventListener('touchstart', function (e) {
    var t = e.touches && e.touches[0]; if (!t) return;
    onDown(t.clientX);
  }, {passive:true});

  tabs.addEventListener('touchmove', function (e) {
    var t = e.touches && e.touches[0]; if (!t) return;
    onMove(t.clientX);
  }, {passive:false});

  tabs.addEventListener('touchend', onUp, {passive:true});
  tabs.addEventListener('touchcancel', onUp, {passive:true});

  // Mouse / Pointer
  tabs.addEventListener('mousedown', function (e) { onDown(e.clientX); });
  window.addEventListener('mousemove', function (e) { onMove(e.clientX); });
  window.addEventListener('mouseup', onUp);

  // Trackpad vertical scroll -> horizontal scroll
  tabs.addEventListener('wheel', function (e) {
    if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
      tabs.scrollLeft += e.deltaY;
      e.preventDefault();
    }
  }, {passive:false});
})();
