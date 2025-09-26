// ligue-layout.js — rendu des rencontres en disposition 'Ligue'
/* Attentes : le fichier principal expose :
   - state.matches (array), state.rules, teamName(tid), avatarHtml(tid,size), id(x)
*/
(function(){
  function stateReady(){
    try{
      const s = window.state;
      return s && Array.isArray(s.matches) && Array.isArray(s.teams);
    }catch(_){ return false; }
  }

  
  function safeNum(n){ return (n==null || isNaN(+n)) ? null : +n; }

  function dartsScore(m){
    // m.darts: valeurs possibles selon ton app : 'a'/'b' | true/false | 1/0 | {a:true}
    let a=0, b=0;
    (m.darts||[]).forEach(v=>{
      if (v==null) return;
      if (v==='a' || v===true || v===1 || v==='A') a++;
      else if (v==='b' || v===false || v===0 || v==='B') b++;
      else if (typeof v==='object' && v){ if (v.a) a++; else if (v.b) b++; }
    });
    return {a,b};
  }

  function pingScore(m){
    // m.pingPts: tableau d'objets {a:number,b:number}
    let a=0,b=0;
    (m.pingPts||[]).forEach(s=>{
      if (!s) return;
      const A = safeNum(s.a), B = safeNum(s.b);
      if (A==null || B==null) return;
      if (A>B) a++; else if (B>A) b++;
    });
    return {a,b};
  }

  function paletPair(m){
    const A = safeNum(m?.palet?.a), B = safeNum(m?.palet?.b);
    return {a:A, b:B};
  }

  function isComplete(m){
    const dOK = (m.darts||[]).every(v=>v!=null);
    const pOK = (m.pingPts||[]).every(s=>s && s.a!=null && s.b!=null);
    const pal = paletPair(m);
    const lOK = pal.a!=null && pal.b!=null;
    return dOK && pOK && lOK;
  }

  function bonusChip(side, round, teamId){
    try{
      const sel = (window.state.bonusSelections?.[round]?.[teamId]) || null;
      if (!sel) return null;
      const type = sel.type || 'capitaine';
      const label =
          type==='miroir'   ? '🪞 Miroir' :
          type==='taupe'    ? '🐹 René la taupe' :
          type==='lefthand' ? '✋ Mauvaise main' :
          type==='melon'    ? '🍈 Melon d\'or' :
                              '🎖 Capitaine';
      const pillClass =
          type==='miroir'   ? 'yellow' :
          type==='taupe'    ? '' :
          type==='lefthand' ? '' :
          type==='melon'    ? 'green' :
                              'blue';
      const sport = sel?.sport ? (sel.sport==='darts'?'Fléchettes': sel.sport==='ping'?'Ping':'Palet') : null;
      const extra = sport ? ' · ' + sport : '';
      return `<div class="bitem ${side==='right'?'b-right':''}">
                ${side==='right' ? '' : `<span class="pill ${pillClass}">${label}</span>`}
                <span>${extra}</span>
                ${side==='right' ? `<span class="pill ${pillClass}">${label}</span>` : ''}
              </div>`;
    }catch(_){ return null; }
  }

  function teamBadge(tid){
    // utilise ton avatar s'il existe, sinon un badge lettres
    const t = (window.state.teams||[]).find(t=>t.id===tid);
    if (t && t.avatar) return `<span class="badge"><img src="${t.avatar}" style="width:100%;height:100%;object-fit:cover;border-radius:14px" alt=""/></span>`;
    const initials = (t?.name||'?').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase();
    return `<span class="badge">${initials||'?'}</span>`;
  }

  function renderCardLigue(m){
    const aName = window.teamName ? window.teamName(m.a) : 'Équipe A';
    const bName = window.teamName ? window.teamName(m.b) : 'Équipe B';

    const darts = dartsScore(m);
    const ping  = pingScore(m);
    const pal   = paletPair(m);
    const midLine = `🎯 ${darts.a ?? '—'}–${darts.b ?? '—'} &nbsp;|&nbsp; 🏓 ${ping.a ?? '—'}–${ping.b ?? '—'} &nbsp;|&nbsp; 🪙 ${pal.a ?? '—'}–${pal.b ?? '—'}`;

    // score général si déjà calculé ailleurs ? sinon somme de victoires (ne remplace pas les points classement)
    const bigA = (darts.a||0) + (ping.a||0) + (pal.a!=null && pal.b!=null ? (pal.a>pal.b?1: (pal.b>pal.a?0:null)) : 0);
    const bigB = (darts.b||0) + (ping.b||0) + (pal.a!=null && pal.b!=null ? (pal.b>pal.a?1: (pal.a>pal.b?0:null)) : 0);

    const complete = isComplete(m);

    const leftBonus  = bonusChip('left',  m.round, m.a) || '';
    const rightBonus = bonusChip('right', m.round, m.b) || '';

    return `<div class="match-ligue" data-id="${m.id}">
      <div class="topline">
        <div class="league">Journée ${m.round||'?'}</div>
        <div class="status pill ${complete?'green':''}">${complete?'Complet':'Incomplet'}</div>
      </div>
      <div class="scoreline">
        <div class="team t-a">
          <div class="team-row">${teamBadge(m.a)}<div class="name">${aName}</div></div>
        </div>
        <div class="center">
          <div class="bigscore"><span class="a">${bigA ?? '—'}</span> <span class="sep">–</span> <span class="b">${bigB ?? '—'}</span></div>
          <div class="midsub">${midLine}</div>
        </div>
        <div class="team t-b">
          <div class="team-row"><div class="name">${bName}</div>${teamBadge(m.b)}</div>
        </div>
      </div>
      <div class="bottom">
        <div class="blist left">${leftBonus}</div>
        <div class="blist right" style="text-align:right">${rightBonus}</div>
      </div>
    </div>`;
  }

  // API publique : appelle renderMatchesLigue() quand tu veux rafraîchir la liste
  window.renderMatchesLigue = function(){
    try{
      const wrap = document.getElementById('match-list');
      if (!stateReady()){
        if (wrap){ wrap.innerHTML = ''; const d=document.createElement('div'); d.className='help'; d.textContent='Chargement des données…'; wrap.appendChild(d); }
        return;
      }
      if (!wrap) return;
      wrap.innerHTML = '';
      const ms = (window.state.matches||[]).slice().sort((a,b)=> ((a.round||0)-(b.round||0)) || ((a.order||0)-(b.order||0)));
      if (!ms.length){
        const tcount = (window.state.teams||[]).length;
        const msg = tcount<2 ? "Aucune rencontre : ajoute au moins 2 équipes (onglet Équipes), puis clique sur ‘Générer le calendrier’." : "Aucune rencontre pour l’instant. Cliquez sur “Générer le calendrier” dans l’onglet Équipes.";

        const helper = document.createElement('div');
        helper.className = 'help';
        helper.style.padding = '10px';
        helper.textContent = msg;
        const btn = document.getElementById('btn-generate');
        if (btn){
          const cta = document.createElement('button');
          cta.className = 'btn small';
          cta.style.marginLeft = '8px';
          cta.textContent = 'Générer le calendrier';
          cta.addEventListener('click', ()=> btn.click());
          helper.appendChild(cta);
        }
        wrap.appendChild(helper);
        return;
      }
      ms.forEach(m=>{ wrap.insertAdjacentHTML('beforeend', renderCardLigue(m)); });
    }catch(e){ console.error('[ligue] render error', e); }
  };

  // Option : activer automatiquement si demandé (boucle douce jusqu'à readiness)
  function autoStart(tries){
    tries = tries || 0;
    if (!window.useLigueLayoutAuto) return;
    if (typeof stateReady === 'function' && stateReady()){
      if (window.renderMatchesLigue) window.renderMatchesLigue();
      return;
    }
    if (tries > 40) return; // ~20s max
    setTimeout(()=>autoStart(tries+1), tries < 10 ? 200 : 1000);
  }
  autoStart(0);
})();