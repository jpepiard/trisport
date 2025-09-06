// JS OK roles2c12 — bouton Plein écran (Esc pour quitter)
(function () {
  window.onerror = function (msg, src, line, col) {
    var el = document.getElementById("storage-warning");
    if (!el) return;
    el.style.display = "block";
    el.textContent = "Erreur JS : " + msg + " @" + (src || "") + ":" + (line || 0) + ":" + (col || 0);
  };

  document.addEventListener("DOMContentLoaded", function () {
    document.title = "TriSports — Fléchettes • Ping-pong • Palet";
    var h1 = document.querySelector(".brand h1");
    if (h1) h1.textContent = "TriSports";

    // tailles avatars
    var style = document.createElement("style");
    style.textContent = `
      .avatar{width:40px;height:40px;font-size:14px}
      .avatar .avatar-initials{line-height:40px}
      .avatar-lg{width:48px;height:48px;font-size:15px}
      .avatar-lg .avatar-initials{line-height:48px}
      .avatar-sm{width:32px;height:32px;font-size:12px}
      .avatar-sm .avatar-initials{line-height:32px}
    `;
    document.head.appendChild(style);

    // ---------- Local storage
    var STORAGE_KEY = "tournoi_amis_roles2c6";
    var MEMORY_ONLY = false;
    function saveLocal(){ try{ if(!MEMORY_ONLY) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ MEMORY_ONLY=true; warnStorage(); } }
    function loadLocal(){ try{ var raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):null; }catch(e){ MEMORY_ONLY=true; return null; } }
    function warnStorage(){
      var el=id("storage-warning");
      if(el){
        el.style.display="block";
        el.textContent="⚠️ Stockage local indisponible (navigation privée ?)";
      }
    }

    // ---------- State + session
    var state = loadLocal() || { version: 20, teams: [], matches: [], locked:false, createdAt:new Date().toISOString(), protect:{teamPassHash:{}} };
    normalizeState();
    var ui = { open:{}, h2h:false };
    var session = { admin:false, claims:{} };

    function sessionKey(){ return "tournoi_session_"+(cloud.id||"local"); }
    function loadSession(){ try{ var raw=localStorage.getItem(sessionKey()); if(raw){ var s=JSON.parse(raw); if(s) session=s; } }catch(_){} updateWho(); }
    function saveSession(){ try{ localStorage.setItem(sessionKey(), JSON.stringify(session)); }catch(_){} updateWho(); }

    // ---------- Firebase (compat)
    var cloud = { enabled:false, db:null, id:null, ref:null, lastRemoteAt:0, pushTimer:null };
    var hasFB = !!(window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
    function initFB(){ if(!hasFB) return null; try{ var apps; try{ apps=firebase.apps; }catch(_){ apps=[]; } if(!apps||!Array.isArray(apps)||apps.length===0) firebase.initializeApp(window.FIREBASE_CONFIG); return firebase.database(); }catch(e){ console.warn("Firebase init error",e); return null; } }
    function setCloud(txt){ var el=id("cloud-status"); if(el) el.textContent=txt; }

    function joinCloud(code){
      if(!hasFB){ alert("Firebase non configuré (voir index.html)."); return; }
      if(!cloud.db){ cloud.db=initFB(); if(!cloud.db){ alert("Initialisation Firebase impossible."); return; } }
      cloud.id = (code||"").trim();
      if(!cloud.id){ alert("Saisis un code tournoi."); return; }
      cloud.ref = cloud.db.ref("tournaments/"+cloud.id+"/payload");
      cloud.enabled = true;
      cloud.lastRemoteAt = 0;
      setCloud("connexion…");
      loadSession();

      let firstSnapshot = true;
      cloud.ref.on("value", function(snap){
        const val = snap.val();
        if(firstSnapshot){
          firstSnapshot = false;
          if(!val){
            pushCloud(true);
            setCloud("connecté (créé)");
            return;
          }
        }
        if(!val) return;
        const remoteAt = +val.updatedAt || 0;
        if(remoteAt <= cloud.lastRemoteAt) return;
        cloud.lastRemoteAt = remoteAt;
        state = val.state || state;
        normalizeState();
        saveLocal();
        renderAll();
        setCloud("connecté ("+cloud.id+")");
      });

      try{ history.replaceState(null,"", location.pathname+"?v=roles2c12&id="+encodeURIComponent(cloud.id)); }catch(_){}
    }
    function leaveCloud(){ if(cloud.ref) cloud.ref.off(); cloud.enabled=false; cloud.id=null; cloud.ref=null; setCloud("hors ligne"); loadSession(); }
    function pushCloud(immediate){ if(!cloud.enabled||!cloud.ref) return; var doPush=function(){ cloud.ref.set({ state:state, updatedAt:Date.now() }); }; if(immediate){ clearTimeout(cloud.pushTimer); doPush(); } else { clearTimeout(cloud.pushTimer); cloud.pushTimer=setTimeout(doPush,250); } }

    (function(){ var p=new URLSearchParams(location.search); var idp=p.get("id"); if(idp){ id("cloud-id").value=idp; joinCloud(idp); } })();

    // ---------- Utils
    function uid(){ return Math.random().toString(36).slice(2,10); }
    function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, ch=>({"&":"&amp;","<":"&lt;","~":"&tilde;","\"":"&quot;","'":"&#39;"}[ch])); }
    function clampInt(v,min,max){ if(isNaN(v)) return null; if(v<min) return min; if(v>max) return max; return v; }
    function id(x){ return document.getElementById(x); }
    function qs(s){ return document.querySelector(s); }
    function qsa(s){ return Array.from(document.querySelectorAll(s)); }
    function qsaIn(n,s){ return Array.from(n.querySelectorAll(s)); }
    function help(t){ var d=document.createElement("div"); d.className="help"; d.textContent=t; return d; }
    async function sha256(str){ try{ if(window.crypto&&window.crypto.subtle){ const enc=new TextEncoder().encode(str); const buf=await crypto.subtle.digest("SHA-256",enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""); } }catch(_){} let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h*16777619)>>>0; } return ("00000000"+h.toString(16)).slice(-8).repeat(8); }
    function salt(){ return cloud.id || "local"; }

    // --- Normalisation
    function _arr(x){ return Array.isArray(x) ? x : []; }
    function _normMatch(m){
      m = m || {};
      m.id    = m.id || uid();
      m.a     = m.a  || '';
      m.b     = m.b  || '';
      m.darts = Array.isArray(m.darts) ? m.darts.slice(0,3) : [null,null,null];
      while(m.darts.length<3) m.darts.push(null);
      if(!Array.isArray(m.pingPts)) m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}];
      for(let i=0;i<3;i++){
        m.pingPts[i]=m.pingPts[i]||{a:null,b:null};
        if(typeof m.pingPts[i].a!=='number') m.pingPts[i].a=(m.pingPts[i].a==null?null:+m.pingPts[i].a);
        if(typeof m.pingPts[i].b!=='number') m.pingPts[i].b=(m.pingPts[i].b==null?null:+m.pingPts[i].b);
      }
      m.palet = m.palet || {a:null,b:null};
      if(typeof m.palet.a!=='number') m.palet.a=(m.palet.a==null?null:+m.palet.a);
      if(typeof m.palet.b!=='number') m.palet.b=(m.palet.b==null?null:+m.palet.b);
      m.round = m.round || 1;
      m.order = m.order || 0;
      return m;
    }
    function normalizeState(){ if(!state) state={}; if(!state.protect) state.protect={teamPassHash:{}}; state.teams=_arr(state.teams); state.matches=_arr(state.matches).map(_normMatch); }

    // ---------- Rôles & identité
    function isAdmin(){ return !!session.admin; }
    function hasClaim(teamId){ return !!session.claims[teamId]; }
    function canEditTeam(teamId){ return isAdmin(); }
    function canEditAvatar(teamId){ return isAdmin() || hasClaim(teamId); }
    function canEditMatch(m){ return isAdmin() || hasClaim(m.a) || hasClaim(m.b); }
    function teamObj(tid){ return state.teams.find(x=>x.id===tid)||null; }
    function teamName(tid){ var t=teamObj(tid); return t?t.name:"—"; }
    function initials(name){ var s=(name||'').trim(); if(!s) return '?'; var p=s.split(/\s+/); var ini=p[0][0] + (p.length>1 ? p[p.length-1][0] : ''); return ini.toUpperCase(); }
    function avatarHtml(tid, size){
      var t=teamObj(tid)||{name:'?'}; var url=t.avatar;
      var cls=size==='lg'?'avatar-lg':(size==='sm'?'avatar-sm':'');
      var content = url ? '<img src="'+esc(url)+'" alt="avatar">' : '<span class="avatar-initials">'+esc(initials(t.name))+'</span>';
      return '<span class="avatar '+cls+'" title="'+esc(t.name)+'">'+content+'</span>';
    }

    function identityText(){
      const teams = Object.keys(session.claims||{}).map(teamName).filter(Boolean);
      if (isAdmin()) return teams.length ? `Admin · ${teams.join(", ")}` : "Admin";
      if (teams.length) return teams.join(", ");
      return "visiteur";
    }
    function updateWho(){
      var who=id("whoami"); if(who) who.textContent = "vous : " + identityText();
      var whoTop=id("whoami-top"); if(whoTop) whoTop.textContent = identityText();
      var addBtn=id("btn-add-team"); if(addBtn) addBtn.style.display = isAdmin()? "inline-block":"none";
    }

    // ---------- Plein écran
    function fsElement(){
      return document.fullscreenElement || document.webkitFullscreenElement ||
             document.mozFullScreenElement || document.msFullscreenElement;
    }
    function enterFS(el){
      if (el.requestFullscreen) return el.requestFullscreen();
      if (el.webkitRequestFullscreen) return el.webkitRequestFullscreen();
      if (el.mozRequestFullScreen) return el.mozRequestFullScreen();
      if (el.msRequestFullscreen) return el.msRequestFullscreen();
    }
    function exitFS(){
      if (document.exitFullscreen) return document.exitFullscreen();
      if (document.webkitExitFullscreen) return document.webkitExitFullscreen();
      if (document.mozCancelFullScreen) return document.mozCancelFullScreen();
      if (document.msExitFullscreen) return document.msExitFullscreen();
    }
    function fsSupported(){
      var el=document.documentElement;
      return !!(el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen);
    }
    function updateFSBtn(){
      var btn=id("btn-fullscreen"); if(!btn) return;
      btn.style.display = fsSupported()? "inline-block":"none";
      btn.textContent = fsElement()? "Quitter plein écran" : "⛶ Plein écran";
      btn.title = fsElement()? "Quitter le plein écran (Esc)" : "Plein écran (Esc pour quitter)";
    }
    onClick(id("btn-fullscreen"), function(){
      if (fsElement()) exitFS();
      else enterFS(document.documentElement);
    });
    document.addEventListener("fullscreenchange", updateFSBtn);
    document.addEventListener("webkitfullscreenchange", updateFSBtn);
    document.addEventListener("mozfullscreenchange", updateFSBtn);
    document.addEventListener("MSFullscreenChange", updateFSBtn);
    updateFSBtn();

    // ---------- Tabs
    qsa(".tab").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        qsa(".tab").forEach(b=>b.setAttribute("aria-selected","false"));
        btn.setAttribute("aria-selected","true");
        qsa("main section").forEach(s=>s.classList.remove("active"));
        id(btn.getAttribute("data-tab")).classList.add("active");
      });
    });

    // ---------- Cloud UI
    onClick(id("btn-cloud-join"), ()=>joinCloud(id("cloud-id").value.trim()));
    onClick(id("btn-cloud-leave"), ()=>leaveCloud());
    onClick(id("btn-cloud-copy"), ()=>{
      var code=id("cloud-id").value.trim(); if(!code){ alert("Renseigne d’abord le code tournoi."); return; }
      var url=location.origin+location.pathname+"?v=roles2c12&id="+encodeURIComponent(code);
      navigator.clipboard && navigator.clipboard.writeText(url);
      alert("Lien copié !\n"+url);
    });

    // ---------- Admin ON/OFF
    onClick(id("btn-admin-on"), ()=>{
      var pin=prompt("PIN administrateur :");
      if(pin==="30041991"){ session.admin=true; saveSession(); renderAll(); alert("Mode administrateur activé."); }
      else{ alert("PIN incorrect."); }
    });
    onClick(id("btn-admin-off"), ()=>{ session.admin=false; saveSession(); renderAll(); });

    // ---------- Teams
    var teamListEl=id("team-list");

    onClick(id("btn-add-team"), ()=>{
      if(!isAdmin()){ alert("Réservé à l’admin."); return; }
      if(state.locked){ alert("Calendrier figé."); return; }
      state.teams.push({ id:uid(), name:"Équipe "+(state.teams.length+1), p1:"", p2:"", avatar:null });
      saveState(); renderTeams(); updateCounts(); updateLockUI();
    });

    onClick(id("btn-generate"), ()=>{
      if(!isAdmin()){ alert("Seul l’admin peut générer."); return; }
      if(state.locked) return;
      generateSchedule(); state.locked=true; saveState(); renderAll();
      var tab=qs('.tab[data-tab="calendrier"]'); tab&&tab.click&&tab.click();
    });

    function renderTeams(){
      teamListEl.innerHTML="";
      if(!Array.isArray(state.teams)) state.teams=[];
      if(state.teams.length===0){ teamListEl.appendChild(help("Aucune équipe pour le moment. L’administrateur peut en créer.")); updateCounts(); updateLockUI(); return; }

      state.teams.forEach((t,idx)=>{
        var iOwn=hasClaim(t.id), admin=isAdmin();
        var hasHash = !!(state.protect && state.protect.teamPassHash && state.protect.teamPassHash[t.id]);
        var dis = (!canEditTeam(t.id))?' disabled':'';
        var delBtn = (admin && !state.locked)? '<button type="button" class="btn small danger" data-act="del" data-id="'+t.id+'">Supprimer</button>' : '';
        var protectInfo = hasHash ? (iOwn? '🔒 vous êtes connecté à cette équipe' : '🔒 protégée par mot de passe') : '🔓 non protégée — demandez à l’admin de définir un mot de passe';
        var protectBtns = (admin ? '<button type="button" class="btn small" data-act="setpass" data-id="'+t.id+'">Définir / changer mot de passe</button>' : '')
                        + (!iOwn ? '<button type="button" class="btn small" data-act="login" data-id="'+t.id+'">Se connecter à cette équipe</button>'
                                 : '<button type="button" class="btn small" data-act="logout" data-id="'+t.id+'">Se déconnecter</button>');

        var canAvatar = canEditAvatar(t.id);
        var avatarBtn = canAvatar ? '<button type="button" class="btn small" data-act="avatar" data-id="'+t.id+'">Changer avatar</button>' : '';
        var avatarClr = (canAvatar && t.avatar) ? '<button type="button" class="btn small" data-act="avatar-clear" data-id="'+t.id+'">Retirer avatar</button>' : '';

        var card=document.createElement("div"); card.className="match-card";
        card.innerHTML=''
          +'<div class="match-head"><div class="teams" style="width:100%"><span class="chip">#'+(idx+1)+'</span> '
          +'<span class="team-name">'+avatarHtml(t.id,'lg')+'<input type="text"'+dis+' value="'+esc(t.name)+'" data-field="name" data-id="'+t.id+'" style="min-width:0;flex:1"/></span></div><div>'+delBtn+'</div></div>'
          +'<div class="match-body" style="display:block">'
          +'<input type="file" accept="image/*" data-avatar="'+t.id+'" style="display:none" />'
          +'<div class="grid cols-2">'
          +'<div><label>Joueur·se 1</label><input type="text"'+dis+' value="'+esc(t.p1)+'" data-field="p1" data-id="'+t.id+'"/></div>'
          +'<div><label>Joueur·se 2</label><input type="text"'+dis+' value="'+esc(t.p2)+'" data-field="p2" data-id="'+t.id+'"/></div>'
          +'</div>'
          +'<div class="help" style="margin-top:6px">'+protectInfo+'</div>'
          +'<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+avatarBtn+avatarClr+protectBtns+'</div>'
          +'</div>';
        teamListEl.appendChild(card);
      });

      // saisie fluide
      qsa('#team-list input[data-field]').forEach(inp=>{
        const tid=inp.getAttribute("data-id"), f=inp.getAttribute("data-field");
        inp.addEventListener("input", ()=>{
          if(!canEditTeam(tid)) return;
          var t=teamObj(tid); if(!t) return;
          t[f]=inp.value;
          saveState({cloud:false});
        });
        inp.addEventListener("blur", ()=>{
          if(!canEditTeam(tid)) return;
          var t=teamObj(tid); if(!t) return;
          t[f]=inp.value;
          saveState();
          renderTeams(); renderMatches(); renderLeaderboard(); renderH2H();
        });
      });

      // supprimer équipe
      qsa('#team-list [data-act="del"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{
          if(!isAdmin()||state.locked) return;
          var tid=btn.getAttribute("data-id"); if(!confirm("Supprimer cette équipe ?")) return;
          state.teams=state.teams.filter(tt=>tt.id!==tid);
          state.matches=state.matches.filter(m=>m.a!==tid&&m.b!==tid);
          if(state.protect && state.protect.teamPassHash) delete state.protect.teamPassHash[tid];
          if(session.claims && session.claims[tid]){ delete session.claims[tid]; saveSession(); }
          saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); updateCounts();
        });
      });

      // mots de passe équipe
      qsa('#team-list [data-act="setpass"]').forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          if(!isAdmin()){ alert("Réservé à l’administrateur."); return; }
          var tid=btn.getAttribute("data-id");
          var pass=prompt("Mot de passe pour l’équipe « "+teamName(tid)+" » :"); if(!pass) return;
          var hash=await sha256(salt()+"|"+pass); if(!state.protect) state.protect={teamPassHash:{}}; state.protect.teamPassHash[tid]=hash; saveState(); renderTeams();
          alert("Mot de passe défini.");
        });
      });

      // login / logout équipe
      qsa('#team-list [data-act="login"]').forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          var tid=btn.getAttribute("data-id");
          var hasHash = !!(state.protect && state.protect.teamPassHash && state.protect.teamPassHash[tid]);
          if(!hasHash){ alert("Cette équipe n’a pas encore de mot de passe. Contactez l’administrateur."); return; }
          var pass=prompt("Mot de passe de l’équipe « "+teamName(tid)+" » :"); if(!pass) return;
          var hash=await sha256(salt()+"|"+pass);
          var ok=state.protect.teamPassHash[tid]===hash;
          if(ok){ session.claims[tid]=true; saveSession(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); alert("Connexion réussie."); }
          else{ alert("Mot de passe incorrect."); }
        });
      });
      qsa('#team-list [data-act="logout"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{ var tid=btn.getAttribute("data-id"); delete session.claims[tid]; saveSession(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); });
      });

      // avatar
      qsa('#team-list [data-act="avatar"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{
          var tid=btn.getAttribute("data-id");
          if(!canEditAvatar(tid)){ alert("Accès refusé."); return; }
          var input = qs('[data-avatar="'+tid+'"]'); if(input) input.click();
        });
      });
      qsa('#team-list [data-act="avatar-clear"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{
          var tid=btn.getAttribute("data-id"); if(!canEditAvatar(tid)) return;
          var t=teamObj(tid); if(!t) return; t.avatar=null; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H();
        });
      });
      qsa('#team-list input[type="file"][data-avatar]').forEach(inp=>{
        inp.addEventListener("change", async ()=>{
          var tid=inp.getAttribute("data-avatar"); if(!canEditAvatar(tid)) return;
          var file=inp.files && inp.files[0]; if(!file) return;
          try{
            const url = await fileToSquareDataURL(file, 160);
            var t=teamObj(tid); if(!t) return; t.avatar=url; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H();
          }catch(e){ alert("Échec du chargement de l’avatar."); }
          finally{ inp.value=""; }
        });
      });

      updateCounts(); updateLockUI();
    }

    // ------- image -> dataURL carré
    function fileToSquareDataURL(file, size){
      return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onerror=()=>reject(new Error("read"));
        reader.onload=()=>{
          const img=new Image();
          img.onload=()=>{
            try{
              const min=Math.min(img.width,img.height);
              const sx=(img.width-min)/2, sy=(img.height-min)/2;
              const c=document.createElement('canvas'); c.width=size; c.height=size;
              const ctx=c.getContext('2d');
              ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
              resolve(c.toDataURL('image/jpeg',0.9));
            }catch(e){ reject(e); }
          };
          img.onerror=()=>reject(new Error("img"));
          img.src=reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function updateCounts(){ id("teams-count").textContent = state.teams.length + " " + (state.teams.length>1?"équipes":"équipe"); var perTeam=Math.max(0,state.teams.length-1); id("rounds-count").textContent = perTeam + " " + (perTeam>1?"matchs":"match") + " par équipe"; }

    // ---------- Calendrier homogène
    function generateSchedule(){
      var teamArr=Array.isArray(state.teams)?state.teams:[]; var ids=teamArr.map(t=>t.id);
      if(ids.length<2){ state.matches=[]; saveState(); renderMatches(); return; }
      var BYE="__BYE__"; if(ids.length%2===1) ids.push(BYE);
      var fixed=ids[0], rest=ids.slice(1); if(!Array.isArray(rest)) rest=[];
      for(let i=rest.length-1;i>0;i--){ let j=Math.floor(Math.random()*(i+1)); [rest[i],rest[j]]=[rest[j],rest[i]]; }
      var n=ids.length, rounds=n-1, out=[], order=0;
      for(let r=0;r<rounds;r++){
        var arr=[fixed].concat(rest), half=n/2, pairs=[];
        for(let k=0;k<half;k++){ var a=arr[k], b=arr[n-1-k]; if(a!==BYE&&b!==BYE) pairs.push((r%2===0)?[a,b]:[b,a]); }
        rest=[rest[rest.length-1]].concat(rest.slice(0,rest.length-1));
        if(pairs.length>1){ var shift=r%pairs.length; while(shift-->0) pairs.unshift(pairs.pop()); }
        for(let p=0;p<pairs.length;p++){
          var pr=pairs[p];
          out.push({ id:uid(), a:pr[0], b:pr[1], darts:[null,null,null], pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}], palet:{a:null,b:null}, round:r+1, order:order++ });
        }
      }
      out.sort((x,y)=>(x.round-y.round)||(x.order-y.order)); state.matches=out; saveState(); renderMatches();
    }

    // ---------- Helpers scores
    function getPingPts(m){ return Array.isArray(m.pingPts)?m.pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; }
    function isPingValid(a,b){ if(a==null||b==null) return false; if(isNaN(a)||isNaN(b)) return false; var max=Math.max(a,b), diff=Math.abs(a-b); return (max>=11)&&(diff>=2); }
    function computeSetWins(m){
      var darts = Array.isArray(m.darts) ? m.darts : [null,null,null];
      var sets  = getPingPts(m);
      var aw={darts:0,ping:0}, bw={darts:0,ping:0};
      darts.forEach(function(v){ if(v===0) aw.darts++; else if(v===1) bw.darts++; });
      sets.forEach(function(s){ var a=(s&&typeof s.a==='number')?s.a:null; var b=(s&&typeof s.b==='number')?s.b:null; if(isPingValid(a,b)){ if(a>b) aw.ping++; else if(b>a) bw.ping++; } });
      return {aw:aw, bw:bw};
    }
    function isMatchComplete(m){
      var okD=(Array.isArray(m.darts)?m.darts:[null,null,null]).every(v=>v===0||v===1);
      var okP=getPingPts(m).every(s=>isPingValid(s.a,s.b));
      var pa=m.palet.a, pb=m.palet.b;
      var okL=(pa!=null&&pb!=null)&&((pa===11&&pb>=0&&pb<=10)||(pb===11&&pa>=0&&pa<=10));
      return okD&&okP&&okL;
    }

    // ---------- Rencontres
    var matchListEl=id("match-list"), statsMatchesEl=id("stats-matches");
    function renderMatches(){
      matchListEl.innerHTML="";
      if(!Array.isArray(state.matches) || state.matches.length===0){ matchListEl.appendChild(help("Aucune rencontre planifiée.")); statsMatchesEl.textContent="0 / 0 matches complets"; return; }
      var groups={}; state.matches.forEach(m=>{ (groups[m.round]=groups[m.round]||[]).push(m); });
      var rounds=Object.keys(groups).map(k=>+k).sort((a,b)=>a-b);
      var complete=0, idx=0;
      rounds.forEach(r=>{
        var hdr=help("Journée "+r); hdr.style.fontWeight="600"; hdr.style.margin="8px 0"; matchListEl.appendChild(hdr);
        groups[r].forEach(m=>{
          var wins=computeSetWins(m), pal=m.palet, palScore=(pal.a!=null&&pal.b!=null)?(pal.a+"–"+pal.b):"—";
          var done=isMatchComplete(m); if(done) complete++;
          var can = canEditMatch(m);
          var el=document.createElement("div"); el.className="match-card"; el.dataset.id=m.id;

          var isOpen = (typeof ui.open[m.id] === "boolean") ? ui.open[m.id] : false;
          el.setAttribute("aria-expanded", isOpen ? "true" : "false");

          el.innerHTML=''
            +'<div class="match-head" data-expand>'
            +'<div class="teams"><span class="chip">#'+(++idx)+'</span> '
            +'<span class="team-name">'+avatarHtml(m.a,'sm')+esc(teamName(m.a))+'</span> <span class="muted">vs</span> '
            +'<span class="team-name">'+avatarHtml(m.b,'sm')+esc(teamName(m.b))+'</span></div>'
            +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
            +'<span class="chip">Journée '+(m.round||"?")+'</span>'
            +'<span class="chip">Fléchettes G: '+wins.aw.darts+'-'+wins.bw.darts+'</span>'
            +'<span class="chip">Ping G: '+wins.aw.ping+'-'+wins.bw.ping+'</span>'
            +'<span class="chip">Palet: '+palScore+'</span>'
            +(done?'<span class="pill" style="border-color:#2c6;color:#8fd">✅ Complet</span>':'<span class="pill" style="border-color:#aa6;color:#ffc">⏳ Incomplet</span>')
            +'<span class="caret">▶</span></div></div>'
            +'<div class="match-body">'+renderDarts(m,can)+renderPing(m,can)+renderPalet(m,can)
            +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px">'
            +'<div class="help">'+(can?'':'Lecture seule — connectez-vous à une des deux équipes.')+'</div>'
            +'<div>'+(can?'<button type="button" class="btn small" data-clear="'+m.id+'">Effacer ce match</button>':'')+'</div></div></div>';

          el.querySelector("[data-expand]").addEventListener("click", ()=>{
            var open=el.getAttribute("aria-expanded")==="true";
            el.setAttribute("aria-expanded", open?"false":"true");
            ui.open[m.id]=!open;
          });

          // fléchettes
          qsaIn(el,'select[data-match][data-kind]').forEach(sel=>{
            if(!can) sel.disabled=true;
            sel.addEventListener("change", ()=>{
              if(!can) return;
              var k=sel.getAttribute("data-kind"), ii=parseInt(sel.getAttribute("data-index"),10);
              var v=sel.value===""?null:parseInt(sel.value,10);
              var mm=findMatch(m.id); mm[k][ii]=v; saveState(); renderLeaderboard(); renderH2H();
            });
          });

          // ping
          qsaIn(el,'input[data-ping]').forEach(inp=>{
            if(!can) inp.disabled=true;
            inp.addEventListener("input", ()=>{
              if(!can) return;
              var w=inp.getAttribute("data-ping"), ii=parseInt(inp.getAttribute("data-index"),10);
              var v=inp.value===""?null:clampInt(parseInt(inp.value,10),0,99);
              var mm=findMatch(m.id); mm.pingPts[ii][w]=v; saveState(); renderLeaderboard(); renderH2H();
            });
            inp.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); inp.blur(); } });
          });

          // palet
          qsaIn(el,'input[data-palet]').forEach(inp=>{
            if(!can) inp.disabled=true;
            inp.addEventListener("input", ()=>{
              if(!can) return;
              var w=inp.getAttribute("data-palet");
              var v=inp.value===""?null:clampInt(parseInt(inp.value,10),0,11);
              var mm=findMatch(m.id); mm.palet[w]=v; saveState(); renderLeaderboard(); renderH2H();
            });
            inp.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); inp.blur(); } });
          });

          var clr=el.querySelector("[data-clear]"); if(clr) clr.addEventListener("click", ()=>{ if(!can) return; clearMatch(m.id); renderLeaderboard(); renderH2H(); });

          matchListEl.appendChild(el);
        });
      });
      statsMatchesEl.textContent=complete+" / "+state.matches.length+" matches complets";
      renderLeaderboard();
    }

    function renderDarts(m,can){
      var subs=["Simple 1","Simple 2","Double"], names=[teamName(m.a),teamName(m.b)], html="";
      for(var i=0;i<3;i++){
        var v=m.darts[i];
        html+='<div class="grid cols-3" style="align-items:end"><div>'
          +'<label>Fléchettes — '+subs[i]+'</label>'
          +'<select '+(can?'':'disabled ')+'data-match="'+m.id+'" data-kind="darts" data-index="'+i+'">'
          +'<option value="" '+(v===null?'selected':'')+'>Non joué</option>'
          +'<option value="0" '+(v===0?'selected':'')+'>Victoire '+esc(names[0])+'</option>'
          +'<option value="1" '+(v===1?'selected':'')+'>Victoire '+esc(names[1])+'</option>'
          +'</select></div><div></div><div></div></div>';
      }
      return html;
    }

    function renderPing(m,can){
      var labels=["Simple 1","Simple 2","Double"], sets=getPingPts(m), html="";
      for(var i=0;i<3;i++){
        var s=sets[i]||{a:null,b:null}, note=(s.a==null||s.b==null)?'Saisissez deux scores (11+ et écart ≥ 2).':(isPingValid(s.a,s.b)?'✔️ Score valide':'⚠️ Vainqueur à 11+ et écart de 2 (11–9, 12–10…).');
        html+='<div class="grid cols-4" style="align-items:end;margin-top:6px">'
          +'<div><label>Ping — '+labels[i]+' — '+esc(teamName(m.a))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="99" step="1" value="'+(s.a==null?'':s.a)+'" data-ping="a" data-index="'+i+'"/></div>'
          +'<div><label>Ping — '+labels[i]+' — '+esc(teamName(m.b))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="99" step="1" value="'+(s.b==null?'':s.b)+'" data-ping="b" data-index="'+i+'"/></div>'
          +'<div class="help">'+note+'</div><div></div></div>';
      }
      return html;
    }

    function renderPalet(m,can){
      var a=m.palet.a, b=m.palet.b, note=(a==null||b==null)?'Saisissez les deux scores (l’un doit être 11).':((a===11&&b>=0&&b<=10)||(b===11&&a>=0&&a<=10)?'✔️ Score valide':'⚠️ Un score doit être 11, l’autre entre 0 et 10.');
      return '<div class="grid cols-4" style="align-items:end;margin-top:6px">'
        +'<div><label>Palet — '+esc(teamName(m.a))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="11" step="1" value="'+(a==null?'':a)+'" data-palet="a"/></div>'
        +'<div><label>Palet — '+esc(teamName(m.b))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="11" step="1" value="'+(b==null?'':b)+'" data-palet="b"/></div>'
        +'<div class="help">'+note+'</div><div></div></div>';
    }

    function findMatch(idv){ return state.matches.find(x=>x.id===idv); }
    function clearMatch(idv){ var m=findMatch(idv); if(!m||!canEditMatch(m)) return; if(!confirm("Effacer tous les scores de ce match ?")) return; m.darts=[null,null,null]; m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; m.palet={a:null,b:null}; saveState(); renderMatches(); }

    // ---------- Classement
    function computeLeaderboard(){
      var stats={}; state.teams.forEach(t=>{ stats[t.id]={teamId:t.id,name:t.name,avatar:t.avatar||null,points:0,dartsW:0,pingW:0,palFor:0,palAg:0,matchesComplete:0}; });
      state.matches.forEach(m=>{
        var A=stats[m.a], B=stats[m.b];
        (Array.isArray(m.darts)?m.darts:[]).forEach(v=>{ if(v===0){A.dartsW++;A.points+=5;} else if(v===1){B.dartsW++;B.points+=5;} });
        getPingPts(m).forEach(s=>{ if(isPingValid(s.a,s.b)){ if(s.a>s.b){A.pingW++;A.points+=5;} else if(s.b>s.a){B.pingW++;B.points+=5;} } });
        var pa=m.palet.a, pb=m.palet.b; if(pa!=null&&pb!=null){ A.palFor+=pa; B.palFor+=pb; A.palAg+=pb; B.palAg+=pa; A.points+=pa; B.points+=pb; }
        if(isMatchComplete(m)){ A.matchesComplete++; B.matchesComplete++; }
      });
      var rows=Object.values(stats);
      rows.sort((x,y)=> (y.points-x.points) || ((y.palFor-y.palAg)-(x.palFor-x.palAg)) || ((y.dartsW+y.pingW)-(x.dartsW+x.pingW)) || x.name.localeCompare(y.name) );
      rows.forEach((r,i)=>r.rank=i+1); return rows;
    }
    function renderLeaderboard(){
      var tbody=qs("#table-classement tbody"); if(!tbody) return; tbody.innerHTML="";
      computeLeaderboard().forEach(r=>{
        var diff=r.palFor-r.palAg; var tr=document.createElement("tr");
        tr.innerHTML='<td>'+r.rank+'</td>'
          +'<td><span class="team-name">'+(r.avatar?('<span class="avatar avatar-lg">'+('<img src="'+esc(r.avatar)+'" alt="avatar">')+'</span>'):( '<span class="avatar avatar-lg"><span class="avatar-initials">'+esc(initials(r.name))+'</span></span>' ))+' '+esc(r.name)+'</span></td>'
          +'<td><b>'+r.points+'</b></td><td>'+r.dartsW+'</td><td>'+r.pingW+'</td>'
          +'<td>'+r.palFor+'–'+r.palAg+' <span class="muted">('+(diff>=0?'+':'')+diff+')</span></td>'
          +'<td>'+r.matchesComplete+'</td>';
        tbody.appendChild(tr);
      });
    }

    // ---------- H2H
    function pointsForTeamInMatch(m,teamId){
      var isA=m.a===teamId, isB=m.b===teamId; if(!isA&&!isB) return 0;
      var pts=0; (Array.isArray(m.darts)?m.darts:[]).forEach(v=>{ if(v===0&&isA) pts+=5; else if(v===1&&isB) pts+=5; });
      getPingPts(m).forEach(s=>{ if(isPingValid(s.a,s.b)){ if(s.a>s.b&&isA) pts+=5; else if(s.b>s.a&&isB) pts+=5; } });
      if(m.palet && m.palet.a!=null && m.palet.b!=null) pts += isA? m.palet.a : m.palet.b;
      return pts;
    }
    function renderH2H(){
      var thead=qs("#table-h2h thead"), tbody=qs("#table-h2h tbody"); if(!thead||!tbody) return;
      thead.innerHTML=""; tbody.innerHTML="";
      var teams=state.teams.slice(); if(!teams.length){ tbody.appendChild(help("Ajoutez des équipes pour voir la matrice.")); return; }
      var trH=document.createElement("tr"); trH.appendChild(document.createElement("th")).textContent="Équipe";
      teams.forEach(t=>{ var th=document.createElement("th"); th.innerHTML='<span class="team-name">'+avatarHtml(t.id,'sm')+esc(t.name)+'</span>'; trH.appendChild(th); });
      thead.appendChild(trH);
      var byPair={}; state.matches.forEach(m=>{ byPair[[m.a,m.b].sort().join("|")]=m; });
      teams.forEach(ti=>{
        var tr=document.createElement("tr"); var th=document.createElement("th"); th.innerHTML='<span class="team-name">'+avatarHtml(ti.id,'sm')+esc(ti.name)+'</span>'; tr.appendChild(th);
        teams.forEach(tj=>{
          var td=document.createElement("td");
          if(ti.id===tj.id){ td.textContent="—"; tr.appendChild(td); return; }
          var m=byPair[[ti.id,tj.id].sort().join("|")];
          if(!m){ td.innerHTML='<span class="h2h-badge h2h-pend">—</span>'; tr.appendChild(td); return; }
          var pI=pointsForTeamInMatch(m,ti.id), pJ=pointsForTeamInMatch(m,tj.id);
          if(pI===0 && pJ===0){ td.innerHTML='<span class="h2h-badge h2h-pend">•</span>'; }
          else{
            var cls=(pI>pJ)?'h2h-win':(pI<pJ)?'h2h-loss':'h2h-pend';
            var tag=(pI>pJ)?'W':(pI<pJ)?'L':'=';
            td.innerHTML='<span class="h2h-badge '+cls+'">'+tag+' '+pI+'–'+pJ+'</span>';
          }
          td.className="h2h-clickable"; td.dataset.matchId=m.id; tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      tbody.addEventListener("click", function(e){
        var node=e.target; while(node && node!==tbody && !(node.tagName==="TD" && node.dataset.matchId)) node=node.parentNode;
        if(!node||node===tbody) return; goToMatch(node.dataset.matchId);
      });
    }
    function goToMatch(mid){ var tab=qs('.tab[data-tab="calendrier"]'); tab&&tab.click&&tab.click(); ui.open[mid]=true; setTimeout(()=>{ var card=qs('.match-card[data-id="'+mid+'"]'); if(card){ card.setAttribute("aria-expanded","true"); try{ card.scrollIntoView({behavior:"smooth",block:"start"}); }catch(_){ card.scrollIntoView(); } } },0); }

    // ---------- Export/Import
    onClick(id("btn-export"), ()=>{ var data=JSON.stringify(state,null,2); var blob=new Blob([data],{type:"application/json"}); var url=URL.createObjectURL(blob); var a=document.createElement("a"); a.href=url; a.download="tournoi-amis-"+new Date().toISOString().slice(0,10)+".json"; a.click(); URL.revokeObjectURL(url); });
    var importFile=null; id("file-import").addEventListener("change", e=>importFile=e.target.files[0]);
    onClick(id("btn-import"), ()=>{ if(!importFile){ alert("Sélectionnez un fichier JSON."); return; } importFile.text().then(text=>{ try{ var data=JSON.parse(text); if(!(data && Array.isArray(data.teams) && Array.isArray(data.matches))) throw new Error("format"); state=data; normalizeState(); saveState(); renderAll(); alert("Import réussi !"); }catch(e){ alert("Fichier invalide."); } }); });

    // ---------- Reset & unlock
    onClick(id("btn-reset"), ()=>{ var pin=prompt("PIN administrateur :"); if(pin!=="30041991"){ alert("PIN incorrect."); return; } if(!confirm("Confirmer la ré-initialisation complète du tournoi ?")) return; state={version:20,teams:[],matches:[],locked:false,createdAt:new Date().toISOString(),protect:{teamPassHash:{}}}; normalizeState(); session={admin:false,claims:{}}; saveSession(); saveState(); renderAll(); });
    onClick(id("btn-unlock"), ()=>{ if(!isAdmin()){ alert("Réservé à l’admin."); return; } if(!confirm("Déverrouiller le calendrier ?")) return; state.locked=false; saveState(); renderTeams(); renderMatches(); updateLockUI(); });

    // ---------- Divers
    function updateLockUI(){ var pill=id("lock-pill"); if(pill) pill.style.display=state.locked?"inline-block":"none"; var gen=id("btn-generate"); if(gen){ gen.disabled=!!state.locked; gen.textContent=state.locked?"Calendrier figé":"Générer le calendrier"; } }
    function onClick(el,fn){ if(el&&el.addEventListener) el.addEventListener("click",fn); }
    function saveState(opts){
      saveLocal();
      renderLeaderboard(); renderH2H();
      if(cloud.enabled && !(opts && opts.cloud===false)) pushCloud(false);
    }

    // ---------- Init
    loadSession(); renderAll(); setCloud(cloud.enabled?"connecté":"hors ligne");
    function renderAll(){ renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); updateCounts(); updateLockUI(); updateWho(); }

    function showH2H(on){ ui.h2h=!!on; var a=id("view-summary"), b=id("view-h2h"), btn=id("btn-toggle-h2h"); if(a&&b){ a.style.display=on?"none":"block"; b.style.display=on?"block":"none"; } if(btn) btn.textContent=on?"Vue classement":"Vue face-à-face"; if(on) renderH2H(); }
    onClick(id("btn-toggle-h2h"), e=>{ e.preventDefault(); showH2H(!ui.h2h); });
    onClick(id("btn-refresh-standings"), renderLeaderboard);
    onClick(id("btn-refresh-standings-2"), renderLeaderboard);
    onClick(id("btn-collapse"), ()=>{ qsa(".match-card").forEach(c=>c.setAttribute("aria-expanded","false")); });

    // maj texte du bouton plein écran au chargement
    updateFSBtn();
  });
})();
