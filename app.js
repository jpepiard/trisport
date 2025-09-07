// JS OK roles2c15 — Hub Tournoi + correctifs compat et boutons
(function () {
  function id(x){ return document.getElementById(x); }
  function qs(s){ return document.querySelector(s); }
  function qsa(s){ return Array.from(document.querySelectorAll(s)); }
  function qsaIn(n,s){ return Array.from(n.querySelectorAll(s)); }
  function addStyle(css){ var st=document.createElement("style"); st.textContent=css; document.head.appendChild(st); }
  function onClick(el,fn){ if(el && el.addEventListener) el.addEventListener("click", fn); }
  function help(t){ var d=document.createElement("div"); d.className="help"; d.textContent=t; return d; }
  function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, function(c){ return {"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]; }); }
  function uid(){ return Math.random().toString(36).slice(2,10); }
  function clampInt(v,min,max){ if(isNaN(v)) return null; return Math.max(min, Math.min(max, v)); }

  // Montrer les erreurs JS à l'écran (si jamais)
  window.onerror = function (msg, src, line, col) {
    var el = id("storage-warning");
    if(el){ el.style.display="block"; el.textContent="Erreur JS : "+msg+" @"+(src||"")+":"+line+":"+col; }
  };
  window.addEventListener("unhandledrejection", function(e){
    var el = id("storage-warning");
    if(el){ el.style.display="block"; el.textContent="Rejet promesse : "+(e.reason && e.reason.message ? e.reason.message : String(e.reason)); }
  });

  document.addEventListener("DOMContentLoaded", function () {
    // Badget JS OK
    var ok = id("js-ok"); if(ok){ ok.style.display="inline-block"; ok.textContent="JS OK roles2c15"; }

    addStyle(".avatar{width:40px;height:40px;font-size:14px}.avatar .avatar-initials{line-height:40px}.avatar-lg{width:48px;height:48px;font-size:15px}.avatar-lg .avatar-initials{line-height:48px}.avatar-sm{width:32px;height:32px;font-size:12px}.avatar-sm .avatar-initials{line-height:32px}");

    // ----- Storage
    var STORAGE_KEY = "tournoi_amis_roles2c6";
    var IDX_KEY     = "trisports_index_v1";
    var SNAP_PREFIX = "trisports_state_";
    var CURR_KEY    = "trisports_current_id";
    var MEMORY_ONLY = false;

    function saveRuntime(){ try{ if(!MEMORY_ONLY) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ MEMORY_ONLY=true; warnStorage(); } }
    function loadRuntime(){ try{ var raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):null; }catch(e){ MEMORY_ONLY=true; return null; } }
    function warnStorage(){ var el=id("storage-warning"); if(el){ el.style.display="block"; el.textContent="⚠️ Stockage local indisponible (navigation privée ?)"; } }

    function getIndex(){ try{ var s=localStorage.getItem(IDX_KEY); return s?JSON.parse(s):[]; }catch(e){ return []; } }
    function setIndex(arr){ try{ localStorage.setItem(IDX_KEY, JSON.stringify(arr||[])); }catch(e){} }
    function upsertIndex(entry){
      var idx=getIndex(); var i=-1; for(var k=0;k<idx.length;k++){ if(idx[k].id===entry.id){ i=k; break; } }
      if(i>=0) idx[i]=Object.assign({}, idx[i], entry); else idx.unshift(entry);
      setIndex(idx);
    }
    function saveSnapshot(){
      if(!state.tid) state.tid=uid();
      try{ localStorage.setItem(SNAP_PREFIX+state.tid, JSON.stringify(state)); }catch(e){}
      upsertIndex({ id:state.tid, name:state.tournamentName||"Sans titre", updatedAt:Date.now(), type: state.cloudId? "cloud":"local" });
      try{ localStorage.setItem(CURR_KEY, state.tid); }catch(e){}
    }
    function loadSnapshot(tid){
      try{
        var raw=localStorage.getItem(SNAP_PREFIX+tid);
        if(!raw) return false;
        state = JSON.parse(raw);
        normalize(); saveRuntime();
        try{ localStorage.setItem(CURR_KEY, tid); }catch(e){}
        return true;
      }catch(e){ return false; }
    }

    // ----- État + session
    var state = loadRuntime() || {
      version: 23,
      tid: uid(),
      cloudId: null,
      tournamentName: "",
      teams: [],
      matches: [],
      locked: false,
      createdAt: new Date().toISOString(),
      protect: { teamPassHash:{} }
    };
    normalize();

    var ui = { open:{}, h2h:false };
    var session = { admin:false, claims:{} };

    // ----- Firebase
    var cloud = { enabled:false, db:null, id:null, ref:null, lastRemoteAt:0, pushTimer:null };
    var hasFB = !!(window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
    function initFB(){
      if(!hasFB) return null;
      try{
        var apps = firebase.apps || [];
        if(!apps.length) firebase.initializeApp(window.FIREBASE_CONFIG);
        return firebase.database();
      }catch(e){ console.warn("Firebase init error",e); return null; }
    }
    function setCloud(txt){ var el=id("cloud-status"); if(el) el.textContent=txt; }
    function pushCloud(immediate){
      if(!cloud.enabled||!cloud.ref) return;
      function doPush(){ cloud.ref.set({ state:state, updatedAt:Date.now() }); }
      try{ clearTimeout(cloud.pushTimer); }catch(e){}
      cloud.pushTimer = setTimeout(doPush, immediate?0:250);
    }
    function joinCloud(code){
      if(!hasFB){ alert("Firebase non configuré."); return; }
      if(!cloud.db){ cloud.db=initFB(); if(!cloud.db){ alert("Initialisation Firebase impossible."); return; } }
      cloud.id = (code||"").trim();
      if(!cloud.id){ alert("Saisis un code tournoi."); return; }
      cloud.ref = cloud.db.ref("tournaments/"+cloud.id+"/payload");
      cloud.enabled = true; cloud.lastRemoteAt = 0; setCloud("connexion…");
      loadSession();

      var first = true;
      cloud.ref.on("value", function(snap){
        var val = snap.val();
        if(first){
          first=false;
          if(!val){
            state.cloudId = cloud.id;
            pushCloud(true);
            setCloud("connecté (créé)");
            upsertIndex({ id:"cloud:"+cloud.id, name:"Cloud · "+cloud.id, updatedAt:Date.now(), type:"cloud" });
            renderSetupRecent();
            return;
          }
        }
        if(!val) return;
        var remoteAt = +val.updatedAt || 0;
        if(remoteAt <= cloud.lastRemoteAt) return;
        cloud.lastRemoteAt = remoteAt;
        state = val.state || state;
        state.cloudId = cloud.id;
        normalize();
        saveRuntime(); saveSnapshot();
        renderAll();
        setCloud("connecté ("+cloud.id+")");
      });

      try{
        var p=new URLSearchParams(location.search);
        p.set("v","roles2c15"); p.set("id", cloud.id);
        history.replaceState(null,"", location.pathname+"?"+p.toString());
      }catch(e){}
    }

    // auto-join si ?id=
    (function(){
      try{
        var p=new URLSearchParams(location.search);
        var idp=p.get("id");
        if(idp){ var el=id("join-code"); if(el) el.value=idp; joinCloud(idp); }
      }catch(e){}
    })();

    // ----- Utils bonus
    function initials(name){ var s=(name||"").trim(); if(!s) return "?"; var p=s.split(/\s+/); return (p[0][0]+(p[1]?p[1][0]:"")).toUpperCase(); }
    function teamObj(tid){ for(var i=0;i<state.teams.length;i++){ if(state.teams[i].id===tid) return state.teams[i]; } return null; }
    function teamName(tid){ var t=teamObj(tid); return t?t.name:"—"; }
    function avatarHtml(tid,size){
      var t=teamObj(tid)||{name:"?"}, url=t.avatar;
      var cls=size==='lg'?'avatar-lg':(size==='sm'?'avatar-sm':'');
      var content = url ? '<img src="'+esc(url)+'" alt="avatar">' : '<span class="avatar-initials">'+esc(initials(t.name))+'</span>';
      return '<span class="avatar '+cls+'" title="'+esc(t.name)+'">'+content+'</span>';
    }

    // ----- Normalisation
    function _arr(x){ return Array.isArray(x)?x:[]; }
    function _normMatch(m){
      m=m||{};
      m.id=m.id||uid(); m.a=m.a||""; m.b=m.b||"";
      m.darts=Array.isArray(m.darts)?m.darts.slice(0,3):[null,null,null]; while(m.darts.length<3) m.darts.push(null);
      if(!Array.isArray(m.pingPts)) m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}];
      for(var i=0;i<3;i++){ m.pingPts[i]=m.pingPts[i]||{a:null,b:null}; m.pingPts[i].a=(m.pingPts[i].a==null?null:+m.pingPts[i].a); m.pingPts[i].b=(m.pingPts[i].b==null?null:+m.pingPts[i].b); }
      m.palet=m.palet||{a:null,b:null}; m.palet.a=(m.palet.a==null?null:+m.palet.a); m.palet.b=(m.palet.b==null?null:+m.palet.b);
      m.round=m.round||1; m.order=m.order||0;
      return m;
    }
    function normalize(){
      if(!state) state={};
      if(!state.protect) state.protect={teamPassHash:{}};
      state.teams=_arr(state.teams);
      state.matches=_arr(state.matches).map(_normMatch);
      renderTitle();
    }

    // ----- Rôles / identité
    function isAdmin(){ return !!session.admin; }
    function hasClaim(tid){ return !!(session.claims && session.claims[tid]); }
    function canEditTeam(){ return isAdmin(); }
    function canEditAvatar(tid){ return isAdmin() || hasClaim(tid); }
    function canEditMatch(m){ return isAdmin() || hasClaim(m.a) || hasClaim(m.b); }
    function identityText(){
      var names=[]; if(session.claims){ for(var k in session.claims){ if(session.claims[k]) names.push(teamName(k)); } }
      if(isAdmin()) return names.length?("Admin · "+names.join(", ")):"Admin";
      return names.length?names.join(", "):"visiteur";
    }
    function updateWho(){
      var who=id("whoami"); if(who) who.textContent="vous : "+identityText();
      var whoTop=id("whoami-top"); if(whoTop) whoTop.textContent=identityText();
      var addBtn=id("btn-add-team"); if(addBtn) addBtn.style.display=isAdmin()?"inline-block":"none";
    }
    function renderTitle(){
      var name = state.tournamentName && state.tournamentName.trim();
      document.title = (name?name+" — ":"") + "TriSports — Fléchettes • Ping-pong • Palet";
      var pill=id("tname-top");
      if(pill){ if(name){ pill.style.display="inline-block"; pill.textContent=name; } else { pill.style.display="none"; pill.textContent=""; } }
    }

    // ----- Plein écran
    function fsElement(){ return document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement; }
    function enterFS(el){ if(el.requestFullscreen) return el.requestFullscreen(); if(el.webkitRequestFullscreen) return el.webkitRequestFullscreen(); if(el.mozRequestFullScreen) return el.mozRequestFullScreen(); if(el.msRequestFullscreen) return el.msRequestFullscreen(); }
    function exitFS(){ if(document.exitFullscreen) return document.exitFullscreen(); if(document.webkitExitFullscreen) return document.webkitExitFullscreen(); if(document.mozCancelFullScreen) return document.mozCancelFullScreen(); if(document.msExitFullscreen) return document.msExitFullscreen(); }
    function fsSupported(){ var el=document.documentElement; return !!(el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen); }
    function updateFSBtn(){ var b=id("btn-fullscreen"); if(!b) return; b.style.display=fsSupported()?"inline-block":"none"; b.textContent=fsElement()?"Quitter plein écran":"⛶ Plein écran"; b.title=fsElement()?"Quitter le plein écran (Esc)":"Plein écran (Esc pour quitter)"; }
    onClick(id("btn-fullscreen"), function(){ if(fsElement()) exitFS(); else enterFS(document.documentElement); });
    document.addEventListener("fullscreenchange", updateFSBtn);
    document.addEventListener("webkitfullscreenchange", updateFSBtn);
    document.addEventListener("mozfullscreenchange", updateFSBtn);
    document.addEventListener("MSFullscreenChange", updateFSBtn);
    updateFSBtn();

    // ----- Tabs
    qsa(".tab").forEach(function(btn){
      btn.addEventListener("click", function(){
        qsa(".tab").forEach(function(b){ b.setAttribute("aria-selected","false"); });
        btn.setAttribute("aria-selected","true");
        qsa("main section").forEach(function(s){ s.classList.remove("active"); });
        var target = id(btn.getAttribute("data-tab")); if(target) target.classList.add("active");
      });
    });
    function goto(tabId){ var b=qs('.tab[data-tab="'+tabId+'"]'); if(b && b.click) b.click(); }

    // ----- Admin
    function ensureAdmin(){ if(isAdmin()) return true; var pin=prompt("PIN administrateur :"); if(pin==="30041991"){ session.admin=true; saveSession(); return true; } return false; }
    onClick(id("btn-admin-on"), function(){ var pin=prompt("PIN administrateur :"); if(pin==="30041991"){ session.admin=true; saveSession(); renderAll(); alert("Mode administrateur activé."); } else alert("PIN incorrect."); });
    onClick(id("btn-admin-off"), function(){ session.admin=false; saveSession(); renderAll(); });

    // ----- HUB Tournoi
    onClick(id("btn-create-tournament"), function(){
      if(!ensureAdmin()) return;
      var name = (id("tname-input").value||"").trim() || "Tournoi entre amis";
      var n = parseInt(id("teams-count-input").value,10); if(isNaN(n)) n=4; n=clampInt(n,2,64);
      if(state.teams.length || state.matches.length){
        if(!confirm("Cette action va EFFACER le tournoi actuel et en créer un nouveau. Continuer ?")) return;
      }
      state = {
        version: 23,
        tid: uid(),
        cloudId: null,
        tournamentName: name,
        teams: (function(){ var arr=[]; for(var i=0;i<n;i++) arr.push({ id:uid(), name:"Équipe "+(i+1), p1:"", p2:"", avatar:null }); return arr; })(),
        matches: [],
        locked:false,
        createdAt:new Date().toISOString(),
        protect:{ teamPassHash:{} }
      };
      normalize(); saveState(); saveSnapshot();
      renderAll(); goto("equipes");
    });

    function renderSetupRecent(){
      var wrap=id("recent-list"); if(!wrap) return;
      wrap.innerHTML="";
      var idx=getIndex().sort(function(a,b){ return (b.updatedAt||0)-(a.updatedAt||0); });
      if(!idx.length){ wrap.appendChild(help("Aucun tournoi mémorisé pour l’instant.")); return; }
      var box=document.createElement("div"); box.style.display="flex"; box.style.flexWrap="wrap"; box.style.gap="8px";
      idx.forEach(function(e){
        var b=document.createElement("button"); b.className="btn"; b.type="button";
        b.textContent = (e.type==="cloud"?"☁ ":"")+e.name;
        b.addEventListener("click", function(){
          if(e.type==="cloud" && e.id.indexOf("cloud:")===0){
            var code=e.id.slice(6); var inp=id("join-code"); if(inp) inp.value=code; joinCloud(code); goto("equipes"); return;
          }
          var ok=loadSnapshot(e.id);
          if(!ok){ alert("Impossible d’ouvrir ce tournoi (données manquantes)."); return; }
          session.claims={}; saveSession(); renderAll(); goto("equipes");
        });
        box.appendChild(b);
      });
      wrap.appendChild(box);
    }

    onClick(id("btn-join-code"), function(){
      var code=(id("join-code").value||"").trim(); if(!code){ alert("Renseigne un code."); return; }
      joinCloud(code); goto("equipes");
    });
    onClick(id("btn-copy-link"), function(){
      var code=(id("join-code").value||"").trim(); if(!code){ alert("Renseigne un code."); return; }
      var url=location.origin+location.pathname+"?v=roles2c15&id="+encodeURIComponent(code);
      try{ if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url); }catch(e){}
      alert("Lien copié !\n"+url);
    });

    // ----- Teams
    var teamListEl=id("team-list");
    onClick(id("btn-add-team"), function(){
      if(!isAdmin()){ alert("Réservé à l’admin."); return; }
      if(state.locked){ alert("Calendrier figé."); return; }
      state.teams.push({ id:uid(), name:"Équipe "+(state.teams.length+1), p1:"", p2:"", avatar:null });
      saveState(); renderTeams(); updateCounts(); updateLockUI();
    });

    onClick(id("btn-generate"), function(){
      if(!isAdmin()){ alert("Seul l’admin peut générer."); return; }
      if(state.locked) return;
      generateSchedule(); state.locked=true; saveState(); renderAll(); goto("calendrier");
    });

    function renderTeams(){
      teamListEl.innerHTML="";
      if(!Array.isArray(state.teams) || state.teams.length===0){
        teamListEl.appendChild(help("Aucune équipe. Utilisez « Tournoi » > Nouveau tournoi."));
        updateCounts(); updateLockUI(); return;
      }
      state.teams.forEach(function(t,idx){
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
          +'<div class="hd" style="border:none;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'
          +'<div class="teams" style="width:100%"><span class="chip">#'+(idx+1)+'</span> '
          +'<span class="team-name">'+avatarHtml(t.id,'lg')+'<input type="text"'+dis+' value="'+esc(t.name)+'" data-field="name" data-id="'+t.id+'" style="min-width:0;flex:1"/></span></div>'
          +'<div>'+delBtn+'</div></div>'
          +'<div class="bd">'
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

      // édition live
      qsa('#team-list input[data-field]').forEach(function(inp){
        var tid=inp.getAttribute("data-id"), f=inp.getAttribute("data-field");
        inp.addEventListener("input", function(){
          if(!canEditTeam(tid)) return;
          var t=teamObj(tid); if(!t) return;
          t[f]=inp.value; saveState({cloud:false});
        });
        inp.addEventListener("blur", function(){
          if(!
