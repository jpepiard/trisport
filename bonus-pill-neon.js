
// Tag only the "Bonus" pills with .bonus-pill, no selector UI.
(function(){
  function tagBonusPills() {
    document.querySelectorAll('.pill').forEach(p => {
      // Heuristic: Bonus pills contain the label "Bonus" and a .mini-bonus image span
      if (p.textContent && p.textContent.trim().toLowerCase().startsWith('bonus') && p.querySelector('.mini-bonus')) {
        p.classList.add('bonus-pill');
      }
    });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", tagBonusPills);
  } else {
    tagBonusPills();
  }

  // If your app re-renders dynamically, observe mutations to keep class applied
  const mo = new MutationObserver(() => tagBonusPills());
  mo.observe(document.documentElement, { childList: true, subtree: true });
})();
