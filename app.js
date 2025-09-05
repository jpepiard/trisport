// JS OK external v1
(function(){
  // Guard: show that JS loaded
  function bannerText(extra){
    var el = document.getElementById('storage-warning');
    if(!el) return;
    var msg = el.textContent || '';
    if(msg.indexOf('JS OK') === -1){
      el.textContent = (msg ? msg + ' ' : '') + 'JS OK external v1';
      el.style.display = 'block';
    }
    if(extra){ el.textContent += ' ' + extra; }
  }
  bannerText();

  // Storage
  var STORAGE_KEY='tournoi_amis_ext_v1';
  var MEMORY_ONLY=false;
  function saveState(){ try{ if(!MEMORY_ONLY){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } }catch(e){ MEMORY_ONLY=true; updateStorageWarning(); } }
  function loadState(){ try{ var raw=localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): null; }catch(e){ MEMORY_ONLY=true; return null; } }
  function updateStorageWarning(){ var el=document.getElementById('storage-warning'); if(el){ el.style.display = MEMORY_ONLY? 'block':'none'; el.textContent = (MEMORY_ONLY? '⚠️ Le stockage du navigateur est indisponible. Les données ne seront pas conservées.' : ''); el.textContent += (el.textContent? ' ' : '') + 'JS OK external v1'; } }

  var state = loadState() || { version:1, teams:[], matches:[], createdAt:new Date().toISOString() };
  var ui = { open:{} };

  // Tabs
  nodeList('.tab').forEach(function(btn){
    btn.addEventListener('click', function(){
      nodeList('.tab').forEach(function(b){ b.setAttribute('aria-selected','false'); });
      btn.setAttribute('aria-selected','true');
      nodeList('main section').forEach(function(s){ s.classList.remove('active'); });
      id(btn.getAttribute('data-tab')).classList.add('active');
    });
  });

  // Teams UI
  var teamListEl = id('team-list');
  on(id('btn-add-team'),'click',function(){
    state.teams.push({ id: uid(), name: 'Équipe ' + (state.teams.length+1), p1:'', p2:'' });
    saveState(); renderTeams();
  });
  on(id('btn-generate'),'click',function(){
    generateSchedule(); renderMatches(); renderLeaderboard();
    var tab = qs('.tab[data-tab="calendrier"]'); if(tab && tab.click) tab.click();
  });

  function renderTeams(){
    teamListEl.innerHTML='';
    if(state.teams.length===0){ teamListEl.appendChild(help('Aucune équipe pour le moment. Ajoutez votre première équipe !')); updateCounts(); return; }
    state.teams.forEach(function(t,idx){
      var card=div('match-card');
      card.innerHTML = ''
        +'<div class="match-head">'
        +  '<div class="teams"><span class="chip">#'+(idx+1)+'</span> '
        +    '<input type="text" value="'+esc(t.name)+'" data-field="name" data-id="'+t.id+'"/></div>'
        +  '<div><button type="button" class="btn small danger" data-action="del-team" data-id="'+t.id+'">Supprimer</button></div>'
        +'</div>'
        +'<div class="match-body" style="display:block">'
        +  '<div class="grid cols-2">'
        +    '<div><label>Joueur·se 1</label><input type="text" placeholder="Nom" value="'+esc(t.p1)+'" data-field="p1" data-id="'+t.id+'"/></div>'
        +    '<div><label>Joueur·se 2</label><input type="text" placeholder="Nom" value="'+esc(t.p2)+'" data-field="p2" data-id="'+t.id+'"/></div>'
        +  '</div>'
        +'</div>';
      teamListEl.appendChild(card);
    });
    nodeList('#team-list input[data-field]').forEach(function(inp){
      inp.addEventListener('input', function(){
        var idv=inp.getAttribute('data-id'); var field=inp.getAttribute('data-field');
        var t = state.teams.find(function(x){return x.id===idv}); if(!t) return;
        t[field]=inp.value; saveState(); renderLeaderboard(); renderMatches();
      });
    });
    nodeList('#team-list button[data-action="del-team"]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var idv=btn.getAttribute('data-id'); if(!confirm('Supprimer cette équipe ?')) return;
        state.teams = state.teams.filter(function(tt){ return tt.id!==idv; });
        state.matches = state.matches.filter(function(m){ return m.a!==idv && m.b!==idv; });
        saveState(); renderTeams(); renderMatches(); renderLeaderboard();
      });
    });
    updateCounts();
  }
  function updateCounts(){
    id('teams-count').textContent = state.teams.length + ' ' + (state.teams.length>1?'équipes':'équipe');
    var perTeam=Math.max(0,state.teams.length-1);
    id('rounds-count').textContent = perTeam + ' ' + (perTeam>1?'matchs':'match') + ' par équipe';
  }

  // Schedule
  function generateSchedule(){
    var teamIds = state.teams.map(function(t){return t.id});
    if(teamIds.length<2){ state.matches=[]; saveState(); return; }
    var ids = teamIds.slice(); var BYE='__BYE__'; if(ids.length%2===1) ids.push(BYE);
    var fixed = ids[0]; var rest = ids.slice(1);
    for(var i=rest.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)); var tmp=rest[i]; rest[i]=rest[j]; rest[j]=tmp; }
    var n=ids.length, rounds=n-1, pairsByRound=[];
    for(var r=0;r<rounds;r++){
      var arr=[fixed].concat(rest); var half=n/2; var pairs=[];
      for(var k=0;k<half;k++){ var t1=arr[k], t2=arr[n-1-k]; if(t1!==BYE && t2!==BYE) pairs.push((r%2===0)?[t1,t2]:[t2,t1]); }
      rest=[rest[rest.length-1]].concat(rest.slice(0,rest.length-1));
      if(pairs.length>1){ var shift=r%pairs.length; while(shift-->0){ pairs.unshift(pairs.pop()); } }
      pairsByRound.push(pairs);
    }
    var existing={}; state.matches.forEach(function(m){ existing[pairKey(m.a,m.b)]=m; });
    var out=[], order=0;
    pairsByRound.forEach(function(pairs,roundIdx){
      pairs.forEach(function(pr){
        var a=pr[0], b=pr[1]; var key=pairKey(a,b); var m=existing[key];
        if(m){ m.round=roundIdx+1; m.order=order++; if(!Array.isArray(m.pingPts)) m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; }
        else { m={ id:uid(), a:a, b:b, darts:[null,null,null], pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}], palet:{a:null,b:null}, round:roundIdx+1, order:order++ }; }
        out.push(m);
      });
    });
    out.sort(function(x,y){ return (x.round-y.round)||(x.order-y.order); });
    state.matches=out; saveState();
  }
  function pairKey(x,y){ return [x,y].sort().join('|'); }
  function teamName(idv){ var t=state.teams.find(function(tt){return tt.id===idv}); return t? t.name : '—'; }

  // Matches UI
  var matchListEl = id('match-list');
  var statsMatchesEl = id('stats-matches');

  function renderMatches(){
    matchListEl.innerHTML='';
    if(state.matches.length===0){ matchListEl.appendChild(help('Aucune rencontre planifiée.')); statsMatchesEl.textContent='0 / 0 matches complets'; return; }
    var groups={};
    state.matches.forEach(function(m){ var r=m.round||1; if(!groups[r]) groups[r]=[]; groups[r].push(m); });
    var rounds=Object.keys(groups).map(function(k){return parseInt(k,10)}).sort(function(a,b){return a-b});
    var completeCount=0, globalIdx=0;
    rounds.forEach(function(r){
      var hdr=help('Journée '+r); hdr.style.fontWeight='600'; hdr.style.margin='8px 0'; matchListEl.appendChild(hdr);
      groups[r].forEach(function(m){
        var wins=computeSetWins(m); var pal=m.palet; var palScore=(pal.a!=null && pal.b!=null)? (pal.a+'–'+pal.b) : '—';
        var isComplete=isMatchComplete(m); if(isComplete) completeCount++;
        var el=div('match-card'); el.setAttribute('data-id', m.id);
        var opened = (ui.open[m.id] !== undefined)? ui.open[m.id] : true;
        el.setAttribute('aria-expanded', opened? 'true':'false');
        el.innerHTML=''
          +'<div class="match-head" data-expand>'
          +  '<div class="teams"><span class="chip">#'+(++globalIdx)+'</span> '+esc(teamName(m.a))+' <span class="muted">vs</span> '+esc(teamName(m.b))+'</div>'
          +  '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
          +    '<span class="chip">Journée '+(m.round||'?')+'</span>'
          +    '<span class="chip">Fléchettes G: '+wins.aw.darts+'-'+wins.bw.darts+'</span>'
          +    '<span class="chip">Ping G: '+wins.aw.ping+'-'+wins.bw.ping+'</span>'
          +    '<span class="chip">Palet: '+palScore+'</span>'
          +    (isComplete? '<span class="pill" style="border-color:#2c6;color:#8fd">✅ Complet</span>' : '<span class="pill" style="border-color:#aa6;color:#ffc">⏳ Incomplet</span>')
          +    '<span class="caret">▶</span>'
          +  '</div>'
          +'</div>'
          +'<div class="match-body">'
          +  renderSportBlock('Fléchettes','darts',m)
          +  renderPingBlock(m)
          +  renderPaletBlock(m)
          +  '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px">'
          +    '<div class="help">Astuce : les résultats sont sauvegardés automatiquement.</div>'
          +    '<div>'
          +      '<button type="button" class="btn small" data-clear="'+m.id+'">Effacer ce match</button> '
          +      '<button type="button" class="btn small danger" data-delete="'+m.id+'">Supprimer le match</button>'
          +    '</div>'
          +  '</div>'
          +'</div>';
        el.querySelector('[data-expand]').addEventListener('click', (function(node,idv){ return function(){ var isOpen = node.getAttribute('aria-expanded')==='true'; var next=!isOpen; node.setAttribute('aria-expanded', next? 'true':'false'); ui.open[idv]=next; }; })(el,m.id));

        // darts selects
        nodeListWithin(el,'select[data-match][data-kind]').forEach(function(sel){
          sel.addEventListener('change', function(){
            var kind=sel.getAttribute('data-kind'); var idx=parseInt(sel.getAttribute('data-index'),10);
            var val = sel.value===''? null : parseInt(sel.value,10);
            var match=findMatch(m.id); match[kind][idx]=val; saveState(); renderLeaderboard();
          });
        });
        // ping inputs
        nodeListWithin(el,'input[data-ping]').forEach(function(inp){
          inp.addEventListener('input', function(){
            var which=inp.getAttribute('data-ping'); var idx=parseInt(inp.getAttribute('data-index'),10);
            var val = inp.value===''? null : clampInt(parseInt(inp.value,10),0,99);
            var match=findMatch(m.id); if(!Array.isArray(match.pingPts)) match.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}];
            match.pingPts[idx][which]=val; saveState(); renderLeaderboard();
          });
          inp.addEventListener('change', function(){
            var which=inp.getAttribute('data-ping'); var idx=parseInt(inp.getAttribute('data-index'),10);
            var val = inp.value===''? null : clampInt(parseInt(inp.value,10),0,99);
            var match=findMatch(m.id); if(!Array.isArray(match.pingPts)) match.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}];
            match.pingPts[idx][which]=val; saveState(); renderLeaderboard();
          });
          inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } });
        });
        // palet inputs
        nodeListWithin(el,'input[data-palet]').forEach(function(inp){
          inp.addEventListener('input', function(){
            var which=inp.getAttribute('data-palet'); var val = inp.value===''? null : clampInt(parseInt(inp.value,10),0,11);
            var match=findMatch(m.id); match.palet[which]=val; saveState(); renderLeaderboard();
          });
          inp.addEventListener('change', function(){
            var which=inp.getAttribute('data-palet'); var val = inp.value===''? null : clampInt(parseInt(inp.value,10),0,11);
            var match=findMatch(m.id); match.palet[which]=val; saveState(); renderLeaderboard();
          });
          inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } });
        });
        // clear & delete
        el.querySelector('[data-clear]').addEventListener('click', function(){ clearMatch(m.id); });
        el.querySelector('[data-delete]').addEventListener('click', function(){ deleteMatch(m.id); });

        matchListEl.appendChild(el);
      });
    });
    statsMatchesEl.textContent = completeCount + ' / ' + state.matches.length + ' matches complets';
  }

  function findMatch(idv){ return state.matches.find(function(x){return x.id===idv}); }

  function renderSportBlock(label, kind, m){
    var names=[teamName(m.a), teamName(m.b)]; var subs=['Simple 1','Simple 2','Double']; var html='';
    for(var i=0;i<3;i++){
      var val=m[kind][i];
      html += ''
        +'<div class="grid cols-3" style="align-items:end">'
        +  '<div>'
        +    '<label>'+label+' — '+subs[i]+'</label>'
        +    '<select data-match="'+m.id+'" data-kind="'+kind+'" data-index="'+i+'">'
        +      '<option value="" '+(val===null?'selected':'')+'>Non joué</option>'
        +      '<option value="0" '+(val===0?'selected':'')+'>Victoire '+esc(names[0])+'</option>'
        +      '<option value="1" '+(val===1?'selected':'')+'>Victoire '+esc(names[1])+'</option>'
        +    '</select>'
        +  '</div><div></div><div></div>'
        +'</div>';
    }
    return html;
  }

  function renderPingBlock(m){
    var sets=getPingPts(m); var names=[teamName(m.a), teamName(m.b)]; var labels=['Simple 1','Simple 2','Double']; var html='';
    for(var i=0;i<3;i++){
      var s=sets[i] || {a:null,b:null};
      var note=''; if(s.a==null || s.b==null){ note='Saisissez deux scores (11+ et écart ≥ 2).'; } else if(isPingValid(s.a,s.b)){ note='✔️ Score valide'; } else { note='⚠️ Vainqueur à 11+ et écart de 2 (11–9, 12–10…).'; }
      html += ''
        +'<div class="grid cols-4" style="align-items:end;margin-top:6px">'
        +  '<div><label>Ping — '+labels[i]+' — '+esc(names[0])+'</label><input type="number" min="0" max="99" step="1" placeholder="0–99" value="'+(s.a==null?'':s.a)+'" data-ping="a" data-index="'+i+'"/></div>'
        +  '<div><label>Ping — '+labels[i]+' — '+esc(names[1])+'</label><input type="number" min="0" max="99" step="1" placeholder="0–99" value="'+(s.b==null?'':s.b)+'" data-ping="b" data-index="'+i+'"/></div>'
        +  '<div class="help">'+note+'</div><div></div>'
        +'</div>';
    }
    return html;
  }

  function renderPaletBlock(m){
    var a=m.palet.a, b=m.palet.b; var note='';
    if(a==null || b==null) note='Saisissez les deux scores (l’un doit être 11).';
    else if((a===11 && b>=0 && b<=10) || (b===11 && a>=0 && a<=10)) note='✔️ Score valide';
    else note='⚠️ Un score doit être 11, l’autre entre 0 et 10.';
    return ''
      +'<div class="grid cols-4" style="align-items:end;margin-top:6px">'
      +  '<div><label>Palet — '+esc(teamName(m.a))+'</label><input type="number" min="0" max="11" step="1" placeholder="0–11" value="'+(a==null?'':a)+'" data-palet="a"/></div>'
      +  '<div><label>Palet — '+esc(teamName(m.b))+'</label><input type="number" min="0" max="11" step="1" placeholder="0–11" value="'+(b==null?'':b)+'" data-palet="b"/></div>'
      +  '<div class="help">'+note+'</div><div></div>'
      +'</div>';
  }

  function clearMatch(idv){ var m=findMatch(idv); if(!m) return; if(!confirm('Effacer tous les scores de ce match ?')) return; m.darts=[null,null,null]; m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; m.palet={a:null,b:null}; saveState(); renderMatches(); renderLeaderboard(); }
  function deleteMatch(idv){ if(!confirm('Supprimer cette rencontre du calendrier ?')) return; state.matches = state.matches.filter(function(x){return x.id!==idv}); saveState(); renderMatches(); renderLeaderboard(); }

  // Leaderboard
  function computeSetWins(m){
    var aw={darts:0,ping:0}, bw={darts:0,ping:0};
    m.darts.forEach(function(v){ if(v===0) aw.darts++; else if(v===1) bw.darts++; });
    getPingPts(m).forEach(function(s){ if(isPingValid(s.a,s.b)){ if(s.a>s.b) aw.ping++; else if(s.b>s.a) bw.ping++; } });
    return {aw:aw, bw:bw};
  }
  function computeLeaderboard(){
    var stats={}; state.teams.forEach(function(t){ stats[t.id]={ teamId:t.id, name:t.name, points:0, dartsW:0, pingW:0, palFor:0, palAg:0, matchesComplete:0 }; });
    state.matches.forEach(function(m){
      var sA=stats[m.a], sB=stats[m.b];
      m.darts.forEach(function(v){ if(v===0){ sA.dartsW++; sA.points+=5; } else if(v===1){ sB.dartsW++; sB.points+=5; } });
      getPingPts(m).forEach(function(s){ if(isPingValid(s.a,s.b)){ if(s.a>s.b){ sA.pingW++; sA.points+=5; } else if(s.b>s.a){ sB.pingW++; sB.points+=5; } } });
      var pa=m.palet.a, pb=m.palet.b; if(pa!=null && pb!=null){ sA.palFor+=pa; sB.palFor+=pb; sA.palAg+=pb; sB.palAg+=pa; sA.points+=pa; sB.points+=pb; }
      if(isMatchComplete(m)){ sA.matchesComplete++; sB.matchesComplete++; }
    });
    var rows=Object.keys(stats).map(function(k){return stats[k]});
    rows.sort(function(x,y){ var v=(y.points-x.points); if(v!==0) return v; v=((y.palFor-y.palAg)-(x.palFor-x.palAg)); if(v!==0) return v; v=((y.dartsW+y.pingW)-(x.dartsW+x.pingW)); if(v!==0) return v; return x.name.localeCompare(y.name); });
    rows.forEach(function(r,i){ r.rank=i+1; });
    return rows;
  }
  function renderLeaderboard(){
    var tbody=qs('#table-classement tbody'); tbody.innerHTML='';
    computeLeaderboard().forEach(function(r){
      var palDiff=r.palFor-r.palAg; var tr=document.createElement('tr');
      tr.innerHTML='<td>'+r.rank+'</td><td>'+esc(r.name)+'</td><td><b>'+r.points+'</b></td><td>'+r.dartsW+'</td><td>'+r.pingW+'</td><td>'+r.palFor+'–'+r.palAg+' <span class="muted">('+(palDiff>=0?'+':'')+palDiff+')</span></td><td>'+r.matchesComplete+'</td>';
      tbody.appendChild(tr);
    });
  }

  // Completeness & helpers
  function isMatchComplete(m){
    var okDarts = m.darts.every(function(v){ return v===0 || v===1; });
    var okPing = getPingPts(m).every(function(s){ return isPingValid(s.a,s.b); });
    var pa=m.palet.a, pb=m.palet.b;
    var okPal = (pa!=null && pb!=null) && ((pa===11 && pb>=0 && pb<=10) || (pb===11 && pa>=0 && pa<=10));
    return okDarts && okPing && okPal;
  }

  // Export / Import / Reset / Expand
  on(id('btn-expand'),'click',function(){ nodeList('.match-card').forEach(function(n){ n.setAttribute('aria-expanded','true'); }); });
  on(id('btn-collapse'),'click',function(){ nodeList('.match-card').forEach(function(n){ n.setAttribute('aria-expanded','false'); }); });
  on(id('btn-export'),'click',function(){ var data=JSON.stringify(state,null,2); var blob=new Blob([data],{type:'application/json'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='tournoi-amis-'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(url); });
  var importFile; on(id('file-import'),'change',function(e){ importFile=e.target.files[0]; });
  on(id('btn-import'),'click',function(){ if(!importFile){ alert('Sélectionnez d\'abord un fichier JSON.'); return; } importFile.text().then(function(text){ try{ var data=JSON.parse(text); if(!(data && Array.isArray(data.teams) && Array.isArray(data.matches))) throw new Error('format'); state=data; migrateState(); saveState(); renderTeams(); renderMatches(); renderLeaderboard(); alert('Import réussi !'); }catch(e){ alert('Fichier invalide.'); } }); });
  on(id('btn-reset'),'click',function(){ if(!confirm('Tout effacer et recommencer ?')) return; state={version:1,teams:[],matches:[],createdAt:new Date().toISOString()}; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); });

  // Utils
  function uid(){ return Math.random().toString(36).slice(2,10); }
  function esc(str){ return (str==null? '' : String(str)).replace(/[&<>"']/g, function(s){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[s]; }); }
  function clampInt(v,min,max){ if(isNaN(v)) return null; if(v<min) return min; if(v>max) return max; return v; }
  function getPingPts(m){ if(Array.isArray(m.pingPts)) return m.pingPts; if(Array.isArray(m.ping)) { return m.ping.map(function(v){ return v===0? {a:11,b:0} : v===1? {a:0,b:11} : {a:null,b:null}; }); } return [{a:null,b:null},{a:null,b:null},{a:null,b:null}]; }
  function isPingValid(a,b){ if(a==null || b==null) return false; if(isNaN(a)||isNaN(b)) return false; var max=Math.max(a,b), diff=Math.abs(a-b); return (max>=11) && (diff>=2); }
  function migrateState(){ if(!(state && Array.isArray(state.matches))) return; state.matches.forEach(function(m){ if(!Array.isArray(m.pingPts)){ m.pingPts=getPingPts(m); delete m.ping; } }); saveState(); }
  function id(x){ return document.getElementById(x); }
  function qs(sel){ return document.querySelector(sel); }
  function nodeList(sel){ return Array.prototype.slice.call(document.querySelectorAll(sel)); }
  function nodeListWithin(node,sel){ return Array.prototype.slice.call(node.querySelectorAll(sel)); }
  function div(cls){ var d=document.createElement('div'); d.className=cls; return d; }
  function help(text){ var d=document.createElement('div'); d.className='help'; d.textContent=text; return d; }
  function on(el,ev,fn){ if(el && el.addEventListener) el.addEventListener(ev,fn); }

  // Init
  migrateState(); renderTeams(); renderMatches(); renderLeaderboard(); updateStorageWarning();
})();