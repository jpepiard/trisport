
/* TriSports — Match Cards Enhancer (idempotent) */
(function(){
  function enhance(){
    // Sport pills: try to detect by text content
    document.querySelectorAll('.match-card .hd .pill, .match-card .hd .chip').forEach(el=>{
      const t = (el.textContent || '').trim().toLowerCase();
      // mark "Complet"
      if (/^complet/.test(t) && !el.classList.contains('is-complete')){
        el.classList.add('pill','is-complete');
      }
      // sport detection
      let sport = null;
      if (t.startsWith('fléchettes') || t.startsWith('flechettes')) sport = 'darts';
      else if (t.startsWith('ping')) sport = 'ping';
      else if (t.startsWith('palet')) sport = 'palet';

      if (sport && !el.classList.contains('sport')){
        el.classList.add('sport', sport, 'pill');
        // split "Label: X-Y"
        const m = t.match(/^[^:]+:\s*([0-9]+)\s*[-–]\s*([0-9]+)/);
        const score = m ? (m[1]+'-'+m[2]) : (t.split(':').slice(1).join(':') || '');
        const label = (el.textContent.split(':')[0] || '').trim();
        el.innerHTML = '<span class="label">'+label+'</span>'
                     + '<span class="dot" aria-hidden="true"></span>';
        if (score){
          el.innerHTML += '<span class="score">'+score.trim()+'</span>';
        }
      }

      // bonus +/- detection
      if (t.includes('bonus') || t.includes('capitaine') || t.includes('miroir')){
        el.classList.add('bonus','pill');
        const plus = /[+]\s*\d+/.exec(t);
        const minus = /[-]\s*\d+/.exec(t);
        if (plus) el.classList.add('pos');
        if (minus) el.classList.add('neg');
        // Wrap numeric value if any
        if (!el.querySelector('.value')){
          el.innerHTML = el.innerHTML.replace(/([+\-]\s*\d+)/, '<span class="value">$1</span>');
        }
      }
    });
  }

  // Run after initial render and whenever matches update
  const mo = new MutationObserver(enhance);
  mo.observe(document.body, {subtree:true, childList:true});
  if (document.readyState !== 'loading') enhance();
  else document.addEventListener('DOMContentLoaded', enhance);
})();
