// JS OK roles1 — Admin PIN + mot de passe par équipe + édition limitée à sa propre équipe (synchro Firebase)
(function(){
  window.onerror = function (msg, src, line, col) {
    var el = document.getElementById('storage-warning');
    if (!el) return;
    el.style.display = 'block';
    el.textContent = 'Erreur JS : ' + msg + ' @' + (src||'') + ':' + (line||0) + ':' + (col||0);
  };

  document.addEventListener('DOMContentLoaded', function(){
    banner('JS OK roles1');

    // -------- Local storage helpers
    var STORAGE_KEY='tournoi_amis_roles1';
    var MEMORY_ONLY=false;
    function saveLocal(){ try{ if(!MEMORY_ONLY){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } }catch(e){ MEMORY_ONLY=true; updateStorageWarning(); } }
    function loadLocal(){ try{ var raw=localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw): null; }catch(e){ MEMORY_ONLY=true; return null; } }
    function updateStorageWarning(){ var el=id('storage-warning'); if(el){ el.style.display='block'; var m=MEMORY_ONLY?'⚠️ Pas de stockage persistant.':''; el.textContent=(m?m+' ':'')+'JS OK roles1'; } }
    function banner(msg){ var el=id('storage-warning'); if(!el) return; el.style.display='block'; el.textContent=msg; }

    // -------- App state & session (droits locaux)
    var state = loadLocal() || { version:10, teams:[], matches:[], locked:false, createdAt:new Date().toISOString(), protect:{teamPassHash:{}} };
    var ui = { open:{}, h2h:false };
    var session = { admin:false, claims:{} }; // claims[teamId]=true si connecté à l'équipe sur cet appareil

    // persist claims/admin par tournoi (code cloud)
    function sessionKey(){ return 'tournoi_session_'+(cloud.id||'local'); }
    function loadSession(){ try{ var raw=localStorage.getItem(sessionKey()); if(raw){ var s=JSON.parse(raw); if(s&&typeof s==='object'){ session=s; } } }catch(_){}; updateWhoAmI(); }
    function saveSession(){ try{ localStorage.setItem(sessionKey(), JSON.stringify(session)); }catch(_){ } updateWhoAmI(); }

    // -------- Firebase "cloud" (blob state comme avant)
    var cloud = { enabled:false, db:null, id:null, ref:null, lastRemoteAt:0, pushTimer:null };
    var hasFirebase = !!(window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
    function initFirebase(){ if(!hasFirebase) return null; try{ if (!firebase.apps || !firebase.apps.length) firebase.initializeApp(window.FIREBASE_CONFIG); return firebase.database(); }catch(e){ console.warn('Firebase init error', e); return null; } }
    function setCloudStatus(txt){ var el=id('cloud-status'); if(el) el.textContent=txt; }

    function joinCloud(tournamentId){
      if(!hasFirebase){ alert('Firebase non configuré (voir index.html).'); return; }
      if(!cloud.db){ cloud.db = initFirebase(); if(!cloud.db){ alert('Impossible d’initialiser Firebase.'); return; } }
      cloud.id = (tournamentId||'').trim();
      if(!cloud.id){ alert('Saisis un code tournoi.'); return; }
      cloud.ref = cloud.db.ref('tournaments/'+cloud.id+'/payload');
      cloud.enabled = true; setCloudStatus('connexion…');
      loadSession();

      cloud.ref.on('value', function(snap){
        var val = snap.val();
        if(!val){ pushCloud(true); return; }
        var remoteAt = +val.updatedAt || 0;
        if(remoteAt <= cloud.lastRemoteAt) return;
        cloud.lastRemoteAt = remoteAt;
        state = val.state || state;
        // garde le container protect
        if(!state.protect) state.protect={teamPassHash:{}};
        saveLocal(); renderAll(); setCloudStatus('connecté ('+cloud.id+')');
      });

      pushCloud(true);
      setCloudStatus('connecté ('+cloud.id+')');
      try{ var url = location.origin + location.pathname + '?v=roles1&id=' + encodeURIComponent(cloud.id); history.replaceState(null,'', url); }catch(_){}
    }
    function leaveCloud(){ if(cloud.ref){ cloud.ref.off(); } cloud.enabled=false; cloud.id=null; cloud.ref=null; setCloudStatus('hors ligne'); loadSession(); }
    function pushCloud(immediate){
      if(!cloud.enabled || !cloud.ref) return;
      var doPush = function(){ cloud.ref.set({ state: state, updatedAt: Date.now() }); };
      if(immediate){ clearTimeout(cloud.pushTimer); doPush(); }
      else{ clearTimeout(cloud.pushTimer); cloud.pushTimer = setTimeout(doPush, 250); }
    }

    // Auto-join from URL
    (function(){ var p = new URLSearchParams(location.search); var idParam = p.get('id'); if(idParam){ id('cloud-id').value = idParam; joinCloud(idParam); } })();

    // -------- Utils
    function uid(){ return Math.random().toString(36).slice(2,10); }
    function esc(s){ return (s==null?'':String(s)).replace(/[&<>"']/g,function(ch){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch];}); }
    function clampInt(v,min,max){ if(isNaN(v)) return null; if(v<min) return min; if(v>max) return max; return v; }
    function id(x){ return document.getElementById(x); }
    function qs(s){ return document.querySelector(s); }
    function qsa(s){ return Array.prototype.slice.call(document.querySelectorAll(s)); }
    function qsaIn(n,s){ return Array.prototype.slice.call(n.querySelectorAll(s)); }
    function help(t){ var d=document.createElement('div'); d.className='help'; d.textContent=t; return d; }
    function onClick(el,fn){ if(el&&el.addEventListener) el.addEventListener('click',fn); }
    function teamName(idv){ var t=state.teams.find(function(tt){return tt.id===idv}); return t? t.name : '—'; }
    async function sha256(str){ const enc=new TextEncoder().encode(str); const buf=await crypto.subtle.digest('SHA-256',enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,'0')).join(''); }
    function tournamentSalt(){ return cloud.id || 'local'; }

    // -------- Droits
    function isAdmin(){ return !!session.admin; }
    function hasClaim(teamId){ return !!session.claims[teamId]; }
    function canEditTeam(teamId){ return isAdmin() || (!state.locked && hasClaim(teamId)); }
    function canEditMatch(m){ return isAdmin() || hasClaim(m.a) || hasClaim(m.b); }
    function updateWhoAmI(){
      var who=id('whoami'); if(!who) return;
      var role = isAdmin()? 'ADMIN' : (Object.keys(session.claims||{}).length? ('équipe: '+Object.keys(session.claims).map(function(k){return teamName(k)}).filter(Boolean).join(', ')) : 'visiteur (lecture seule)');
      who.textContent = 'vous : ' + role;
      // boutons visibles/invisibles
      var addTeamBtn=id('btn-add-team'); if(addTeamBtn) addTeamBtn.style.display=isAdmin()?'inline-block':'none';
    }

    // -------- Tabs
    qsa('.tab').forEach(function(btn){
      btn.addEventListener('click', function(){
        qsa('.tab').forEach(function(b){ b.setAttribute('aria-selected','false'); });
        btn.setAttribute('aria-selected','true');
        qsa('main section').forEach(function(s){ s.classList.remove('active'); });
        id(btn.getAttribute('data-tab')).classList.add('active');
      });
    });

    // -------- Cloud UI
    onClick(id('btn-cloud-join'), function(){ joinCloud(id('cloud-id').value.trim()); });
    onClick(id('btn-cloud-leave'), function(){ leaveCloud(); });
    onClick(id('btn-cloud-copy'), function(){
      var code = id('cloud-id').value.trim();
      if(!code){ alert('Renseigne d’abord le code tournoi.'); return; }
      var url = location.origin + location.pathname + '?v=roles1&id=' + encodeURIComponent(code);
      navigator.clipboard && navigator.clipboard.writeText(url).catch(function(){});
      alert('Lien copié !\n'+url);
    });

    // -------- Admin ON/OFF
    onClick(id('btn-admin-on'), async function(){
      var pin = prompt('PIN administrateur :');
      if(pin==='30041991'){ session.admin=true; saveSession(); renderAll(); alert('Mode administrateur activé.'); }
      else{ alert('PIN incorrect.'); }
    });
    onClick(id('btn-admin-off'), function(){ session.admin=false; saveSession(); renderAll(); });

    // -------- Teams
    var teamListEl = id('team-list');

    onClick(id('btn-create-my-team'), async function(){
      if(state.locked){ alert('Calendrier figé : impossible de créer une équipe.'); return; }
      var name = prompt("Nom de l'équipe :"); if(!name) return;
      var p1 = prompt("Joueur·se 1 :")||''; var p2 = prompt("Joueur·se 2 :")||'';
      var pass = prompt("Mot de passe d'équipe (à retenir) :"); if(!pass) return;
      var hash = await sha256(tournamentSalt()+'|'+pass);
      var tId = uid();
      state.teams.push({ id:tId, name:name, p1:p1, p2:p2 });
      if(!state.protect) state.protect={teamPassHash:{}}; state.protect.teamPassHash[tId]=hash;
      session.claims[tId]=true; saveSession();
      saveState(); renderTeams(); updateCounts(); updateLockUI();
      alert('Équipe créée et protégée. Conservez le mot de passe !');
    });

    onClick(id('btn-add-team'), function(){
      if(!isAdmin()){ alert('Réservé à l’administrateur.'); return; }
      if(state.locked){ alert('Calendrier figé.'); return; }
      state.teams.push({ id: uid(), name: 'Équipe '+(state.teams.length+1), p1:'', p2:'' });
      saveState(); renderTeams(); updateCounts(); updateLockUI();
    });

    onClick(id('btn-generate'), function(){
      if(!isAdmin()){ alert('Seul l’admin peut générer.'); return; }
      if(state.locked){ return; }
      generateSchedule();
      state.locked=true; saveState();
      renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); updateLockUI();
      var tab=qs('.tab[data-tab="calendrier"]'); if(tab&&tab.click) tab.click();
    });

    function renderTeams(){
      teamListEl.innerHTML='';
      if(state.teams.length===0){ teamListEl.appendChild(help('Aucune équipe pour le moment.')); updateCounts(); updateLockUI(); return; }
      state.teams.forEach(function(t, idx){
        var claimed = !!(state.protect && state.protect.teamPassHash && state.protect.teamPassHash[t.id]);
        var iOwn = hasClaim(t.id);
        var admin=isAdmin();
        var dis = (!canEditTeam(t.id))?' disabled':'';
        var delBtn = (admin && !state.locked)? '<button type="button" class="btn small danger" data-action="del-team" data-id="'+t.id+'">Supprimer</button>' : '';
        var protectInfo = claimed ? (iOwn? '🔒 vous êtes connecté à cette équipe' : '🔒 protégée') : '🔓 non protégée';
        var protectBtns = ''
          + (iOwn || admin ? '<button type="button" class="btn small" data-action="set-pass" data-id="'+t.id+'">Définir / changer mot de passe</button>' : '')
          + (!iOwn ? '<button type="button" class="btn small" data-action="login-team" data-id="'+t.id+'">Se connecter à cette équipe</button>' : '<button type="button" class="btn small" data-action="logout-team" data-id="'+t.id+'">Se déconnecter</button>');

        var card=document.createElement('div'); card.className='match-card';
        card.innerHTML=''
          +'<div class="match-head"><div class="teams"><span class="chip">#'+(idx+1)+'</span> '
          +'<input type="text"'+dis+' value="'+esc(t.name)+'" data-field="name" data-id="'+t.id+'"/></div><div>'+delBtn+'</div></div>'
          +'<div class="match-body" style="display:block"><div class="grid cols-2">'
          +'<div><label>Joueur·se 1</label><input type="text"'+dis+' value="'+esc(t.p1)+'" data-field="p1" data-id="'+t.id+'"/></div>'
          +'<div><label>Joueur·se 2</label><input type="text"'+dis+' value="'+esc(t.p2)+'" data-field="p2" data-id="'+t.id+'"/></div>'
          +'</div>'
          +'<div class="help" style="margin-top:6px">'+protectInfo+'</div>'
          +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+protectBtns+'</div>'
          +'</div>';
        teamListEl.appendChild(card);
      });
      // handlers
      qsa('#team-list input[data-field]').forEach(function(inp){
        inp.addEventListener('input', function(){
          var tid=inp.getAttribute('data-id'), f=inp.getAttribute('data-field');
          if(!canEditTeam(tid)) return;
          var t=state.teams.find(function(x){return x.id===tid}); if(!t) return;
          t[f]=inp.value; saveState(); renderMatches(); renderLeaderboard(); renderH2H();
        });
      });
      qsa('#team-list button[data-action="del-team"]').forEach(function(btn){
        btn.addEventListener('click', function(){
          if(!isAdmin() || state.locked) return;
          var tid=btn.getAttribute('data-id'); if(!confirm('Supprimer cette équipe ?')) return;
          state.teams=state.teams.filter(function(tt){return tt.id!==tid});
          state.matches=state.matches.filter(function(m){return m.a!==tid && m.b!==tid});
          if(state.protect && state.protect.teamPassHash) delete state.protect.teamPassHash[tid];
          if(session.claims && session.claims[tid]){ delete session.claims[tid]; saveSession(); }
          saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); updateCounts();
        });
      });
      qsa('#team-list button[data-action="set-pass"]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          var tid=btn.getAttribute('data-id'); if(!(isAdmin()||hasClaim(tid))) { alert('Réservé à l’équipe ou à l’admin.'); return; }
          var pass=prompt('Nouveau mot de passe (équipe '+teamName(tid)+') :'); if(!pass) return;
          var hash=await sha256(tournamentSalt()+'|'+pass); if(!state.protect) state.protect={teamPassHash:{}}; state.protect.teamPassHash[tid]=hash; saveState(); renderTeams();
          alert('Mot de passe mis à jour.');
        });
      });
      qsa('#team-list button[data-action="login-team"]').forEach(function(btn){
        btn.addEventListener('click', async function(){
          var tid=btn.getAttribute('data-id');
          var pass=prompt('Mot de passe de l’équipe '+teamName(tid)+' :'); if(!pass) return;
          var hash=await sha256(tournamentSalt()+'|'+pass);
          var good = state.protect && state.protect.teamPassHash && state.protect.teamPassHash[tid]===hash;
          if(good){ session.claims[tid]=true; saveSession(); renderTeams(); renderMatches(); alert('Connexion à l’équipe réussie.'); }
          else{ alert('Mot de passe incorrect.'); }
        });
      });
      qsa('#team-list button[data-action="logout-team"]').forEach(function(btn){
        btn.addEventListener('click', function(){
          var tid=btn.getAttribute('data-id'); delete session.claims[tid]; saveSession(); renderTeams(); renderMatches();
        });
      });

      updateCounts(); updateLockUI();
    }

    function updateCounts(){
      id('teams-count').textContent = state.teams.length + ' ' + (state.teams.length>1?'équipes':'équipe');
      var perTeam=Math.max(0,state.teams.length-1);
      id('rounds-count').textContent = perTeam + ' ' + (perTeam>1?'matchs':'match') + ' par équipe';
    }

    // -------- Calendrier (round-robin homogène)
    function generateSchedule(){
      var ids=state.teams.map(function(t){return t.id});
      if(ids.length<2){ state.matches=[]; saveState(); return; }
      var BYE='__BYE__'; if(ids.length%2===1) ids.push(BYE);
      var fixed=ids[0], rest=ids.slice(1);
      for(var i=rest.length-1;i>0;i--){ var j=Math.floor(Math.random()*(i+1)), tmp=rest[i]; rest[i]=rest[j]; rest[j]=tmp; }
      var n=ids.length, rounds=n-1, out=[], order=0;
      for(var r=0;r<rounds;r++){
        var arr=[fixed].concat(rest), half=n/2, pairs=[];
        for(var k=0;k<half;k++){ var a=arr[k], b=arr[n-1-k]; if(a!==BYE && b!==BYE) pairs.push((r%2===0)?[a,b]:[b,a]); }
        rest=[rest[rest.length-1]].concat(rest.slice(0,rest.length-1));
        if(pairs.length>1){ var shift=r%pairs.length; while(shift-->0) pairs.unshift(pairs.pop()); }
        for(var p=0;p<pairs.length;p++){
          var pr=pairs[p];
          out.push({ id:uid(), a:pr[0], b:pr[1], darts:[null,null,null], pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}], palet:{a:null,b:null}, round:r+1, order:order++ });
        }
      }
      out.sort(function(x,y){ return (x.round-y.round)||(x.order-y.order); });
      state.matches=out; saveState();
    }

    // -------- Rencontres
    var matchListEl=id('match-list'), statsMatchesEl=id('stats-matches');
    function renderMatches(){
      matchListEl.innerHTML='';
      if(state.matches.length===0){ matchListEl.appendChild(help('Aucune rencontre planifiée.')); statsMatchesEl.textContent='0 / 0 matches complets'; return; }
      var groups={}, i; for(i=0;i<state.matches.length;i++){ var m=state.matches[i], r=m.round||1; (groups[r]=groups[r]||[]).push(m); }
      var rounds=Object.keys(groups).map(function(k){return +k}).sort(function(a,b){return a-b});
      var complete=0, idx=0;
      rounds.forEach(function(r){
        var hdr=help('Journée '+r); hdr.style.fontWeight='600'; hdr.style.margin='8px 0'; matchListEl.appendChild(hdr);
        groups[r].forEach(function(m){
          var wins=computeSetWins(m), pal=m.palet, palScore=(pal.a!=null&&pal.b!=null)?(pal.a+'–'+pal.b):'—';
          var done=isMatchComplete(m); if(done) complete++;
          var canEdit = canEditMatch(m);
          var el=document.createElement('div'); el.className='match-card'; el.setAttribute('data-id',m.id);
          el.setAttribute('aria-expanded', (ui.open[m.id]!==undefined?ui.open[m.id]:true)?'true':'false');
          el.innerHTML=''
            +'<div class="match-head" data-expand>'
            +'<div class="teams"><span class="chip">#'+(++idx)+'</span> '+esc(teamName(m.a))+' <span class="muted">vs</span> '+esc(teamName(m.b))+'</div>'
            +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
            +'<span class="chip">Journée '+(m.round||'?')+'</span>'
            +'<span class="chip">Fléchettes G: '+wins.aw.darts+'-'+wins.bw.darts+'</span>'
            +'<span class="chip">Ping G: '+wins.aw.ping+'-'+wins.bw.ping+'</span>'
            +'<span class="chip">Palet: '+palScore+'</span>'
            +(done?'<span class="pill" style="border-color:#2c6;color:#8fd">✅ Complet</span>':'<span class="pill" style="border-color:#aa6;color:#ffc">⏳ Incomplet</span>')
            +'<span class="caret">▶</span></div></div>'
            +'<div class="match-body">'+renderDarts(m,canEdit)+renderPing(m,canEdit)+renderPalet(m,canEdit)
            +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px">'
            +'<div class="help">'+(canEdit?'':'Lecture seule — identifiez-vous à l’une des deux équipes pour éditer.')+'</div>'
            +'<div>'+(canEdit?'<button type="button" class="btn small" data-clear="'+m.id+'">Effacer ce match</button>':'')+'</div></div></div>';
          el.querySelector('[data-expand]').addEventListener('click', (function(node,idv){return function(){ var isOpen=node.getAttribute('aria-expanded')==='true'; node.setAttribute('aria-expanded',isOpen?'false':'true'); ui.open[idv]=!isOpen; };})(el,m.id));
          // darts
          qsaIn(el,'select[data-match][data-kind]').forEach(function(sel){ if(!canEdit) sel.disabled=true; sel.addEventListener('change', function(){ if(!canEdit) return; var k=sel.getAttribute('data-kind'), ii=parseInt(sel.getAttribute('data-index'),10); var v=sel.value===''?null:parseInt(sel.value,10); var mm=findMatch(m.id); mm[k][ii]=v; saveState(); }); });
          // ping
          qsaIn(el,'input[data-ping]').forEach(function(inp){ if(!canEdit) inp.disabled=true; inp.addEventListener('input', function(){ if(!canEdit) return; var w=inp.getAttribute('data-ping'), ii=parseInt(inp.getAttribute('data-index'),10); var v=inp.value===''?null:clampInt(parseInt(inp.value,10),0,99); var mm=findMatch(m.id); mm.pingPts[ii][w]=v; saveState(); }); inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } }); });
          // palet
          qsaIn(el,'input[data-palet]').forEach(function(inp){ if(!canEdit) inp.disabled=true; inp.addEventListener('input', function(){ if(!canEdit) return; var w=inp.getAttribute('data-palet'); var v=inp.value===''?null:clampInt(parseInt(inp.value,10),0,11); var mm=findMatch(m.id); mm.palet[w]=v; saveState(); }); inp.addEventListener('keydown', function(e){ if(e.key==='Enter'){ e.preventDefault(); inp.blur(); } }); });
          // clear
          var clr=el.querySelector('[data-clear]'); if(clr) clr.addEventListener('click', function(){ if(!canEdit) return; clearMatch(m.id); });
          matchListEl.appendChild(el);
        });
      });
      statsMatchesEl.textContent=complete+' / '+state.matches.length+' matches complets';
    }

    function renderDarts(m,canEdit){
      var subs=['Simple 1','Simple 2','Double'], names=[teamName(m.a),teamName(m.b)], html='';
      for(var i=0;i<3;i++){
        var v=m.darts[i];
        html+='<div class="grid cols-3" style="align-items:end"><div>'
          +'<label>Fléchettes — '+subs[i]+'</label>'
          +'<select '+(canEdit?'':'disabled ')+'data-match="'+m.id+'" data-kind="darts" data-index="'+i+'">'
          +'<option value="" '+(v===null?'selected':'')+'>Non joué</option>'
          +'<option value="0" '+(v===0?'selected':'')+'>Victoire '+esc(names[0])+'</option>'
          +'<option value="1" '+(v===1?'selected':'')+'>Victoire '+esc(names[1])+'</option>'
          +'</select></div><div></div><div></div></div>';
      }
      return html;
    }
    function getPingPts(m){ return Array.isArray(m.pingPts)?m.pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; }
    function isPingValid(a,b){ if(a==null||b==null) return false; if(isNaN(a)||isNaN(b)) return false; var max=Math.max(a,b), diff=Math.abs(a-b); return (max>=11)&&(diff>=2); }
    function renderPing(m,canEdit){
      var labels=['Simple 1','Simple 2','Double'], sets=getPingPts(m), html='';
      for(var i=0;i<3;i++){
        var s=sets[i]||{a:null,b:null}, note=(s.a==null||s.b==null)?'Saisissez deux scores (11+ et écart ≥ 2).':(isPingValid(s.a,s.b)?'✔️ Score valide':'⚠️ Vainqueur à 11+ et écart de 2 (11–9, 12–10…).');
        html+='<div class="grid cols-4" style="align-items:end;margin-top:6px">'
          +'<div><label>Ping — '+labels[i]+' — '+esc(teamName(m.a))+'</label><input '+(canEdit?'':'disabled ')+'type="number" min="0" max="99" step="1" value="'+(s.a==null?'':s.a)+'" data-ping="a" data-index="'+i+'"/></div>'
          +'<div><label>Ping — '+labels[i]+' — '+esc(teamName(m.b))+'</label><input '+(canEdit?'':'disabled ')+'type="number" min="0" max="99" step="1" value="'+(s.b==null?'':s.b)+'" data-ping="b" data-index="'+i+'"/></div>'
          +'<div class="help">'+note+'</div><div></div></div>';
      }
      return html;
    }
    function renderPalet(m,canEdit){
      var a=m.palet.a, b=m.palet.b, note=(a==null||b==null)?'Saisissez les deux scores (l’un doit être 11).':((a===11&&b>=0&&b<=10)||(b===11&&a>=0&&a<=10)?'✔️ Score valide':'⚠️ Un score doit être 11, l’autre entre 0 et 10.');
      return '<div class="grid cols-4" style="align-items:end;margin-top:6px">'
        +'<div><label>Palet — '+esc(teamName(m.a))+'</label><input '+(canEdit?'':'disabled ')+'type="number" min="0" max="11" step="1" value="'+(a==null?'':a)+'" data-palet="a"/></div>'
        +'<div><label>Palet — '+esc(teamName(m.b))+'</label><input '+(canEdit?'':'disabled ')+'type="number" min="0" max="11" step="1" value="'+(b==null?'':b)+'" data-palet="b"/></div>'
        +'<div class="help">'+note+'</div><div></div></div>';
    }

    // -------- Classement
    function computeSetWins(m){
      var aw={darts:0,ping:0}, bw={darts:0,ping:0};
      m.darts.forEach(function(v){ if(v===0) aw.darts++; else if(v===1) bw.darts++; });
      getPingPts(m).forEach(function(s){ if(isPingValid(s.a,s.b)){ if(s.a>s.b) aw.ping++; else if(s.b>s.a) bw.ping++; } });
      return {aw:aw, bw:bw};
    }
    function isMatchComplete(m){
      var okD = m.darts.every(function(v){ return v===0||v===1; });
      var okP = getPingPts(m).every(function(s){ return isPingValid(s.a,s.b); });
      var pa=m.palet.a, pb=m.palet.b;
      var okL = (pa!=null&&pb!=null)&&((pa===11&&pb>=0&&pb<=10)||(pb===11&&pa>=0&&pa<=10));
      return okD && okP && okL;
    }
    function computeLeaderboard(){
      var stats={}; state.teams.forEach(function(t){ stats[t.id]={ teamId:t.id, name:t.name, points:0, dartsW:0, pingW:0, palFor:0, palAg:0, matchesComplete:0 }; });
      state.matches.forEach(function(m){
        var A=stats[m.a], B=stats[m.b];
        m.darts.forEach(function(v){ if(v===0){A.dartsW++;A.points+=5;} else if(v===1){B.dartsW++;B.points+=5;} });
        getPingPts(m).forEach(function(s){ if(isPingValid(s.a,s.b)){ if(s.a>s.b){A.pingW++;A.points+=5;} else if(s.b>s.a){B.pingW++;B.points+=5;} } });
        var pa=m.palet.a, pb=m.palet.b; if(pa!=null&&pb!=null){ A.palFor+=pa; B.palFor+=pb; A.palAg+=pb; B.palAg+=pa; A.points+=pa; B.points+=pb; }
        if(isMatchComplete(m)){ A.matchesComplete++; B.matchesComplete++; }
      });
      var rows=Object.keys(stats).map(function(k){return stats[k]});
      rows.sort(function(x,y){ var v=y.points-x.points; if(v!==0) return v; v=(y.palFor-y.palAg)-(x.palFor-x.palAg); if(v!==0) return v; v=(y.dartsW+y.pingW)-(x.dartsW+x.pingW); if(v!==0) return v; return x.name.localeCompare(y.name); });
      rows.forEach(function(r,i){ r.rank=i+1; });
      return rows;
    }
    function renderLeaderboard(){
      var tbody=qs('#table-classement tbody'); if(!tbody) return; tbody.innerHTML='';
      computeLeaderboard().forEach(function(r){
        var diff=r.palFor-r.palAg; var tr=document.createElement('tr');
        tr.innerHTML='<td>'+r.rank+'</td><td>'+esc(r.name)+'</td><td><b>'+r.points+'</b></td><td>'+r.dartsW+'</td><td>'+r.pingW+'</td><td>'+r.palFor+'–'+r.palAg+' <span class="muted">('+(diff>=0?'+':'')+diff+')</span></td><td>'+r.matchesComplete+'</td>';
        tbody.appendChild(tr);
      });
    }

    // -------- H2H (cliquable)
    function pointsForTeamInMatch(m, teamId){
      var isA = (m.a===teamId), isB=(m.b===teamId);
      if(!isA && !isB) return 0;
      var pts=0;
      m.darts.forEach(function(v){ if(v===0 && isA) pts+=5; else if(v===1 && isB) pts+=5; });
      getPingPts(m).forEach(function(s){ if(isPingValid(s.a,s.b)){ if(s.a>s.b && isA) pts+=5; else if(s.b>s.a && isB) pts+=5; } });
      if(m.palet && m.palet.a!=null && m.palet.b!=null){ pts += isA? m.palet.a : m.palet.b; }
      return pts;
    }
    function renderH2H(){
      var thead=qs('#table-h2h thead'), tbody=qs('#table-h2h tbody'); if(!thead||!tbody) return;
      thead.innerHTML=''; tbody.innerHTML='';
      var teams=state.teams.slice(); if(teams.length===0){ tbody.appendChild(help('Ajoutez des équipes pour voir la matrice.')); return; }
      var trH=document.createElement('tr'); trH.appendChild(document.createElement('th')).textContent='Équipe';
      teams.forEach(function(t){ var th=document.createElement('th'); th.textContent=t.name; trH.appendChild(th); });
      thead.appendChild(trH);
      var byPair={}; state.matches.forEach(function(m){ byPair[[m.a,m.b].sort().join('|')]=m; });
      teams.forEach(function(ti){
        var tr=document.createElement('tr'); var th=document.createElement('th'); th.textContent=ti.name; tr.appendChild(th);
        teams.forEach(function(tj){
          var td=document.createElement('td');
          if(ti.id===tj.id){ td.innerHTML='—'; tr.appendChild(td); return; }
          var key=[ti.id,tj.id].sort().join('|'); var m=byPair[key];
          if(!m){ td.innerHTML='<span class="h2h-badge h2h-pend">—</span>'; tr.appendChild(td); return; }
          var pI=pointsForTeamInMatch(m,ti.id), pJ=pointsForTeamInMatch(m,tj.id);
          if(pI===0 && pJ===0){ td.innerHTML='<span class="h2h-badge h2h-pend">•</span>'; }
          else{
            var cls=(pI>pJ)?'h2h-win':(pI<pJ)?'h2h-loss':'h2h-pend';
            var tag=(pI>pJ)?'W':(pI<pJ)?'L':'=';
            td.innerHTML='<span class="h2h-badge '+cls+'">'+tag+' '+pI+'–'+pJ+'</span>';
          }
          td.className='h2h-clickable'; td.setAttribute('data-match-id', m.id);
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      tbody.addEventListener('click', function(e){
        var node=e.target; while(node && node!==tbody && !(node.tagName==='TD' && node.getAttribute('data-match-id'))) node=node.parentNode;
        if(!node || node===tbody) return;
        var mid=node.getAttribute('data-match-id'); if(mid) goToMatch(mid);
      });
    }
    function goToMatch(matchId){
      var tab=qs('.tab[data-tab="calendrier"]'); if(tab&&tab.click) tab.click();
      ui.open[matchId]=true;
      setTimeout(function(){
        var card=qs('.match-card[data-id="'+matchId+'"]');
        if(card){
          card.setAttribute('aria-expanded','true');
          try{ card.scrollIntoView({behavior:'smooth', block:'start'}); }catch(_){ card.scrollIntoView(); }
        }
      }, 0);
    }

    // -------- Toggle H2H
    function showH2H(on){
      ui.h2h=!!on;
      var a=id('view-summary'), b=id('view-h2h'), btn=id('btn-toggle-h2h');
      if(a&&b){ a.style.display = on? 'none':'block'; b.style.display = on? 'block':'none'; }
      if(btn){ btn.textContent = on? 'Vue classement' : 'Vue face-à-face'; }
      if(on) renderH2H();
    }
    onClick(id('btn-toggle-h2h'), function(ev){ ev.preventDefault(); showH2H(!ui.h2h); });
    document.addEventListener('click', function(e){ var trg = e.target && e.target.closest ? e.target.closest('#btn-toggle-h2h') : null; if(trg){ e.preventDefault(); showH2H(!ui.h2h); } });
    window.__toggleH2H = function(){ showH2H(!ui.h2h); };

    // -------- Export / Import / Partage offline
    onClick(id('btn-export'), function(){ var data=JSON.stringify(state,null,2); var blob=new Blob([data],{type:'application/json'}); var url=URL.createObjectURL(blob); var a=document.createElement('a'); a.href=url; a.download='tournoi-amis-'+new Date().toISOString().slice(0,10)+'.json'; a.click(); URL.revokeObjectURL(url); });
    var importFile=null; id('file-import').addEventListener('change', function(e){ importFile=e.target.files[0]; });
    onClick(id('btn-import'), function(){ if(!importFile){ alert('Sélectionnez un fichier JSON.'); return; } importFile.text().then(function(text){ try{ var data=JSON.parse(text); if(!(data && Array.isArray(data.teams) && Array.isArray(data.matches))) throw new Error('format'); state=data; if(typeof state.locked==='undefined') state.locked=false; if(!state.protect) state.protect={teamPassHash:{}}; saveState(); renderAll(); alert('Import réussi !'); }catch(e){ alert('Fichier invalide.'); } }); });
    onClick(id('btn-share'), function(){
      var json = JSON.stringify(state);
      var b64 = btoa(unescape(encodeURIComponent(json)));
      var enc = encodeURIComponent(b64);
      var base = location.origin + location.pathname;
      var url = base + '?v=roles1#s=' + enc;
      var inp = id('share-url'); if(inp){ inp.value=url; inp.select(); try{ document.execCommand('copy'); }catch(_){ } }
      navigator.clipboard && navigator.clipboard.writeText(url).catch(function(){});
      alert('Lien (offline) copié !');
    });
    (function tryImportFromHash(){
      var m = location.hash.match(/^#s=([^&]+)$/);
      if(!m) return;
      try{
        var b64 = decodeURIComponent(m[1]);
        var json = decodeURIComponent(escape(atob(b64)));
        var data = JSON.parse(json);
        if(!(data && Array.isArray(data.teams) && Array.isArray(data.matches))) throw new Error('format');
        state = data; if(!state.protect) state.protect={teamPassHash:{}}; saveLocal();
        history.replaceState(null,'',location.pathname + location.search);
      }catch(e){ alert('Lien de partage invalide.'); }
    })();

    // -------- Reset protégé
    onClick(id('btn-reset'), function(){
      var pwd = prompt('Mot de passe requis (PIN admin) :');
      if(pwd !== '30041991'){ alert('PIN incorrect.'); return; }
      if(!confirm('Confirmer la ré-initialisation complète du tournoi ?')) return;
      state={version:10,teams:[],matches:[],locked:false,createdAt:new Date().toISOString(),protect:{teamPassHash:{}}};
      session={admin:false,claims:{}}; saveSession();
      saveState(); renderAll();
    });

    // -------- Unlock
    onClick(id('btn-unlock'), function(){ if(!isAdmin()){ alert('Réservé à l’admin.'); return; } if(!confirm('Déverrouiller le calendrier ?')) return; state.locked=false; saveState(); renderTeams(); renderMatches(); updateLockUI(); });

    // -------- Helpers communs
    function findMatch(idv){ return state.matches.find(function(x){return x.id===idv}); }
    function clearMatch(idv){ var m=findMatch(idv); if(!m) return; if(!canEditMatch(m)) return; if(!confirm('Effacer tous les scores de ce match ?')) return; m.darts=[null,null,null]; m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; m.palet={a:null,b:null}; saveState(); renderMatches(); renderLeaderboard(); renderH2H(); }
    function updateLockUI(){ var pill=id('lock-pill'); if(pill) pill.style.display=state.locked?'inline-block':'none'; var gen=id('btn-generate'); if(gen){ gen.disabled=!!state.locked; gen.textContent=state.locked?'Calendrier figé':'Générer le calendrier'; } }

    // -------- Sauvegarde + push cloud
    function saveState(){ saveLocal(); renderLeaderboard(); if(cloud.enabled) pushCloud(false); }

    // -------- Init
    loadSession(); renderAll(); updateStorageWarning(); showH2H(ui.h2h); setCloudStatus(cloud.enabled ? 'connecté' : 'hors ligne');

    function renderAll(){ renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); updateCounts(); updateLockUI(); updateWhoAmI(); }
  });
})();
