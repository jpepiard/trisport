// JS OK ext3
(function(){
  // Affiche "JS OK" si le script est bien chargé
  function banner(extra){
    var el=document.getElementById('storage-warning');
    if(!el) return;
    el.style.display='block';
    var msg=(el.textContent||'').replace(/\\s+$/,'');
    if(msg.indexOf('JS OK')===-1){ el.textContent=(msg?msg+' ':'')+'JS OK ext3'; }
    if(extra){ el.textContent+=' '+extra; }
  }
  banner();

  var STORAGE_KEY='tournoi_amis_ext3', MEMORY_ONLY=false;
  function saveState(){try{ if(!MEMORY_ONLY) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ MEMORY_ONLY=true; }}
  function loadState(){try{ var r=localStorage.getItem(STORAGE_KEY); return r? JSON.parse(r):null; }catch(e){ MEMORY_ONLY=true; return null; }}

  var state = loadState() || { version:3, teams:[], matches:[], locked:false, createdAt:new Date().toISOString() };
  var ui={ open:{} };

  // Utils
  function uid(){ return Math.random().toString(36).slice(2,10); }
  function esc(s){ return (s == null ? '' : String(s)).replace(/[&<>"']/g, function (ch) { return { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[ch];});}
  function clampInt(v,min,max){ if(isNaN(v)) return null; if(v<min) return min; if(v>max) return max; return v; }
  function id(x){return document.getElementById(x);} function qs(s){return document.querySelector(s);} function qsa(s){return [].slice.call(document.querySelectorAll(s));}
  function qsaIn(n,s){return [].slice.call(n.querySelectorAll(s));}

  // Tabs
  qsa('.tab').forEach(function(b){ b.addEventListener('click', function(){ qsa('.tab').forEach(function(x){x.setAttribute('aria-selected','false');}); b.setAttribute('aria-selected','true'); qsa('main section').forEach(function(s){s.classList.remove('active');}); id(b.getAttribute('data-tab')).classList.add('active'); }); });

  // Teams
  var teamList=id('team-list');
  onClick(id('btn-add-team'), function(){ if(state.locked){ alert('Calendrier figé'); return; } state.teams.push({id:uid(),name:'Équipe '+(state.teams.length+1),p1:'',p2:''}); saveState(); renderTeams(); updateCounts(); });
  onClick(id('btn-generate'), function(){ if(state.locked) return; generateSchedule(); state.locked=true; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); updateLockUI(); var t=qs('.tab[data-tab=\"calendrier\"]'); if(t&&t.click)t.click(); });

  function renderTeams(){
    teamList.innerHTML='';
    if(state.teams.length===0){ var d=document.createElement('div'); d.className='help'; d.textContent='Aucune équipe pour le moment. Ajoutez votre première équipe !'; teamList.appendChild(d); updateCounts(); updateLockUI(); return;}
    state.teams.forEach(function(t,i){
      var dis=state.locked?' disabled':''; var del=state.locked?'':'<button type=\"button\" class=\"btn small danger\" data-action=\"del-team\" data-id=\"'+t.id+'\">Supprimer</button>';
      var card=document.createElement('div'); card.className='match-card';
      card.innerHTML='<div class=\"match-head\"><div class=\"teams\"><span class=\"chip\">#'+(i+1)+'</span> <input type=\"text\"'+dis+' value=\"'+esc(t.name)+'\" data-field=\"name\" data-id=\"'+t.id+'\"/></div><div>'+del+'</div></div>'
                    +'<div class=\"match-body\" style=\"display:block\"><div class=\"grid cols-2\"><div><label>Joueur·se 1</label><input type=\"text\"'+dis+' value=\"'+esc(t.p1)+'\" data-field=\"p1\" data-id=\"'+t.id+'\"/></div><div><label>Joueur·se 2</label><input type=\"text\"'+dis+' value=\"'+esc(t.p2)+'\" data-field=\"p2\" data-id=\"'+t.id+'\"/></div></div></div>';
      teamList.appendChild(card);
    });
    qsa('#team-list input[data-field]').forEach(function(inp){ inp.addEventListener('input', function(){ if(state.locked) return; var tid=inp.getAttribute('data-id'), f=inp.getAttribute('data-field'); var t=state.teams.find(function(x){return x.id===tid}); if(!t) return; t[f]=inp.value; saveState(); renderMatches(); renderLeaderboard(); }); });
    qsa('#team-list button[data-action=\"del-team\"]').forEach(function(btn){ btn.addEventListener('click', function(){ if(state.locked) return; var tid=btn.getAttribute('data-id'); if(!confirm('Supprimer cette équipe ?')) return; state.teams=state.teams.filter(function(tt){return tt.id!==tid}); state.matches=state.matches.filter(function(m){return m.a!==tid&&m.b!==tid}); saveState(); renderTeams(); renderMatches(); renderLeaderboard(); updateCounts(); }); });
    updateCounts(); updateLockUI();
  }
  function updateCounts(){ id('teams-count').textContent = state.teams.length+' '+(state.teams.length>1?'équipes':'équipe'); var per=Math.max(0,state.teams.length-1); id('rounds-count').textContent = per+' '+(per>1?'matchs':'match')+' par équipe'; }

  // Round-robin
  function generateSchedule(){
    var ids=state.teams.map(function(t){return t.id}); if(ids.length<2){ state.matches=[]; saveState(); return;}
    var BYE='__BYE__'; if(ids.length%2===1) ids.push(BYE); var fixed=ids[0], rest=ids.slice(1);
    for(var i=rest.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)),tmp=rest[i]; rest[i]=rest[j]; rest[j]=tmp; }
    var n=ids.length, rounds=n-1, out=[], order=0;
    for(var r=0;r<rounds;r++){ var arr=[fixed].concat(rest), half=n/2, pairs=[]; for(var k=0;k<half;k++){ var a=arr[k], b=arr[n-1-k]; if(a!==BYE&&b!==BYE) pairs.push((r%2===0)?[a,b]:[b,a]); } rest=[rest[rest.length-1]].concat(rest.slice(0,rest.length-1)); if(pairs.length>1){ var s=r%pairs.length; while(s-->0){ pairs.unshift(pairs.pop()); } } pairs.forEach(function(p){ out.push({id:uid(),a:p[0],b:p[1],darts:[null,null,null],pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}],palet:{a:null,b:null},round:r+1,order:order++}); }); }
    out.sort(function(x,y){return (x.round-y.round)||(x.order-y.order)}); state.matches=out; saveState();
  }
  function teamName(idv){ var t=state.teams.find(function(tt){return tt.id===idv}); return t?t.name:'—'; }

  // Rencontres
  var matchList=id('match-list'), stats=id('stats-matches');
  function renderMatches(){
    matchList.innerHTML=''; if(state.matches.length===0){ matchList.appendChild(help('Aucune rencontre planifiée.')); stats.textContent='0 / 0 matches complets'; return; }
    var groups={}, i; for(i=0;i<state.matches.length;i++){ var m=state.matches[i], r=m.round||1; (groups[r]=groups[r]||[]).push(m); }
    var rounds=Object.keys(groups).map(function(k){return +k}).sort(function(a,b){return a-b}); var complete=0, idx=0;
    rounds.forEach(function(r){ var h=help('Journée '+r); h.style.fontWeight='600'; h.style.margin='8px 0'; matchList.appendChild(h);
      groups[r].forEach(function(m){ var w=computeSetWins(m), pal=m.palet, palScore=(pal.a!=null&&pal.b!=null)?(pal.a+'–'+pal.b):'—', done=isMatchComplete(m); if(done) complete++;
        var el=document.createElement('div'); el.className='match-card'; el.setAttribute('data-id',m.id); el.setAttribute('aria-expanded', (ui.open[m.id]!==undefined?ui.open[m.id]:true)?'true':'false');
        el.innerHTML='<div class=\"match-head\" data-expand><div class=\"teams\"><span class=\"chip\">#'+(++idx)+'</span> '+esc(teamName(m.a))+' <span class=\"muted\">vs</span> '+esc(teamName(m.b))+'</div><div style=\"display:flex;gap:6px;align-items:center;flex-wrap:wrap\"><span class=\"chip\">Journée '+(m.round||'?')+'</span><span class=\"chip\">Fléchettes G: '+w.aw.darts+'-'+w.bw.darts+'</span><span class=\"chip\">Ping G: '+w.aw.ping+'-'+w.bw.ping+'</span><span class=\"chip\">Palet: '+palScore+'</span>'+(done?'<span class=\"pill\" style=\"border-color:#2c6;color:#8fd\">✅ Complet</span>':'<span class=\"pill\" style=\"border-color:#aa6;color:#ffc\">⏳ Incomplet</span>')+'<span class=\"caret\">▶</span></div></div><div class=\"match-body\">'+renderDarts(m)+renderPing(m)+renderPalet(m)+'<div style=\"display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px\"><div class=\"help\">Astuce : les résultats sont sauvegardés automatiquement.</div><div><button type=\"button\" class=\"btn small\" data-clear=\"'+m.id+'\">Effacer ce match</button></div></div></div>';
        el.querySelector('[data-expand]').addEventListener('click', (function(node,idv){return function(){ var open=node.getAttribute('aria-expanded')==='true'; node.setAttribute('aria-expanded', open?'false':'true'); ui.open[idv]=!open; };})(el,m.id));
        // darts
        qsaIn(el,'select[data-match][data-kind]').forEach(function(sel){ sel.addEventListener('change', function(){ var k=sel.getAttribute('data-kind'), ii=parseInt(sel.getAttribute('data-index'),10); var v=sel.value===''?null:parseInt(sel.value,10); var mm=findMatch(m.id); mm[k][ii]=v; saveState(); }); });
        // ping
        qsaIn(el,'input[data-ping]').forEach(function(inp){ inp.addEventListener('input', function(){ var w=inp.getAttribute('data-ping'), ii=parseInt(inp.getAttribute('data-index'),10); var v=inp.value===''?null:clampInt(parseInt(inp.value,10),0,99); var mm=findMatch(m.id); mm.pingPts[ii][w]=v; saveState(); }); inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } }); });
        // palet
        qsaIn(el,'input[data-palet]').forEach(function(inp){ inp.addEventListener('input', function(){ var w=inp.getAttribute('data-palet'); var v=inp.value===''?null:clampInt(parseInt(inp.value,10),0,11); var mm=findMatch(m.id); mm.palet[w]=v; saveState(); }); inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } }); });
        // clear
        el.querySelector('[data-clear]').addEventListener('click', function(){ clearMatch(m.id); });
        matchList.appendChild(el);
      });
    });
    stats.textContent = complete+' / '+state.matches.length+' matches complets';
  }

  function renderDarts(m){ var subs=['Simple 1','Simple 2','Double'], n=[teamName(m.a),teamName(m.b)], html=''; for(var i=0;i<3;i++){ var v=m.darts[i]; html+='<div class=\"grid cols-3\" style=\"align-items:end\"><div><label>Fléchettes — '+subs[i]+'</label><select data-match=\"'+m.id+'\" data-kind=\"darts\" data-index=\"'+i+'\"><option value=\"\" '+(v===null?'selected':'')+'>Non joué</option><option value=\"0\" '+(v===0?'selected':'')+'>Victoire '+esc(n[0])+'</option><option value=\"1\" '+(v===1?'selected':'')+'>Victoire '+esc(n[1])+'</option></select></div><div></div><div></div></div>'; } return html; }
  function isPingValid(a,b){ if(a==null||b==null) return false; if(isNaN(a)||isNaN(b)) return false; var max=Math.max(a,b), diff=Math.abs(a-b); return (max>=11)&&(diff>=2); }
  function getPingPts(m){ return Array.isArray(m.pingPts)?m.pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; }
  function renderPing(m){ var labels=['Simple 1','Simple 2','Double'], sets=getPingPts(m), html=''; for(var i=0;i<3;i++){ var s=sets[i]||{a:null,b:null}; var note=(s.a==null||s.b==null)?'Saisissez deux scores (11+ et écart ≥ 2).':(isPingValid(s.a,s.b)?'✔️ Score valide':'⚠️ Vainqueur à 11+ et écart de 2.'); html+='<div class=\"grid cols-4\" style=\"align-items:end;margin-top:6px\"><div><label>Ping — '+labels[i]+' — '+esc(teamName(m.a))+'</label><input type=\"number\" min=\"0\" max=\"99\" step=\"1\" value=\"'+(s.a==null?'':s.a)+'\" data-ping=\"a\" data-index=\"'+i+'\"/></div><div><label>Ping — '+labels[i]+' — '+esc(teamName(m.b))+'</label><input type=\"number\" min=\"0\" max=\"99\" step=\"1\" value=\"'+(s.b==null?'':s.b)+'\" data-ping=\"b\" data-index=\"'+i+'\"/></div><div class=\"help\">'+note+'</div><div></div></div>'; } return html; }
  function renderPalet(m){ var a=m.palet.a,b=m.palet.b, note=(a==null||b==null)?'Saisissez les deux scores (l’un doit être 11).':((a===11&&b>=0&&b<=10)||(b===11&&a>=0&&a<=10)?'✔️ Score valide':'⚠️ Un score doit être 11, l’autre 0–10.'); return '<div class=\"grid cols-4\" style=\"align-items:end;margin-top:6px\"><div><label>Palet — '+esc(teamName(m.a))+'</label><input type=\"number\" min=\"0\" max=\"11\" step=\"1\" value=\"'+(a==null?'':a)+'\" data-palet=\"a\"/></div><div><label>Palet — '+esc(teamName(m.b))+'</label><input type=\"number\" min=\"0\" max=\"11\" step=\"1\" value=\"'+(b==null?'':b)+'\" data-palet=\"b\"/></div><div class=\"help\">'+note+'</div><div></div></div>'; }

  // Classement
  function computeSetWins(m){ var aw={darts:0,ping:0}, bw={darts:0,ping:0}; for(var i=0;i<3;i++){ var v=m.darts[i]; if(v===0) aw.darts++; else if(v===1) bw.darts++; } var s=getPingPts(m); for(i=0;i<3;i++){ var ss=s[i]; if(isPingValid(ss.a,ss.b)){ if(ss.a>ss.b) aw.ping++; else if(ss.b>ss.a) bw.ping++; } } return {aw:aw,bw:bw}; }
  function computeLeaderboard(){ var stats={}, i; for(i=0;i<state.teams.length;i++){ var t=state.teams[i]; stats[t.id]={name:t.name,points:0,dartsW:0,pingW:0,palFor:0,palAg:0,matchesComplete:0}; } for(i=0;i<state.matches.length;i++){ var m=state.matches[i], A=stats[m.a], B=stats[m.b]; for(var d=0;d<3;d++){ var v=m.darts[d]; if(v===0){A.dartsW++;A.points+=5;} else if(v===1){B.dartsW++;B.points+=5;} } var sets=getPingPts(m); for(var p=0;p<3;p++){ var s=sets[p]; if(isPingValid(s.a,s.b)){ if(s.a>s.b){A.pingW++;A.points+=5;} else if(s.b>s.a){B.pingW++;B.points+=5;} } } var pa=m.palet.a,pb=m.palet.b; if(pa!=null&&pb!=null){A.palFor+=pa;B.palFor+=pb;A.palAg+=pb;B.palAg+=pa;A.points+=pa;B.points+=pb;} if(isMatchComplete(m)){A.matchesComplete++;B.matchesComplete++;} } var rows=[]; for(var k in stats){ rows.push({id:k,name:stats[k].name,points:stats[k].points,dartsW:stats[k].dartsW,pingW:stats[k].pingW,palFor:stats[k].palFor,palAg:stats[k].palAg,matchesComplete:stats[k].matchesComplete}); } rows.sort(function(x,y){var v=y.points-x.points;if(v!==0)return v;v=(y.palFor-y.palAg)-(x.palFor-x.palAg);if(v!==0)return v;v=(y.dartsW+y.pingW)-(x.dartsW+x.pingW);if(v!==0)return v;return x.name.localeCompare(y.name);}); rows.forEach(function(r,i){r.rank=i+1}); return rows; }
  function renderLeaderboard(){ var tb=qs('#table-classement tbody'); tb.innerHTML=''; computeLeaderboard().forEach(function(r){ var diff=r.palFor-r.palAg; var tr=document.createElement('tr'); tr.innerHTML='<td>'+r.rank+'</td><td>'+esc(r.name)+'</td><td><b>'+r.points+'</b></td><td>'+r.dartsW+'</td><td>'+r.pingW+'</td><td>'+r.palFor+'–'+r.palAg+' <span class=\"muted\">('+(diff>=0?'+':'')+diff+')</span></td><td>'+r.matchesComplete+'</td>'; tb.appendChild(tr); }); }
  function isMatchComplete(m){ var okD=true; for(var i=0;i<3;i++){ var v=m.darts[i]; if(!(v===0||v===1)){okD=false;break;} } var okP=true, s=getPingPts(m); for(i=0;i<3;i++){ if(!isPingValid(s[i].a,s[i].b)){ okP=false; break; } } var pa=m.palet.a,pb=m.palet.b; var okL=(pa!=null&&pb!=null)&&((pa===11&&pb>=0&&pb<=10)||(pb===11&&pa>=0&&pa<=10)); return okD&&okP&&okL; }

  // Actions
  onClick(id('btn-expand'), function(){ qsa('.match-card').forEach(function(n){ n.setAttribute('aria-expanded','true'); }); });
  onClick(id('btn-collapse'), function(){ qsa('.match-card').forEach(function(n){ n.setAttribute('aria-expanded','false'); }); });
  onClick(id('btn-refresh-standings'), function(){ renderMatches(); renderLeaderboard(); });
  onClick(id('btn-refresh-standings-2'), function(){ renderMatches(); renderLeaderboard(); });
  onClick(id('btn-export'), function(){ var data=JSON.stringify(state,null,2); var blob=new Blob([data],{type:'application/json'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='tournoi-amis-'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(url); });
  var importFile=null; id('file-import').addEventListener('change', function(e){ importFile=e.target.files[0]; });
  onClick(id('btn-import'), function(){ if(!importFile){ alert('Sélectionnez un fichier JSON.'); return; } importFile.text().then(function(txt){ try{ var data=JSON.parse(txt); if(!(data && Array.isArray(data.teams) && Array.isArray(data.matches))) throw new Error('format'); state=data; if(typeof state.locked==='undefined') state.locked=false; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); alert('Import réussi !'); }catch(e){ alert('Fichier invalide.'); } }); });
  onClick(id('btn-reset'), function(){ if(!confirm('Tout effacer et recommencer ?')) return; state={version:3,teams:[],matches:[],locked:false,createdAt:new Date().toISOString()}; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); updateCounts(); updateLockUI(); });
  onClick(id('btn-unlock'), function(){ if(!confirm('Déverrouiller le calendrier ?')) return; state.locked=false; saveState(); renderTeams(); renderMatches(); updateLockUI(); });

  // Helpers
  function onClick(el,fn){ if(el&&el.addEventListener) el.addEventListener('click',fn); }
  function help(t){ var d=document.createElement('div'); d.className='help'; d.textContent=t; return d; }
  function findMatch(idv){ return state.matches.find(function(x){return x.id===idv}); }
  function updateLockUI(){ var pill=id('lock-pill'); if(pill) pill.style.display=state.locked?'inline-block':'none'; var add=id('btn-add-team'); if(add) add.disabled=!!state.locked; var gen=id('btn-generate'); if(gen){ gen.disabled=!!state.locked; gen.textContent=state.locked?'Calendrier figé':'Générer le calendrier'; } }

  // Init
  renderTeams(); renderMatches(); renderLeaderboard(); updateCounts(); updateLockUI(); banner('(init OK)');
})();
