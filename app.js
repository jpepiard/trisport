// JS OK roles2c14 — Hub Tournoi (Nouveau / Récents / Rejoindre) + corrections de boutons
(function () {
  // Affiche les erreurs JS (utile si un bouton ne réagit pas)
  window.onerror = function (msg, src, line, col) {
    var el = document.getElementById("storage-warning");
    if (!el) return;
    el.style.display = "block";
    el.textContent = "Erreur JS : " + msg + " @" + (src || "") + ":" + (line || 0) + ":" + (col || 0);
  };

  document.addEventListener("DOMContentLoaded", function () {
    // --- petite feuille pour tailles d’avatar
    addInlineStyle(`
      .avatar{width:40px;height:40px;font-size:14px}
      .avatar .avatar-initials{line-height:40px}
      .avatar-lg{width:48px;height:48px;font-size:15px}
      .avatar-lg .avatar-initials{line-height:48px}
      .avatar-sm{width:32px;height:32px;font-size:12px}
      .avatar-sm .avatar-initials{line-height:32px}
    `);

    // ---------- Local storage (runtime + multi-tournois)
    const STORAGE_KEY = "tournoi_amis_roles2c6";          // état courant (compat)
    const IDX_KEY     = "trisports_index_v1";              // liste de tes tournois locaux
    const SNAP_PREFIX = "trisports_state_";                // snapshot par tournoi
    const CURR_KEY    = "trisports_current_id";            // id courant

    let MEMORY_ONLY = false;
    function saveRuntime(){ try{ if(!MEMORY_ONLY) localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){ MEMORY_ONLY=true; warnStorage(); } }
    function loadRuntime(){ try{ const raw=localStorage.getItem(STORAGE_KEY); return raw?JSON.parse(raw):null; }catch(e){ MEMORY_ONLY=true; return null; } }
    function warnStorage(){ const el=id("storage-warning"); if(el){ el.style.display="block"; el.textContent="⚠️ Stockage local indisponible (navigation privée ?)"; } }

    function getIndex(){ try{ return JSON.parse(localStorage.getItem(IDX_KEY)||"[]"); }catch{ return []; } }
    function setIndex(arr){ try{ localStorage.setItem(IDX_KEY, JSON.stringify(arr||[])); }catch{} }
    function upsertIndex(entry){
      const idx=getIndex(); const i=idx.findIndex(x=>x.id===entry.id);
      if(i>=0) idx[i]=Object.assign({}, idx[i], entry); else idx.unshift(entry);
      setIndex(idx);
    }
    function saveSnapshot(){
      if(!state.tid) state.tid = uid();
      try{ localStorage.setItem(SNAP_PREFIX+state.tid, JSON.stringify(state)); }catch{}
      upsertIndex({ id:state.tid, name:state.tournamentName||"Sans titre", updatedAt:Date.now(), type: state.cloudId? "cloud":"local" });
      try{ localStorage.setItem(CURR_KEY, state.tid); }catch{}
    }
    function loadSnapshot(tid){
      try{
        const raw=localStorage.getItem(SNAP_PREFIX+tid);
        if(!raw) return false;
        state = JSON.parse(raw);
        normalize(); saveRuntime();
        try{ localStorage.setItem(CURR_KEY, tid); }catch{}
        return true;
      }catch{ return false; }
    }

    // ---------- État + session
    let state = loadRuntime() || {
      version: 22,
      tid: uid(),
      cloudId: null,            // si connecté cloud
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

    function sessionKey(){ return "tournoi_session_"+(cloud.id||"local"); }
    function loadSession(){ try{ const raw=localStorage.getItem(sessionKey()); if(raw){ const s=JSON.parse(raw); if(s) session=s; } }catch{} updateWho(); }
    function saveSession(){ try{ localStorage.setItem(sessionKey(), JSON.stringify(session)); }catch{} updateWho(); }

    // ---------- Firebase (Cloud)
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
            // crée un tournoi cloud vide côté serveur
            state.cloudId = cloud.id;
            pushCloud(true);
            setCloud("connecté (créé)");
            // index local
            upsertIndex({ id:"cloud:"+cloud.id, name:"Cloud · "+cloud.id, updatedAt:Date.now(), type:"cloud" });
            renderSetupRecent();
            return;
          }
        }
        if(!val) return;
        const remoteAt=+val.updatedAt||0;
        if(remoteAt<=cloud.lastRemoteAt) return;
        cloud.lastRemoteAt=remoteAt;
        state = val.state || state;
        state.cloudId = cloud.id;
        normalize();
        saveRuntime(); saveSnapshot(); // mémorise la version tirée du cloud
        renderAll();
        setCloud("connecté ("+cloud.id+")");
      });

      // Place le code dans l’URL
      try{ history.replaceState(null,"", location.pathname+"?v=roles2c14&id="+encodeURIComponent(cloud.id)); }catch{}
    }
    function leaveCloud(){
      if(cloud.ref) cloud.ref.off();
      cloud.enabled=false; cloud.id=null; cloud.ref=null; setCloud("hors ligne");
      // on garde l’état courant (local) tel quel
      loadSession();
    }
    function pushCloud(immediate){
      if(!cloud.enabled||!cloud.ref) return;
      const doPush=()=>cloud.ref.set({ state:state, updatedAt:Date.now() });
      clearTimeout(cloud.pushTimer);
      cloud.pushTimer=setTimeout(doPush, immediate?0:250);
    }

    // Auto-join si ?id=
    (function(){ const p=new URLSearchParams(location.search); const idp=p.get("id"); if(idp){ const el=id("join-code"); if(el) el.value=idp; joinCloud(idp); } })();

    // ---------- Utils
    function id(x){ return document.getElementById(x); }
    function qs(s){ return document.querySelector(s); }
    function qsa(s){ return Array.from(document.querySelectorAll(s)); }
    function qsaIn(n,s){ return Array.from(n.querySelectorAll(s)); }
    function addInlineStyle(css){ const st=document.createElement("style"); st.textContent=css; document.head.appendChild(st); }
    function esc(s){ return (s==null?"":String(s)).replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }
    function uid(){ return Math.random().toString(36).slice(2,10); }
    function clampInt(v,min,max){ if(isNaN(v)) return null; return Math.max(min, Math.min(max, v)); }
    function help(t){ const d=document.createElement("div"); d.className="help"; d.textContent=t; return d; }
    async function sha256(str){ try{ if(crypto?.subtle){ const enc=new TextEncoder().encode(str); const buf=await crypto.subtle.digest("SHA-256",enc); return Array.from(new Uint8Array(buf)).map(b=>b.toString(16).padStart(2,"0")).join(""); } }catch{} let h=2166136261>>>0; for(let i=0;i<str.length;i++){ h^=str.charCodeAt(i); h=(h*16777619)>>>0; } return ("00000000"+h.toString(16)).slice(-8).repeat(8); }
    function salt(){ return cloud.id || "local"; }

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

    // ---------- Rôles
    function isAdmin(){ return !!session.admin; }
    function hasClaim(tid){ return !!session.claims[tid]; }
    function canEditTeam(){ return isAdmin(); }
    function canEditAvatar(tid){ return isAdmin() || hasClaim(tid); }
    function canEditMatch(m){ return isAdmin() || hasClaim(m.a) || hasClaim(m.b); }
    function teamObj(tid){ return state.teams.find(t=>t.id===tid)||null; }
    function teamName(tid){ const t=teamObj(tid); return t?t.name:"—"; }
    function initials(name){ const s=(name||"").trim(); if(!s) return "?"; const p=s.split(/\s+/); return (p[0][0]+(p[1]?.[0]||"")).toUpperCase(); }
    function avatarHtml(tid,size){ const t=teamObj(tid)||{name:"?"}; const url=t.avatar; const cls=size==='lg'?'avatar-lg':(size==='sm'?'avatar-sm':''); const content=url?('<img src="'+esc(url)+'" alt="avatar">'):'<span class="avatar-initials">'+esc(initials(t.name))+'</span>'; return '<span class="avatar '+cls+'" title="'+esc(t.name)+'">'+content+'</span>'; }

    // ---------- Identité
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

    // ---------- Plein écran
    function fsElement(){ return document.fullscreenElement||document.webkitFullscreenElement||document.mozFullScreenElement||document.msFullscreenElement; }
    function enterFS(el){ return el.requestFullscreen?.()||el.webkitRequestFullscreen?.()||el.mozRequestFullScreen?.()||el.msRequestFullscreen?.(); }
    function exitFS(){ return document.exitFullscreen?.()||document.webkitExitFullscreen?.()||document.mozCancelFullScreen?.()||document.msExitFullscreen?.(); }
    function fsSupported(){ const el=document.documentElement; return !!(el.requestFullscreen||el.webkitRequestFullscreen||el.mozRequestFullScreen||el.msRequestFullscreen); }
    function updateFSBtn(){ const b=id("btn-fullscreen"); if(!b) return; b.style.display=fsSupported()?"inline-block":"none"; b.textContent=fsElement()?"Quitter plein écran":"⛶ Plein écran"; b.title=fsElement()?"Quitter le plein écran (Esc)":"Plein écran (Esc pour quitter)"; }
    onClick(id("btn-fullscreen"), ()=>{ fsElement()?exitFS():enterFS(document.documentElement); });
    ["fullscreenchange","webkitfullscreenchange","mozfullscreenchange","MSFullscreenChange"].forEach(e=>document.addEventListener(e,updateFSBtn));
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
    function goto(tabId){ const b=qs('.tab[data-tab="'+tabId+'"]'); if(b && b.click) b.click(); }

    // ---------- HUB TOURNOI (Setup)
    function ensureAdmin(){ if(isAdmin()) return true; const pin=prompt("PIN administrateur :"); if(pin==="30041991"){ session.admin=true; saveSession(); return true; } return false; }

    // Créer
    onClick(id("btn-create-tournament"), ()=>{
      if(!ensureAdmin()) return;
      const name = (id("tname-input").value||"").trim() || "Tournoi entre amis";
      let n = parseInt(id("teams-count-input").value,10); if(isNaN(n)) n=4; n=clampInt(n,2,64);

      if(state.teams.length || state.matches.length){
        if(!confirm("Cette action va EFFACER le tournoi actuel et en créer un nouveau. Continuer ?")) return;
      }
      state = {
        version: 22,
        tid: uid(),
        cloudId: null,
        tournamentName: name,
        teams: Array.from({length:n}, (_,i)=>({ id:uid(), name:"Équipe "+(i+1), p1:"", p2:"", avatar:null })),
        matches: [],
        locked:false,
        createdAt:new Date().toISOString(),
        protect:{ teamPassHash:{} }
      };
      normalize(); saveState(); saveSnapshot();
      renderAll(); goto("equipes");
    });

    // Récents
    function renderSetupRecent(){
      const wrap=id("recent-list"); if(!wrap) return;
      wrap.innerHTML="";
      const idx=getIndex().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
      if(!idx.length){ wrap.appendChild(help("Aucun tournoi mémorisé pour l’instant.")); return; }
      const box=document.createElement("div"); box.style.display="flex"; box.style.flexWrap="wrap"; box.style.gap="8px";
      idx.forEach(e=>{
        const btn=document.createElement("button"); btn.className="btn"; btn.type="button";
        btn.textContent = (e.type==="cloud"?"☁ ":"") + e.name;
        btn.addEventListener("click", ()=>{
          if(e.type==="cloud" && e.id.startsWith("cloud:")){
            const code=e.id.slice(6);
            id("join-code").value=code;
            joinCloud(code);
            goto("equipes");
            return;
          }
          const ok=loadSnapshot(e.id);
          if(!ok){ alert("Impossible d’ouvrir ce tournoi (données manquantes)."); return; }
          // on nettoie les claims (les équipes ont changé)
          session.claims={}; saveSession();
          renderAll(); goto("equipes");
        });
        box.appendChild(btn);
      });
      wrap.appendChild(box);
    }

    // Rejoindre (Cloud)
    onClick(id("btn-join-code"), ()=>{ const code=(id("join-code").value||"").trim(); if(!code){ alert("Renseigne un code."); return; } joinCloud(code); goto("equipes"); });
    onClick(id("btn-copy-link"), ()=>{
      const code=(id("join-code").value||"").trim(); if(!code){ alert("Renseigne un code."); return; }
      const url=location.origin+location.pathname+"?v=roles2c14&id="+encodeURIComponent(code);
      navigator.clipboard?.writeText(url); alert("Lien copié !\n"+url);
    });

    // ---------- TEAMS
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
        teamListEl.appendChild(help("Aucune équipe. Utilisez « Tournoi » > Nouveau tournoi."));
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

      // Édition live
      qsa('#team-list input[data-field]').forEach(inp=>{
        const tid=inp.getAttribute("data-id"), f=inp.getAttribute("data-field");
        inp.addEventListener("input", ()=>{
          if(!canEditTeam(tid)) return;
          const t=teamObj(tid); if(!t) return;
          t[f]=inp.value; saveState({cloud:false});
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
          const hash=await sha256(salt()+"|"+pass); state.protect=state.protect||{teamPassHash:{}}; state.protect.teamPassHash[tid]=hash; saveState(); renderTeams(); alert("Mot de passe défini.");
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
          const input = qs('[data-avatar="'+tid+'"]'); if(input && input.click) input.click();
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

    // ---------- Calendrier homogène
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
        if(pairs.length>1){ let shift=r%pairs.length; while(shift-->0) pairs.unshift(pairs.pop()); }
        for(const pr of pairs){ out.push({ id:uid(), a:pr[0], b:pr[1], darts:[null,null,null], pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}], palet:{a:null,b:null}, round:r+1, order:order++ }); }
      }
      out.sort((x,y)=>(x.round-y.round)||(x.order-y.order)); state.matches=out; saveState(); renderMatches();
    }

    // helpers scores
    function getPingPts(m){ return Array.isArray(m.pingPts)?m.pingPts:[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; }
    function isPingValid(a,b){ if(a==null||b==null) return false; if(isNaN(a)||isNaN(b)) return false; const max=Math.max(a,b), diff=Math.abs(a-b); return (max>=11)&&(diff>=2); }
    function computeSetWins(m){
      const darts=Array.isArray(m.darts)?m.darts:[null,null,null];
      const sets=getPingPts(m);
      const aw={darts:0,ping:0}, bw={darts:0,ping:0};
      darts.forEach(v=>{ if(v===0) aw.darts++; else if(v===1) bw.darts++; });
      sets.forEach(s=>{ const a=(typeof s.a==='number')?s.a:null, b=(typeof s.b==='number')?s.b:null; if(isPingValid(a,b)){ if(a>b) aw.ping++; else if(b>a) bw.ping++; } });
      return {aw, bw};
    }
    function isMatchComplete(m){
      const okD=(Array.isArray(m.darts)?m.darts:[null,null,null]).every(v=>v===0||v===1);
      const okP=getPingPts(m).every(s=>isPingValid(s.a,s.b));
      const pa=m.palet.a, pb=m.palet.b;
      const okL=(pa!=null&&pb!=null)&&((pa===11&&pb>=0&&pb<=10)||(pb===11&&pa>=0&&pa<=10));
      return okD&&okP&&okL;
    }

    // ---------- Rencontres
    const matchListEl=id("match-list"), statsMatchesEl=id("stats-matches");
    function renderMatches(){
      matchListEl.innerHTML="";
      if(!Array.isArray(state.matches) || state.matches.length===0){ matchListEl.appendChild(help("Aucune rencontre planifiée.")); statsMatchesEl.textContent="0 / 0 matches complets"; return; }
      const groups={}; state.matches.forEach(m=>{ (groups[m.round]=groups[m.round]||[]).push(m); });
      const rounds=Object.keys(groups).map(k=>+k).sort((a,b)=>a-b);
      let complete=0, idx=0;
      rounds.forEach(r=>{
        const hdr=help("Journée "+r); hdr.style.fontWeight="600"; hdr.style.margin="8px 0"; matchListEl.appendChild(hdr);
        groups[r].forEach(m=>{
          const wins=computeSetWins(m), pal=m.palet, palScore=(pal.a!=null&&pal.b!=null)?(pal.a+"–"+pal.b):"—";
          const done=isMatchComplete(m); if(done) complete++;
          const can=canEditMatch(m);
          const el=document.createElement("div"); el.className="match-card"; el.dataset.id=m.id;
          const isOpen=(typeof ui.open[m.id]==="boolean")?ui.open[m.id]:false;
          el.setAttribute("aria-expanded", isOpen?"true":"false");

          el.innerHTML=''
            +'<div class="hd" data-expand style="border:none;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center">'
            +'<div class="teams"><span class="chip">#'+(++idx)+'</span> '
            +'<span class="team-name">'+avatarHtml(m.a,'sm')+esc(teamName(m.a))+'</span> <span class="muted">vs</span> '
            +'<span class="team-name">'+avatarHtml(m.b,'sm')+esc(teamName(m.b))+'</span></div>'
            +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">'
            +'<span class="chip">Journée '+(m.round||"?")+'</span>'
            +'<span class="chip">Fléchettes G: '+wins.aw.darts+'-'+wins.bw.darts+'</span>'
            +'<span class="chip">Ping G: '+wins.aw.ping+'-'+wins.bw.ping+'</span>'
            +'<span class="chip">Palet: '+palScore+'</span>'
            +(done?'<span class="pill" style="border-color:#2c6;color:#8fd">✅ Complet</span>':'<span class="pill" style="border-color:#aa6;color:#ffc">⏳ Incomplet</span>')
            +'<span class="chip">▶</span></div></div>'
            +'<div class="bd">'+renderDarts(m,can)+renderPing(m,can)+renderPalet(m,can)
            +'<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px">'
            +'<div class="help">'+(can?'':'Lecture seule — connectez-vous à une des deux équipes.')+'</div>'
            +'<div>'+(can?'<button type="button" class="btn small" data-clear="'+m.id+'">Effacer ce match</button>':'')+'</div></div></div>';

          const head=el.querySelector("[data-expand]"); if(head) head.addEventListener("click", ()=>{
            const open=el.getAttribute("aria-expanded")==="true";
            el.setAttribute("aria-expanded", open?"false":"true");
            ui.open[m.id]=!open;
          });

          // fléchettes
          qsaIn(el,'select[data-match][data-kind]').forEach(sel=>{
            if(!can) sel.disabled=true;
            sel.addEventListener("change", ()=>{
              if(!can) return;
              const k=sel.getAttribute("data-kind"), ii=parseInt(sel.getAttribute("data-index"),10);
              const v=sel.value===""?null:parseInt(sel.value,10);
              const mm=findMatch(m.id); mm[k][ii]=v; saveState(); renderLeaderboard(); renderH2H();
            });
          });

          // ping
          qsaIn(el,'input[data-ping]').forEach(inp=>{
            if(!can) inp.disabled=true;
            inp.addEventListener("input", ()=>{
              if(!can) return;
              const w=inp.getAttribute("data-ping"), ii=parseInt(inp.getAttribute("data-index"),10);
              const v=inp.value===""?null:clampInt(parseInt(inp.value,10),0,99);
              const mm=findMatch(m.id); mm.pingPts[ii][w]=v; saveState(); renderLeaderboard(); renderH2H();
            });
            inp.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); inp.blur(); } });
          });

          // palet
          qsaIn(el,'input[data-palet]').forEach(inp=>{
            if(!can) inp.disabled=true;
            inp.addEventListener("input", ()=>{
              if(!can) return;
              const w=inp.getAttribute("data-palet");
              const v=inp.value===""?null:clampInt(parseInt(inp.value,10),0,11);
              const mm=findMatch(m.id); mm.palet[w]=v; saveState(); renderLeaderboard(); renderH2H();
            });
            inp.addEventListener("keydown", e=>{ if(e.key==="Enter"){ e.preventDefault(); inp.blur(); } });
          });

          const clr=el.querySelector("[data-clear]"); if(clr) clr.addEventListener("click", ()=>{ if(!can) return; clearMatch(m.id); renderLeaderboard(); renderH2H(); });

          matchListEl.appendChild(el);
        });
      });
      statsMatchesEl.textContent=complete+" / "+state.matches.length+" matches complets";
      renderLeaderboard();
    }

    function renderDarts(m,can){
      const subs=["Simple 1","Simple 2","Double"], names=[teamName(m.a),teamName(m.b)];
      let html="";
      for(let i=0;i<3;i++){
        const v=m.darts[i];
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
      const labels=["Simple 1","Simple 2","Double"], sets=getPingPts(m); let html="";
      for(let i=0;i<3;i++){
        const s=sets[i]||{a:null,b:null}, note=(s.a==null||s.b==null)?'Saisissez deux scores (11+ et écart ≥ 2).':(isPingValid(s.a,s.b)?'✔️ Score valide':'⚠️ Vainqueur à 11+ et écart de 2 (11–9, 12–10…).');
        html+='<div class="grid cols-4" style="align-items:end;margin-top:6px">'
          +'<div><label>Ping — '+labels[i]+' — '+esc(teamName(m.a))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="99" step="1" value="'+(s.a==null?'':s.a)+'" data-ping="a" data-index="'+i+'"/></div>'
          +'<div><label>Ping — '+labels[i]+' — '+esc(teamName(m.b))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="99" step="1" value="'+(s.b==null?'':s.b)+'" data-ping="b" data-index="'+i+'"/></div>'
          +'<div class="help">'+note+'</div><div></div></div>';
      }
      return html;
    }
    function renderPalet(m,can){
      const a=m.palet.a, b=m.palet.b, note=(a==null||b==null)?'Saisissez les deux scores (l’un doit être 11).':((a===11&&b>=0&&b<=10)||(b===11&&a>=0&&a<=10)?'✔️ Score valide':'⚠️ Un score doit être 11, l’autre entre 0 et 10.');
      return '<div class="grid cols-4" style="align-items:end;margin-top:6px">'
        +'<div><label>Palet — '+esc(teamName(m.a))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="11" step="1" value="'+(a==null?'':a)+'" data-palet="a"/></div>'
        +'<div><label>Palet — '+esc(teamName(m.b))+'</label><input '+(can?'':'disabled ')+'type="number" min="0" max="11" step="1" value="'+(b==null?'':b)+'" data-palet="b"/></div>'
        +'<div class="help">'+note+'</div><div></div></div>';
    }

    function findMatch(idv){ return state.matches.find(x=>x.id===idv); }
    function clearMatch(idv){ const m=findMatch(idv); if(!m||!canEditMatch(m)) return; if(!confirm("Effacer tous les scores de ce match ?")) return; m.darts=[null,null,null]; m.pingPts=[{a:null,b:null},{a:null,b:null},{a:null,b:null}]; m.palet={a:null,b:null}; saveState(); renderMatches(); }

    // ---------- Classement
    function computeLeaderboard(){
      const stats={}; state.teams.forEach(t=>{ stats[t.id]={teamId:t.id,name:t.name,avatar:t.avatar||null,points:0,dartsW:0,pingW:0,palFor:0,palAg:0,matchesComplete:0}; });
      state.matches.forEach(m=>{
        const A=stats[m.a], B=stats[m.b];
        (Array.isArray(m.darts)?m.darts:[]).forEach(v=>{ if(v===0){A.dartsW++;A.points+=5;} else if(v===1){B.dartsW++;B.points+=5;} });
        getPingPts(m).forEach(s=>{ if(isPingValid(s.a,s.b)){ if(s.a>s.b){A.pingW++;A.points+=5;} else if(s.b>s.a){B.pingW++;B.points+=5;} } });
        const pa=m.palet.a, pb=m.palet.b; if(pa!=null&&pb!=null){ A.palFor+=pa; B.palFor+=pb; A.palAg+=pb; B.palAg+=pa; A.points+=pa; B.points+=pb; }
        if(isMatchComplete(m)){ A.matchesComplete++; B.matchesComplete++; }
      });
      const rows=Object.values(stats);
      rows.sort((x,y)=> (y.points-x.points) || ((y.palFor-y.palAg)-(x.palFor-x.palAg)) || ((y.dartsW+y.pingW)-(x.dartsW+x.pingW)) || x.name.localeCompare(y.name) );
      rows.forEach((r,i)=>r.rank=i+1); return rows;
    }
    function renderLeaderboard(){
      const tbody=qs("#table-classement tbody"); if(!tbody) return; tbody.innerHTML="";
      computeLeaderboard().forEach(r=>{
        const diff=r.palFor-r.palAg; const tr=document.createElement("tr");
        tr.innerHTML='<td>'+r.rank+'</td>'
          +'<td><span class="team-name">'+(r.avatar?('<span class="avatar avatar-lg"><img src="'+esc(r.avatar)+'" alt="avatar"></span>'):( '<span class="avatar avatar-lg"><span class="avatar-initials">'+esc(initials(r.name))+'</span></span>' ))+' '+esc(r.name)+'</span></td>'
          +'<td><b>'+r.points+'</b></td><td>'+r.dartsW+'</td><td>'+r.pingW+'</td>'
          +'<td>'+r.palFor+'–'+r.palAg+' <span class="muted">('+(diff>=0?'+':'')+diff+')</span></td>'
          +'<td>'+r.matchesComplete+'</td>';
        tbody.appendChild(tr);
      });
    }

    // ---------- H2H
    function pointsForTeamInMatch(m,teamId){
      const isA=m.a===teamId, isB=m.b===teamId; if(!isA&&!isB) return 0;
      let pts=0; (Array.isArray(m.darts)?m.darts:[]).forEach(v=>{ if(v===0&&isA) pts+=5; else if(v===1&&isB) pts+=5; });
      getPingPts(m).forEach(s=>{ if(isPingValid(s.a,s.b)){ if(s.a>s.b&&isA) pts+=5; else if(s.b>s.a&&isB) pts+=5; } });
      if(m.palet && m.palet.a!=null && m.palet.b!=null) pts += isA? m.palet.a : m.palet.b;
      return pts;
    }
    function renderH2H(){
      const thead=qs("#table-h2h thead"), tbody=qs("#table-h2h tbody"); if(!thead||!tbody) return;
      thead.innerHTML=""; tbody.innerHTML="";
      const teams=state.teams.slice(); if(!teams.length){ tbody.appendChild(help("Ajoutez des équipes pour voir la matrice.")); return; }
      const trH=document.createElement("tr"); trH.appendChild(document.createElement("th")).textContent="Équipe";
      teams.forEach(t=>{ const th=document.createElement("th"); th.innerHTML='<span class="team-name">'+avatarHtml(t.id,'sm')+esc(t.name)+'</span>'; trH.appendChild(th); });
      thead.appendChild(trH);
      const byPair={}; state.matches.forEach(m=>{ byPair[[m.a,m.b].sort().join("|")]=m; });
      teams.forEach(ti=>{
        const tr=document.createElement("tr"); const th=document.createElement("th"); th.innerHTML='<span class="team-name">'+avatarHtml(ti.id,'sm')+esc(ti.name)+'</span>'; tr.appendChild(th);
        teams.forEach(tj=>{
          const td=document.createElement("td");
          if(ti.id===tj.id){ td.textContent="—"; tr.appendChild(td); return; }
          const m=byPair[[ti.id,tj.id].sort().join("|")];
          if(!m){ td.innerHTML='<span class="chip">—</span>'; tr.appendChild(td); return; }
          const pI=pointsForTeamInMatch(m,ti.id), pJ=pointsForTeamInMatch(m,tj.id);
          if(pI===0 && pJ===0){ td.innerHTML='<span class="chip">•</span>'; }
          else{ const tag=(pI>pJ)?'W':(pI<pJ)?'L':'='; td.innerHTML='<span class="chip">'+tag+' '+pI+'–'+pJ+'</span>'; }
          td.style.cursor="pointer"; td.dataset.matchId=m.id; tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });
      tbody.addEventListener("click", e=>{
        let n=e.target; while(n && n!==tbody && !(n.tagName==="TD" && n.dataset.matchId)) n=n.parentNode;
        if(!n||n===tbody) return; goToMatch(n.dataset.matchId);
      });
    }
    function goToMatch(mid){ goto("calendrier"); ui.open[mid]=true; setTimeout(()=>{ const card=qs('.match-card[data-id="'+mid+'"]'); if(card){ card.setAttribute("aria-expanded","true"); try{ card.scrollIntoView({behavior:"smooth",block:"start"}); }catch{ card.scrollIntoView(); } } },0); }

    // ---------- Export / Import / Reset / Admin
    onClick(id("btn-export"), ()=>{ const data=JSON.stringify(state,null,2); const url=URL.createObjectURL(new Blob([data],{type:"application/json"})); const a=document.createElement("a"); a.href=url; a.download="tournoi-"+(state.tournamentName||"TriSports").replace(/\s+/g,'_')+".json"; a.click(); URL.revokeObjectURL(url); });
    let importFile=null; const fileImport=id("file-import"); if(fileImport) fileImport.addEventListener("change", e=>importFile=e.target.files[0]);
    onClick(id("btn-import"), ()=>{ if(!importFile){ alert("Sélectionnez un fichier JSON."); return; } importFile.text().then(t=>{ try{ const data=JSON.parse(t); if(!(data && Array.isArray(data.teams) && Array.isArray(data.matches))) throw 0; state=data; normalize(); saveState(); saveSnapshot(); renderAll(); alert("Import réussi !"); }catch{ alert("Fichier invalide."); } }); });

    onClick(id("btn-admin-on"), ()=>{ const pin=prompt("PIN administrateur :"); if(pin==="30041991"){ session.admin=true; saveSession(); renderAll(); alert("Mode administrateur activé."); } else alert("PIN incorrect."); });
    onClick(id("btn-admin-off"), ()=>{ session.admin=false; saveSession(); renderAll(); });

    onClick(id("btn-reset"), ()=>{
      const pin=prompt("PIN administrateur :"); if(pin!=="30041991"){ alert("PIN incorrect."); return; }
      if(!confirm("Ré-initialiser totalement ?")) return;
      state={version:22,tid:uid(),cloudId:null,tournamentName:"",teams:[],matches:[],locked:false,createdAt:new Date().toISOString(),protect:{teamPassHash:{}}};
      normalize(); session={admin:false,claims:{}}; saveSession(); saveState(); saveSnapshot(); renderAll(); goto("setup");
    });
    onClick(id("btn-unlock"), ()=>{ if(!isAdmin()){ alert("Réservé à l’admin."); return; } if(!confirm("Déverrouiller le calendrier ?")) return; state.locked=false; saveState(); renderTeams(); renderMatches(); updateLockUI(); });

    // ---------- Helpers communs
    function onClick(el,fn){ if(el && el.addEventListener) el.addEventListener("click",fn); }
    function saveState(opts){
      saveRuntime();
      saveSnapshot();
      renderTitle(); renderLeaderboard(); renderH2H();
      if(cloud.enabled && !(opts && opts.cloud===false)) pushCloud(false);
      renderSetupRecent(); // maintient la liste à jour
    }

    // ---------- Init
    loadSession();
    renderAll();
    function renderAll(){
      renderTitle(); renderSetupRecent();
      if(!state.teams.length) goto("setup");
      renderTeams(); renderMatches(); renderLeaderboard(); renderH2H(); updateCounts(); updateLockUI(); updateWho();
      setCloud(cloud.enabled?"connecté":"hors ligne");
    }
  });
})();
