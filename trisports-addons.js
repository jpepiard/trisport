
(function(){
  'use strict';

  const LS_KEY = 'trisports.lastTab';

  function getTabsWrap(){ return document.getElementById('tabs'); }
  function getAllTabs(){
    const w = getTabsWrap(); if(!w) return [];
    return Array.from(w.querySelectorAll('[role="tab"][data-tab]'));
  }
  function getSections(){ return Array.from(document.querySelectorAll('main section[id]')); }

  function openTab(name){
    const tabs = getAllTabs();
    const sections = getSections();
    // Buttons
    tabs.forEach(btn=>{
      const isActive = btn.getAttribute('data-tab') === name;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    // Sections
    sections.forEach(sec=>{
      const isActive = sec.id === name;
      sec.classList.toggle('active', isActive);
      sec.style.display = isActive ? 'block' : 'none';
    });
  }

  function installTabPersistence(){
    const tabs = getAllTabs();
    if(!tabs.length) return;

    // Generic click: persist name; do NOT interfere with app logic for known tabs
    tabs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.getAttribute('data-tab');
        try{ localStorage.setItem(LS_KEY, name); }catch(_){}
      });
    });

    // Restore at load
    const saved = ( ()=>{ try{ return localStorage.getItem(LS_KEY) }catch(_){ return null } } )();
    if(saved && getSections().some(s=>s.id===saved)){
      openTab(saved);
      const target = getAllTabs().find(t=>t.getAttribute('data-tab')===saved);
      if(target){ target.dispatchEvent(new Event('click', {bubbles:true})); }
    }
  }

  // ====== Inject Stats tab + section ======
  function ensureStatsTab(){
    const tabsWrap = getTabsWrap();
    if(!tabsWrap) return null;
    let btn = tabsWrap.querySelector('[data-tab="stats"]');
    if(btn) return btn;

    btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'tab gta gta';
    btn.setAttribute('role','tab');
    btn.setAttribute('aria-selected','false');
    btn.setAttribute('data-tab','stats');
    btn.textContent = 'Statistiques';
    tabsWrap.appendChild(btn);
    return btn;
  }

  function ensureStatsSection(){
    let sec = document.getElementById('stats');
    if(sec) return sec;
    const container = document.querySelector('main .container') || document.querySelector('main');
    if(!container) return null;

    sec = document.createElement('section');
    sec.id = 'stats';
    sec.style.display = 'none';
    sec.innerHTML = `
      <div class="card">
        <div class="hd">
          <strong>Statistiques</strong>
          <span class="help">Sources : tableau de classement. Cliquez "Mettre à jour" dans Classement pour rafraîchir.</span>
        </div>
        <div class="bd">
          <div class="charts-grid">
            <div class="chart-card">
              <div class="help" style="margin-bottom:6px">Points par équipe</div>
              <canvas id="chart-points" width="560" height="320"></canvas>
            </div>
            <div class="chart-card">
              <div class="help" style="margin-bottom:6px">Bonus + Malus (absolus cumulés)</div>
              <canvas id="chart-bonusmalus" width="560" height="320"></canvas>
            </div>
            <div class="chart-card">
              <div class="help" style="margin-bottom:6px">Matchs complets par équipe</div>
              <canvas id="chart-complets" width="560" height="320"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;
    container.appendChild(sec);
    return sec;
  }

  // ====== Charts ======
  function drawBars(canvas, labels, values, opts){
    if(!canvas) return;
    const options = Object.assign({title:"", padding:24}, opts||{});
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    ctx.fillStyle = '#121632';
    ctx.fillRect(0,0,W,H);

    if (options.title){
      ctx.fillStyle = '#e7e9f7';
      ctx.font = '600 14px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.fillText(options.title, 12, 18);
    }

    const left = options.padding + 24;
    const right = options.padding;
    const top = options.padding + 12;
    const bottom = options.padding + 36;
    const cw = W - left - right;
    const ch = H - top - bottom;

    const maxVal = Math.max(...values, 1);
    const barW = Math.max(16, Math.min(48, cw / (values.length * 1.5)));
    const gap = (cw - barW * values.length) / Math.max(values.length - 1, 1);

    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath(); ctx.moveTo(left, top); ctx.lineTo(left, top + ch); ctx.lineTo(left + cw, top + ch); ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    [0.25,0.5,0.75].forEach(p=>{
      const y = top + ch * (1 - p);
      ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(left + cw, y); ctx.stroke();
    });

    ctx.fillStyle = '#7aa2ff';
    labels.forEach((lab, i)=>{
      const x = left + i * (barW + gap);
      const h = (values[i] / maxVal) * ch;
      const y = top + (ch - h);
      ctx.fillRect(x, y, barW, h);

      ctx.fillStyle = '#8b94b8';
      ctx.font = '600 11px system-ui, -apple-system, Segoe UI, Roboto';
      const txt = lab.length > 10 ? (lab.slice(0,9)+'…') : lab;
      const tw = ctx.measureText(txt).width;
      ctx.fillText(txt, x + (barW - tw)/2, H - 14);

      ctx.fillStyle = '#e7e9f7';
      ctx.font = '700 11px system-ui, -apple-system, Segoe UI, Roboto';
      const vtxt = String(values[i]);
      const vw = ctx.measureText(vtxt).width;
      ctx.fillText(vtxt, x + (barW - vw)/2, y - 6);

      ctx.fillStyle = '#7aa2ff';
    });
  }

  function readClassement(){
    const rows = Array.from(document.querySelectorAll('#table-classement tbody tr'));
    const data = [];
    rows.forEach(tr=>{
      const tds = Array.from(tr.querySelectorAll('td'));
      if (tds.length < 9) return;
      const name = (tds[1]?.innerText || '').trim();
      const pts  = parseInt((tds[2]?.innerText || '0'), 10) || 0;
      const bonusTxt = (tds[6]?.innerText || '0').replace(/[^\-0-9]/g,'') || '0';
      const malusTxt = (tds[7]?.innerText || '0').replace(/[^\-0-9]/g,'') || '0';
      const bonus = parseInt(bonusTxt, 10) || 0;
      const malus = Math.abs(parseInt(malusTxt, 10) || 0);
      const complets = parseInt((tds[8]?.innerText || '0'), 10) || 0;
      if (name) data.push({ name, points: pts, bonus, malus, complets });
    });
    return data;
  }

  function renderStats(){
    const d = readClassement();
    const canvases = {
      points: document.getElementById('chart-points'),
      bonusmalus: document.getElementById('chart-bonusmalus'),
      complets: document.getElementById('chart-complets')
    };

    if (!d.length){
      Object.values(canvases).forEach(c=>{
        if(!c) return;
        const ctx = c.getContext('2d');
        ctx.clearRect(0,0,c.width,c.height);
        ctx.fillStyle = '#e7e9f7';
        ctx.font = '600 13px system-ui, -apple-system, Segoe UI, Roboto';
        ctx.fillText('Aucune donnée — mettez à jour le Classement.', 12, 22);
      });
      return;
    }

    drawBars(canvases.points,      d.map(x=>x.name), d.map(x=>x.points),   { title: 'Points par équipe' });
    drawBars(canvases.bonusmalus,  d.map(x=>x.name), d.map(x=>x.bonus + x.malus), { title: 'Bonus + Malus (absolus cumulés)' });
    drawBars(canvases.complets,    d.map(x=>x.name), d.map(x=>x.complets), { title: 'Matchs complets par équipe' });
  }

  function installStatsHooks(){
    const tabsWrap = getTabsWrap();
    if (tabsWrap){
      // Event delegation for the injected tab
      tabsWrap.addEventListener('click', (ev)=>{
        const statsBtn = ev.target.closest('[role="tab"][data-tab="stats"]');
        if (statsBtn){
          // Ensure the tab content gets shown even if the app doesn't know this tab
          try{ localStorage.setItem(LS_KEY, 'stats'); }catch(_){}
          openTab('stats');
          // Render after layout
          requestAnimationFrame(()=> setTimeout(renderStats, 0));
        }
      });
    }

    // If "stats" is the saved tab, we show and render after load
    try{
      if (localStorage.getItem(LS_KEY) === 'stats'){
        openTab('stats');
        requestAnimationFrame(()=> setTimeout(renderStats, 80));
      }
    }catch(_){}

    // If standings get refreshed while stats is open, re-render
    ['btn-refresh-standings','btn-refresh-standings-2'].forEach(id=>{
      const b = document.getElementById(id);
      if (b){
        b.addEventListener('click', ()=>{
          const statsOpen = document.getElementById('stats')?.classList.contains('active');
          if (statsOpen) setTimeout(renderStats, 120);
        });
      }
    });

    // Observe classement table for changes (rows added/updated)
    const tbody = document.querySelector('#table-classement tbody');
    if (tbody && 'MutationObserver' in window){
      const obs = new MutationObserver(()=>{
        const statsOpen = document.getElementById('stats')?.classList.contains('active');
        if (statsOpen) renderStats();
      });
      obs.observe(tbody, {childList:true, subtree:true, characterData:true});
    }

    // Safety: delayed retry if initial render missed
    setTimeout(()=>{
      const statsOpen = document.getElementById('stats')?.classList.contains('active');
      if (statsOpen) renderStats();
    }, 1000);
  }

  function boot(){
    ensureStatsTab();
    ensureStatsSection();
    installTabPersistence();
    installStatsHooks();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();
