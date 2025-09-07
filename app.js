// JS OK roles2c14 — Page "Tournoi" refaite : nouveau, liste, rejoindre (cloud déplacé ici)
(function(){
  window.onerror = function (msg, src, line, col) {
    var el = document.getElementById("storage-warning");
    if (!el) return;
    el.style.display = "block";
    el.textContent = "Erreur JS : " + msg + " @" + (src || "") + ":" + (line || 0) + ":" + (col || 0);
  };

  document.addEventListener("DOMContentLoaded", function(){
    // ---------- Styles avatars
    const st=document.createElement("style");
    st.textContent=`
      .avatar{width:40px;height:40px;font-size:14px}
      .avatar .avatar-initials{line-height:40px}
      .avatar-lg{width:48px;height:48px;font-size:15px}
      .avatar-lg .avatar-initials{line-height:48px}
      .avatar-sm{width:32px;height:32px;font-size:12px}
      .avatar-sm .avatar-initials{line-height:32px}
    `;
    document.head.appendChild(st);

    // ---------- Storage keys
    const STORAGE_KEY_CURRENT = "tournoi_amis_roles2c6"; // compat: état courant (pour continuer à fonctionner)
    const LIB_KEY = "trisports_library_v1";              // bibliothèque de tournois (liste)
    const LIB_STATE_PREFIX = "trisports_state_";         // snapshot par tournoi

    let MEMORY_ONLY=false;

    // ---------- State & session
    let state = loadLocal() || {
      version: 22,
      tournamentId: null,
      tournamentName: "",
      teams: [],
      matches: [],
      locked: false,
      createdAt: new Date().toISOString(),
      protect: { teamPassHash:{} }
    };
    normalize();
    let ui = { open:{}, h2h:false };
    let session = { admin:false, claims:{} };

    function sessionKey(){ 
      const key = (cloud.id || state.tournamentId || "local");
      return "tournoi_session_"+key;
    }
    function loadSession(){ try{ const raw=localStorage.getItem(sessionKey()); if(raw){ const s=JSON.parse(raw); if(s) session=s; } }catch{} updateWho(); }
    function saveSession(){ try{ localStorage.setItem(sessionKey(), JSON.stringify(session)); }catch{} updateWho(); }

    // ---------- Firebase (compat)
    const cloud = { enabled:false, db:null, id:null, ref:null, lastRemoteAt:0, pushTimer:null };
    const hasFB = !!(window.firebase && window.FIREBASE_CONFIG && window.FIREBASE_CONFIG.apiKey);
    function initFB(){ if(!hasFB) return null; try{ const apps=firebase.apps; if(!apps || apps.length===0) firebase.initializeApp(window.FIREBASE_CONFIG); return firebase.database(); }catch(e){ console.warn("Firebase init error",e); return null; } }
    function setCloud(txt){ const el=id("cloud-status"); if(el) el.textContent=txt; }

    function joinCloud(code){
      if(!hasFB){ alert("Firebase non configuré."); return; }
      if(!cloud.db){ cloud.db=initFB(); if(!cloud.db){ alert("Initialisation Firebase impossible."); return; } }
      cloud.id=(code||"").trim(); if(!cloud.id){ alert("Saisis un code tournoi."); return; }
      cloud.ref = cloud.db.ref("tournaments/"+cloud.id+"/payload");
      cloud.enabled=true; cloud.lastRemoteAt=0; setCloud("connexion…"); loadSession();

      let first=true;
      cloud.ref.on("value", snap=>{
        const val=snap.val();
        if(first){
          first=false;
          if(!val){
            // crée un tournoi vide côté cloud avec l'état courant
            pushCloud(true);
            setCloud("connecté (créé)");
            // ajoute à la bibliothèque comme "remote"
            libraryUpsert({ id:"remote:"+cloud.id, name: state.tournamentName || cloud.id, isRemote:true, code: cloud.id });
            renderLibrary();
            return;
          }
        }
        if(!val) return;
        const remoteAt=+val.updatedAt||0;
        if(remoteAt<=cloud.lastRemoteAt) return;
        cloud.lastRemoteAt=remoteAt;
        state = val.state || state;
        normalize();
        // associe un id stable
        if(!state.tournamentId) state.tournamentId = "remote:"+cloud.id;
        saveLocal();
        librarySaveCurrent(); // mémorise le snapshot local
        renderAll();
        setCloud("connecté ("+cloud.id+")");
      });

      try{ history.replaceState(null,"", location.pathname+"?v=roles2c14&id="+encodeURIComponent(cloud.id)); }catch{}
    }
    function leaveCloud(){ if(cloud.ref) cloud.ref.off(); cloud.enabled=false; cloud.id=null; cloud.ref=null; setCloud("hors ligne"); loadSession(); }
    function pushCloud(immediate){
      if(!cloud.enabled||!cloud.ref) return;
      const doIt=()=>cloud.ref.set({ state:state, updatedAt:Date.now() });
      clearTimeout(cloud.pushTimer);
      cloud.pushTimer=setTimeout(doIt, immediate?0:250);
    }

    // ---------- Utils
    function id(x){ return document.getElementById(x); }
    function qs(s){ return document.querySelector(s); }
    function qsa(s){ return Array.from(document.querySelectorAll(s)); }
    function qsaIn(n,s){ return Array.from(n.querySelectorAll(s)); }
    function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
    function uid(){ return Math.random().toString(36).slice(2,10); }
    function clampInt(v,min,max){ if(isNaN(v)) return null; return Math.max(min, Math.min(max, v)); }
    function help(t){ const d=document.createElement("div"); d.className="help"; d.textContent=t; return d; }
    async function sha256(str){ try{ if(crypto?.subtle){ const enc=new TextEncoder().encode(str); const buf=await crypto.subtle.digest("SHA-256",enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""); } }catch{} let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h*16777619)>>>0; } return ("00000000"+h.toString(16)).slice(-8).repeat(8); }
    function salt(){ return cloud.id || (state.tournamentId||"local"); }

    // ---------- Local storage helpers
    function saveLocal(){
      try{
        if(!MEMORY_ONLY) localStorage.setItem(STORAGE_KEY_CURRENT, JSON.stringify(state));
      }catch(e){ MEMORY_ONLY=true; warnStorage(); }
    }
    function loadLocal(){
      try{
        const raw = localStorage.getItem(STORAGE_KEY_CURRENT);
        return raw ? JSON.parse(raw) : null;
      }catch(e){ MEMORY_ONLY=true; return null; }
    }
    function warnStorage(){
      const el=id("storage-warning");
      if(el){ el.style.display="block"; el.textContent="⚠️ Stockage local indisponible (navigation privée ?)"; }
    }

    // ---------- Library (multi-tournois)
    function libraryLoad(){
      try{
        const raw = localStorage.getItem(LIB_KEY);
        const data = raw ? JSON.parse(raw) : { items:[] };
        data.items = Array.isArray(data.items) ? data.items : [];
        return data;
      }catch(e){ return { items:[] }; }
    }
    function librarySave(lib){
      try{ localStorage.setItem(LIB_KEY, JSON.stringify(lib)); }catch(e){}
    }
    function libraryStateKey(id){ return LIB_STATE_PREFIX + id; }
    function librarySaveState(id, obj){
      try{ localStorage.setItem(libraryStateKey(id), JSON.stringify(obj)); }catch(e){}
    }
    function libraryLoadState(id){
      try{ const raw = localStorage.getItem(libraryStateKey(id)); return raw?JSON.parse(raw):null; }catch(e){ return null; }
    }
    function libraryUpsert(meta){
      const lib = libraryLoad();
      const idx = lib.items.findIndex(x=>x.id===meta.id);
      const now = Date.now();
      const item = Object.assign({ id:uid(), name:"Sans nom", updatedAt:now, isRemote:false }, meta, { updatedAt: now });
      if(idx>=0) lib.items[idx]=item; else lib.items.unshift(item);
      librarySave(lib);
      return item;
    }
    function libraryRemove(id){
      const lib = libraryLoad();
      lib.items = lib.items.filter(x=>x.id!==id);
      librarySave(lib);
      try{ localStorage.removeItem(libraryStateKey(id)); }catch{}
    }
    function librarySaveCurrent(){
      // crée un id si absent
      if(!state.tournamentId){
        state.tournamentId = "local:"+uid();
      }
      const name = (state.tournamentName||"").trim() || "Sans nom";
      const isRemote = !!cloud.enabled;
      const code = cloud.enabled ? cloud.id : null;
      const idv = isRemote ? ("remote:"+code) : state.tournamentId;

      libraryUpsert({ id:idv, name:name, isRemote:isRemote, code:code });
      librarySaveState(idv, state);
    }

    // ---------- Normalisation
    function _arr(x){ return Array.isArray(x)?x:[]; }
    function _normMatch(m){
      m=m||{};
      m.id=m.id||uid(); m.a=m.a||""; m.b=m.b||"";
      m.darts=Array.isArray(m.darts)?m.darts.slice(0,3):[null,null,null]; while(m.darts.length<3) m.darts.push(null);
      if(!Array.isArray(m.pingPts)) m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}];
      for(let i=0;i<3;i++){ m.pingPts[i]=m.pingPts[i]||{a:null,b:null}; m.pingPts[i].a=(m.pingPts[i].a==null?null:+m.pingPts[i].a); m.pingPts[i].b=(m.pingPts[i].b==null?null:+m.pingPts[i].b); }
      m.palet=m.palet||{a:null,b:null}; m.palet.a=(m.palet.a==null?null:+m.palet.a); m.palet.b=(m.palet.b==null?null:+m.palet.b);
      m.round=m.round||1; m.order=m.order||0; return m;
    }
    function normalize(){
      if(!state) state={};
      if(!state.protect) state.protect={teamPassHash:{}};
      state.teams=_arr(state.teams);
      state.matches=_arr(state.matches).map(_normMatch);
      renderTitle();
    }

    // ---------- Identité & droits
    function isAdmin(){ return !!session.admin; }
    function hasClaim(tid){ return !!session.claims[tid]; }
    function canEditTeam(){ return isAdmin(); }
    function canEditAvatar(tid){ return isAdmin() || hasClaim(tid); }
    function canEditMatch(m){ return isAdmin() || hasClaim(m.a) || hasClaim(m.b); }
    function teamObj(tid){ return state.teams.find(t=>t.id===tid)||null; }
    function teamName(tid){ const t=teamObj(tid); return t?t.name:"—"; }
    function initials(name){ const s=(name||"").trim(); if(!s) return "?"; const p=s.split(/\s+/); return (p[0][0]+(p[1]?.[0]||"")).toUpperCase(); }
    function avatarHtml(tid,size){ const t=teamObj(tid)||{name:"?"}; const url=t.avatar; const cls=size==='lg'?'avatar-lg':(size==='sm'?'avatar-sm':''); const content=url?('<img src="'+esc(url)+'" alt="avatar">'):'<span class="avatar-initials">'+esc(initials(t.name))+'</span>'; return '<span class="avatar '+cls+'" title="'+esc(t.name)+'">'+content+'</span>'; }

    function identityText(){
      const teams = Object.keys(session.claims||{}).map(teamName).filter(Boolean);
      if (isAdmin()) return teams.length ? `Admin · ${teams.join(", ")}` : "Admin";
      if (teams.length) return teams.join(", ");
      return "visiteur";
    }
    function updateWho(){
      const who=id("whoami"); if(who) who.textContent="vous : "+identityText();
      const whoTop=id("whoami-top"); if(whoTop) whoTop.textContent=identityText();
      const addBtn=id("btn-add-team"); if(addBtn) addBtn.style.display=isAdmin()?"inline-block":"none";
    }
    function renderTitle(){
      const name = state.tournamentName && state.tournamentName.trim();
      document.title = (name?name+" — ":"") + "TriSports — Fléchettes • Ping-pong • Palet";
      const pill=id("tname-top");
      if(pill){ if(name){ pill.style.display="inline-block"; pill.textContent=name; } else { pill.style.display="none"; pill.textContent=""; } }
    }

    // ---------- Fullscreen
    function fsElement(){ return document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement; }
    function enterFS(el){ return el.requestFullscreen?.()||el.webkitRequestFullscreen?.()||el.mozRequestFullScreen?.()||el.msRequestFullscreen?.(); }
    function exitFS(){ return document.exitFullscreen?.()||document.webkitExitFullscreen?.()||document.mozCancelFullScreen?.()||document.msExitFullscreen?.(); }
    function fsSupported(){ const el=document.documentElement; return !!(el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen); }
    function updateFSBtn(){ const b=id("btn-fullscreen"); if(!b) return; b.style.display=fsSupported()?"inline-block":"none"; b.textContent=fsElement()?"Quitter plein écran":"⛶ Plein écran"; b.title=fsElement()?"Quitter le plein écran (Esc)":"Plein écran (Esc pour quitter)"; }
    onClick(id("btn-fullscreen"), ()=>{ fsElement()?exitFS():enterFS(document.documentElement); });
    ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"].forEach(e=>document.addEventListener(e,updateFSBtn));
    updateFSBtn();

    // ---------- Onglets
    qsa(".tab").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        qsa(".tab").forEach(b=>b.setAttribute("aria-selected","false"));
        btn.setAttribute("aria-selected","true");
        qsa("main section").forEach(s=>s.classList.remove("active"));
        id(btn.getAttribute("data-tab")).classList.add("active");
      });
    });
    function goto(tabId){ const b=qs('.tab[data-tab="'+tabId+'"]'); if(!b) return; b.click(); }

    // ---------- Page Tournoi
    // A) toggle formulaire "Nouveau tournoi"
    onClick(id("btn-new-toggle"), ()=>{
      const f=id("new-form");
      if(!f) return;
      f.style.display = (f.style.display==="none"||!f.style.display) ? "grid" : "none";
    });

    function ensureAdmin(){ if(isAdmin()) return true; const pin=prompt("PIN administrateur :"); if(pin==="30041991"){ session.admin=true; saveSession(); return true; } return false; }
    onClick(id("btn-create-tournament"), ()=>{
      if(!ensureAdmin()) return;
      const name = (id("tname-input").value||"").trim() || "Tournoi entre amis";
      let n = parseInt(id("teams-count-input").value,10); if(isNaN(n)) n=4; n=clampInt(n,2,64);

      if(state.teams.length || state.matches.length){
        if(!confirm("Cette action va EFFACER le tournoi actuel et en créer un nouveau. Continuer ?")) return;
      }
      leaveCloud(); // on est en local
      state={
        version:22,
        tournamentId: "local:"+uid(),
        tournamentName: name,
        teams: Array.from({length:n}, (_,i)=>({ id:uid(), name:"Équipe "+(i+1), p1:"", p2:"", avatar:null })),
        matches: [],
        locked: false,
        createdAt: new Date().toISOString(),
        protect: { teamPassHash:{} }
      };
      normalize();
      saveState();
      librarySaveCurrent(); // enregistre dans la bibliothèque
      renderLibrary();      // rafraîchit la liste
      goto("equipes");
    });

    // B) Liste bibliothèque
    function renderLibrary(){
      const wrap = id("lib-list"), empty=id("lib-empty");
      if(!wrap) return;
      wrap.innerHTML="";
      const lib = libraryLoad();
      if(!lib.items.length){
        empty && (empty.style.display="block");
        return;
      }
      empty && (empty.style.display="none");
      lib.items.forEach(item=>{
        const btn=document.createElement("button");
        btn.type="button";
        btn.className="btn";
        btn.style.display="flex";
        btn.style.justifyContent="space-between";
        btn.style.alignItems="center";
        btn.style.gap="8px";
        btn.innerHTML = '<span>'+esc(item.name)+(item.isRemote?' <span class="chip" title="tournoi live">live</span>':'')+'</span>'
                      + '<span class="muted" style="font-size:12px">'+new Date(item.updatedAt||Date.now()).toLocaleString()+'</span>';
        btn.addEventListener("click", ()=>{
          if(item.isRemote){
            // ouvre le live
            id("cloud-id").value = item.code || "";
            joinCloud(item.code||"");
            goto("equipes");
          }else{
            leaveCloud();
            const snap = libraryLoadState(item.id);
            if(!snap){ alert("Impossible d’ouvrir ce tournoi (aucune sauvegarde trouvée)."); return; }
            state = snap; normalize(); saveLocal(); saveSession(); renderAll(); goto("equipes");
          }
        });
        wrap.appendChild(btn);
      });
    }

    // C) Rejoindre un code live (déplacé ici)
    onClick(id("btn-cloud-join"), ()=>joinCloud(id("cloud-id").value.trim()));
    onClick(id("btn-cloud-leave"), ()=>leaveCloud());
    onClick(id("btn-cloud-copy"), ()=>{
      const code=id("cloud-id").value.trim(); if(!code){ alert("Renseigne d’abord le code tournoi."); return; }
      const url=location.origin+location.pathname+"?v=roles2c14&id="+encodeURIComponent(code);
      navigator.clipboard?.writeText(url);
      alert("Lien copié !\n"+url);
    });

    // ---------- Admin ON/OFF (Options)
    onClick(id("btn-admin-on"), ()=>{
      const pin=prompt("PIN administrateur :");
      if(pin==="30041991"){ session.admin=true; saveSession(); renderAll(); alert("Mode administrateur activé."); }
      else{ alert("PIN incorrect."); }
    });
    onClick(id("btn-admin-off"), ()=>{ session.admin=false; saveSession(); renderAll(); });

    // ---------- Équipes
    const teamListEl=id("team-list");
    onClick(id("btn-add-team"), ()=>{
      if(!isAdmin()){ alert("Réservé à l’admin."); return; }
      if(state.locked){ alert("Calendrier figé."); return; }
      state.teams.push({ id:uid(), name:"Équipe "+(state.teams.length+1), p1:"", p2:"", avatar:null });
      saveState(); renderTeams(); updateCounts(); updateLockUI();
    });
    onClick(id("btn-generate"), ()=>{
      if(!isAdmin()){ alert("Seul l’admin peut générer."); return; }
      if(state.locked) return;
      generateSchedule(); state.locked=true; saveState(); renderAll(); goto("calendrier");
    });

    function renderTeams(){
      teamListEl.innerHTML="";
      if(!Array.isArray(state.teams) || state.teams.length===0){
        teamListEl.appendChild(help("Aucune équipe. Créez ou rejoignez un tournoi depuis l’onglet « Tournoi »."));
        updateCounts(); updateLockUI(); return;
      }

      state.teams.forEach((t,idx)=>{
        const iOwn=hasClaim(t.id), admin=isAdmin();
        const hasHash=!!(state.protect?.teamPassHash?.[t.id]);
        const dis = (!canEditTeam(t.id))?' disabled':'';
        const delBtn = (admin && !state.locked)? '<button type="button" class="btn small danger" data-act="del" data-id="'+t.id+'">Supprimer</button>' : '';
        const protectInfo = hasHash ? (iOwn? '🔒 vous êtes connecté à cette équipe' : '🔒 protégée par mot de passe') : '🔓 non protégée — demandez à l’admin de définir un mot de passe';
        const protectBtns = (admin ? '<button type="button" class="btn small" data-act="setpass" data-id="'+t.id+'">Définir / changer mot de passe</button>' : '')
                          + (!iOwn ? '<button type="button" class="btn small" data-act="login" data-id="'+t.id+'">Se connecter à cette équipe</button>'
                                   : '<button type="button" class="btn small" data-act="logout" data-id="'+t.id+'">Se déconnecter</button>');
        const canAvatar = canEditAvatar(t.id);
        const avatarBtn = canAvatar ? '<button type="button" class="btn small" data-act="avatar" data-id="'+t.id+'">Changer avatar</button>' : '';
        const avatarClr = (canAvatar && t.avatar) ? '<button type="button" class="btn small" data-act="avatar-clear" data-id="'+t.id+'">Retirer avatar</button>' : '';

        const card=document.createElement("div"); card.className="match-card";
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
      qsa('#team-list input[data-field]').forEach(inp=>{
        const tid=inp.getAttribute("data-id"), f=inp.getAttribute("data-field");
        inp.addEventListener("input", ()=>{
          if(!canEditTeam(tid)) return;
          const t=teamObj(tid); if(!t) return;
          t[f]=inp.value;
          saveState({cloud:false});
        });
        inp.addEventListener("blur", ()=>{
          if(!canEditTeam(tid)) return;
          const t=teamObj(tid); if(!t) return;
          t[f]=inp.value; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H();
        });
      });

      // actions
      qsa('#team-list [data-act="del"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{
          if(!isAdmin()||state.locked) return;
          const tid=btn.getAttribute("data-id");
          if(!confirm("Supprimer cette équipe ?")) return;
          state.teams=state.teams.filter(tt=>tt.id!==tid);
          state.matches=state.matches.filter(m=>m.a!==tid&&m.b!==tid);
          if(state.protect?.teamPassHash) delete state.protect.teamPassHash[tid];
          if(session.claims && session.claims[tid]){ delete session.claims[tid]; saveSession(); }
          saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); updateCounts();
        });
      });
      qsa('#team-list [data-act="setpass"]').forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          if(!isAdmin()) { alert("Réservé à l’admin."); return; }
          const tid=btn.getAttribute("data-id");
          const pass=prompt("Mot de passe pour l’équipe « "+teamName(tid)+" » :"); if(!pass) return;
          const hash=await sha256(salt()+"|"+pass);
          state.protect=state.protect||{teamPassHash:{}}; state.protect.teamPassHash[tid]=hash;
          saveState(); renderTeams(); alert("Mot de passe défini.");
        });
      });
      qsa('#team-list [data-act="login"]').forEach(btn=>{
        btn.addEventListener("click", async ()=>{
          const tid=btn.getAttribute("data-id");
          const hasHash=!!(state.protect?.teamPassHash?.[tid]); if(!hasHash){ alert("Cette équipe n’a pas encore de mot de passe."); return; }
          const pass=prompt("Mot de passe de l’équipe « "+teamName(tid)+" » :"); if(!pass) return;
          const ok=(await sha256(salt()+"|"+pass))===state.protect.teamPassHash[tid];
          if(ok){ session.claims[tid]=true; saveSession(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); alert("Connexion réussie."); }
          else alert("Mot de passe incorrect.");
        });
      });
      qsa('#team-list [data-act="logout"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{ const tid=btn.getAttribute("data-id"); delete session.claims[tid]; saveSession(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); });
      });

      // avatar
      qsa('#team-list [data-act="avatar"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const tid=btn.getAttribute("data-id"); if(!canEditAvatar(tid)){ alert("Accès refusé."); return; }
          const input = qs('[data-avatar="'+tid+'"]'); if(input) input.click();
        });
      });
      qsa('#team-list [data-act="avatar-clear"]').forEach(btn=>{
        btn.addEventListener("click", ()=>{
          const tid=btn.getAttribute("data-id"); if(!canEditAvatar(tid)) return;
          const t=teamObj(tid); if(!t) return; t.avatar=null; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H();
        });
      });
      qsa('#team-list input[type="file"][data-avatar]').forEach(inp=>{
        inp.addEventListener("change", async ()=>{
          const tid=inp.getAttribute("data-avatar"); if(!canEditAvatar(tid)) return;
          const file=inp.files?.[0]; if(!file) return;
          try{
            const url = await fileToSquareDataURL(file, 160);
            const t=teamObj(tid); if(!t) return; t.avatar=url; saveState(); renderTeams(); renderMatches(); renderLeaderboard(); renderH2H();
          }catch{ alert("Échec du chargement de l’avatar."); }
          finally{ inp.value=""; }
        });
      });

      updateCounts(); updateLockUI();
    }

    // image -> DataURL carré
    function fileToSquareDataURL(file, size){
      return new Promise((resolve,reject)=>{
        const reader=new FileReader();
        reader.onerror=()=>reject(new Error("read"));
        reader.onload=()=>{
          const img=new Image();
          img.onload=()=>{
            try{
              const min=Math.min(img.width,img.height), sx=(img.width-min)/2, sy=(img.height-min)/2;
              const c=document.createElement("canvas"); c.width=size; c.height=size;
              c.getContext('2d').drawImage(img, sx, sy, min, min, 0, 0, size, size);
              resolve(c.toDataURL('image/jpeg',0.9));
            }catch(e){ reject(e); }
          };
          img.onerror=()=>reject(new Error("img"));
          img.src=reader.result;
        };
        reader.readAsDataURL(file);
      });
    }

    function updateCounts(){ id("teams-count").textContent = state.teams.length + " " + (state.teams.length>1?"équipes":"équipe"); const perTeam=Math.max(0,state.teams.length-1); id("rounds-count").textContent = perTeam + " " + (perTeam>1?"matchs":"match") + " par équipe"; }
    function updateLockUI(){ const pill=id("lock-pill"); if(pill) pill.style.display=state.locked?"inline-block":"none"; const gen=id("btn-generate"); if(gen){ gen.disabled=!!state.locked; gen.textContent=state.locked?"Calendrier figé":"Générer le calendrier"; } }

    // ---------- Calendrier (round-robin homogène)
    function generateSchedule(){
      const ids=state.teams.map(t=>t.id);
      if(ids.length<2){ state.matches=[]; saveState(); renderMatches(); return; }
      const BYE="__BYE__"; if(ids.length%2===1) ids.push(BYE);
      const fixed=ids[0], rest=ids.slice(1);
      for(let i=rest.length-1;i>0;i--){ const j=Math.floor(Math.random()*(i+1)); [rest[i],rest[j]]=[rest[j],rest[i]]; }
      const n=ids.length, rounds=n-1; const out=[]; let order=0;
      for(let r=0;r<rounds;r++){
        const arr=[fixed].concat(rest), half=n/2, pairs=[];
        for(let k=0;k<half;k++){ const a=arr[k], b=arr[n-1-k]; if(a!==BYE&&b!==BYE) pairs.push((r%2===0)?[a,b]:[b,a]); }
        rest.unshift(rest.pop());
        if(pairs.length>1){ let shift=r%pairs.length; while
