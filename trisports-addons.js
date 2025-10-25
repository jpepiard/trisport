
(function(){
  'use strict';

  // ====== 1) Persist selected tab in localStorage ======
  const LS_KEY = 'trisports.lastTab';

  function getTabsWrap(){
    return document.getElementById('tabs');
  }
  function getAllTabs(){
    const w = getTabsWrap(); if(!w) return [];
    return Array.from(w.querySelectorAll('[role="tab"][data-tab]'));
  }
  function getSections(){
    return Array.from(document.querySelectorAll('main section[id]'));
  }

  function openTab(name){
    const tabs = getAllTabs();
    const sections = getSections();
    // buttons
    tabs.forEach(btn=>{
      const isActive = btn.getAttribute('data-tab') === name;
      btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
    // sections
    sections.forEach(sec=>{
      const isActive = sec.id === name;
      sec.classList.toggle('active', isActive);
      sec.style.display = isActive ? 'block' : 'none';
    });
  }

  function installTabPersistence(){
    const tabs = getAllTabs();
    if(!tabs.length) return;

    // click handler
    tabs.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const name = btn.getAttribute('data-tab');
        try{ localStorage.setItem(LS_KEY, name); }catch(_){}
      });
    });

    // restore
    const saved = (()=>{
      try{ return localStorage.getItem(LS_KEY) }catch(_){ return null }
    })();
    if(saved && getSections().some(s=>s.id===saved)){
      openTab(saved);
      // If there is an existing click behavior elsewhere, attempt to trigger it too
      const target = getAllTabs().find(t=>t.getAttribute('data-tab')===saved);
      if(target){ target.dispatchEvent(new Event('click', {bubbles:true})); }
    }
  }

  // ====== 2) Stats tab injection (button + section) ======
  function ensureStatsTab(){
    const tabsWrap = getTabsWrap();
    if(!tabsWrap) return null;

    if (tabsWrap.querySelector('[data-tab="stats"]')) return tabsWrap.querySelector('[data-tab="stats"]');

    const btn = document.createElement('button');
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
    if (document.getElementById('stats')) return document.getElementById('stats');
    const container = document.querySelector('main .container') || document.querySelector('main');
    if(!container) return null;

    const sec = document.createElement('section');
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

  // ====== 3) Charts rendering (vanilla canvas) ======
  function drawBars(canvas, labels, values, opts){
    if(!canvas) return;
    const options = Object.assign({title:"", padding:24}, opts||{});
    const ctx = canvas.getContext('2d');
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0,0,W,H);

    // background
    ctx.fillStyle = '#121632';
    ctx.fillRect(0,0,W,H);

    // title
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

    // axes
    ctx.strokeStyle = 'rgba(255,255,255,.12)';
    ctx.beginPath();
    ctx.moveTo(left, top);
    ctx.lineTo(left, top + ch);
    ctx.lineTo(left + cw, top + ch);
    ctx.stroke();

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    [0.25, 0.5, 0.75].forEach(p=>{
      const y = top + ch * (1 - p);
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(left + cw, y);
      ctx.stroke();
    });

    // bars
    ctx.fillStyle = '#7aa2ff';
    labels.forEach((lab, i)=>{
      const x = left + i * (barW + gap);
      const h = (values[i] / maxVal) * ch;
      const y = top + (ch - h);
      ctx.fillRect(x, y, barW, h);

      // label
      ctx.fillStyle = '#8b94b8';
      ctx.font = '600 11px system-ui, -apple-system, Segoe UI, Roboto';
      const txt = lab.length > 10 ? (lab.slice(0, 9) + '…') : lab;
      const tw = ctx.measureText(txt).width;
      ctx.fillText(txt, x + (barW - tw)/2, H - 14);

      // value
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

    drawBars(
      canvases.points,
      d.map(x=>x.name),
      d.map(x=>x.points),
      { title: 'Points par équipe' }
    );

    drawBars(
      canvases.bonusmalus,
      d.map(x=>x.name),
      d.map(x=>x.bonus + x.malus),
      { title: 'Bonus + Malus (absolus cumulés)' }
    );

    drawBars(
      canvases.complets,
      d.map(x=>x.name),
      d.map(x=>x.complets),
      { title: 'Matchs complets par équipe' }
    );
  }

  function installStatsHooks(){
    const tabsWrap = getTabsWrap();
    if (tabsWrap){
      tabsWrap.addEventListener('click', (ev)=>{
        const btn = ev.target.closest('[role="tab"][data-tab="stats"]');
        if (btn){
          // render after tab becomes visible
          setTimeout(renderStats, 0);
        }
      });
    }
    // If persistent tab is stats at load, render quickly after paint
    try{
      if (localStorage.getItem(LS_KEY) === 'stats'){
        requestAnimationFrame(()=> setTimeout(renderStats, 60));
      }
    }catch(_){}
    // If "refresh standings" is clicked while stats open, re-render
    ['btn-refresh-standings','btn-refresh-standings-2'].forEach(id=>{
      const b = document.getElementById(id);
      if (b){
        b.addEventListener('click', ()=>{
          const statsOpen = document.getElementById('stats')?.classList.contains('active');
          if (statsOpen) setTimeout(renderStats, 80);
        });
      }
    });
  }

  // ====== Bootstrapping ======
  function boot(){
    // Inject stats tab + section without modifying original HTML
    ensureStatsTab();
    ensureStatsSection();
    // Install behaviors
    installTabPersistence();
    installStatsHooks();
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', boot, {once:true});
  }else{
    boot();
  }
})();
