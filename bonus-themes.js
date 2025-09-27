
/* Bonus Pill Theme toggler
   Adds a small control in the bottom-right corner to switch theme.
   Persists selection in localStorage across reloads.
*/
(function(){
  const THEMES = ["flashy","neon","rainbow","glass","fire"];
  const KEY = "bonus-theme";

  // Apply stored theme (or default)
  const saved = localStorage.getItem(KEY);
  if (saved && THEMES.includes(saved)) {
    document.body.setAttribute("data-bonus-theme", saved);
  } else if (!document.body.hasAttribute("data-bonus-theme")) {
    document.body.setAttribute("data-bonus-theme", "flashy");
  }

  // Create UI
  const wrap = document.createElement("div");
  wrap.id = "bonus-theme-toggle";
  wrap.innerHTML = '<span>Style bonus</span>';

  const sel = document.createElement("select");
  THEMES.forEach(t => {
    const opt = document.createElement("option");
    opt.value = t; opt.textContent = t.charAt(0).toUpperCase() + t.slice(1);
    sel.appendChild(opt);
  });
  sel.value = document.body.getAttribute("data-bonus-theme") || "flashy";
  sel.addEventListener("change", () => {
    const v = sel.value;
    document.body.setAttribute("data-bonus-theme", v);
    localStorage.setItem(KEY, v);
  });

  wrap.appendChild(sel);
  document.addEventListener("DOMContentLoaded", () => {
    document.body.appendChild(wrap);
  });
})();
