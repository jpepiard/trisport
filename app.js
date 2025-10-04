// Extracted from inline <script> tags in index.html
window.addEventListener('error', function (e) {
    const msg = (e.message || '') + '';
    if (msg.includes('Minified React error #')) {
      e.stopImmediatePropagation?.();
      return false;
    }
  }, true);

function ensureParamWrapper(){
  const fields = id('capitaine-fields'); if(!fields) return null;
  let wrap=id('cap-params'); if(!wrap){ wrap=document.createElement('div'); wrap.id='cap-params'; wrap.className='bonus-params'; fields.parentNode.insertBefore(wrap, fields); wrap.appendChild(fields); }
  return wrap;
}
function ensureTaupeWrapper(){
  const fields = id('taupe-fields'); if(!fields) return null;
  let wrap=id('taupe-params'); if(!wrap){ wrap=document.createElement('div'); wrap.id='taupe-params'; wrap.className='bonus-params'; fields.parentNode.insertBefore(wrap, fields); wrap.appendChild(fields); }
  return wrap;
}
function ensureLeftHandWrapper(){
  const fields = id('lefthand-fields'); if(!fields) return null;
  let wrap=id('lefthand-params'); if(!wrap){ wrap=document.createElement('div'); wrap.id='lefthand-params'; wrap.className='bonus-params'; fields.parentNode.insertBefore(wrap, fields); wrap.appendChild(fields); }
  return wrap;
}
function ensureMelonWrapper(){
  const fields = id('melon-fields'); if(!fields) return null;
  let wrap = id('melon-params');
  if (!wrap){
    wrap = document.createElement('div');
    wrap.id = 'melon-params';
    wrap.setAttribute('role','region');
    wrap.setAttribute('aria-live','polite');
    wrap.setAttribute('aria-label','Paramètres Melon d’or');

    wrap.className = 'bonus-params';
    fields.parentNode.insertBefore(wrap, fields);
    wrap.appendChild(fields);
  }
  return wrap;
}


function setParamsOpen(openCap, openTaupe, openLeft, openMelon){
  const wC = ensureParamWrapper();    if (wC){ wC.style.maxHeight = openCap   ? (wC.scrollHeight+'px') : '0px'; }
  const wT = ensureTaupeWrapper();    if (wT){ wT.style.maxHeight = openTaupe ? (wT.scrollHeight+'px') : '0px'; }
  const wL = ensureLeftHandWrapper(); if (wL){ wL.style.maxHeight = openLeft  ? (wL.scrollHeight+'px') : '0px'; }
  const wM = ensureMelonWrapper();    if (wM){ wM.style.maxHeight = openMelon ? (wM.scrollHeight+'px') : '0px'; }
}

function selectBonusType(t){
  // lock guard per category
  try{
    const teamId = (window.bonusCTX && window.bonusCTX.teamId);
    if (teamId && typeof getTeamCategoryLocks==='function'){
      const locks = getTeamCategoryLocks(teamId);
      const cat = BONUS_CATEGORY[t];
      const round = (window.bonusCTX && window.bonusCTX.round);
      const currentSel = (typeof getBonusSelection==='function' && round!=null) ? (getBonusSelection(round, teamId) || null) : null;
      const allowCurrent = !!(currentSel && currentSel.type === t);
      if (cat && locks.has(cat) && !allowCurrent) return; // blocked
    }
  }catch(_){}

  // 1) type valide (inclut 'melon')
  window._bonusType = (['capitaine','miroir','taupe','lefthand','melon'].includes(t) ? t : 'capitaine');

  // 2) cartes (5 cartes désormais)
  const cards = [...document.querySelectorAll('.bonus-select .bonus-card')];
  const cap   = cards[0],
        mir   = cards[1],
        tau   = cards[2],
        leftc = cards[3],
        melon = cards[4];

  // 3) reset + sélection
  [cap, mir, tau, leftc, melon].forEach(c => c && c.classList.remove('selected'));
  if (cap   && window._bonusType === 'capitaine') cap.classList.add('selected');
  if (mir   && window._bonusType === 'miroir')    mir.classList.add('selected');
  if (tau   && window._bonusType === 'taupe')     tau.classList.add('selected');
  if (leftc && window._bonusType === 'lefthand')  leftc.classList.add('selected');
  if (melon && window._bonusType === 'melon')     melon.classList.add('selected');

  
  // 3bis) a11y state
  [cap, mir, tau, leftc, melon].forEach((c,i)=>{
    if(!c) return;
    const pressed =
      (i===0 && window._bonusType==='capitaine') ||
      (i===1 && window._bonusType==='miroir')    ||
      (i===2 && window._bonusType==='taupe')     ||
      (i===3 && window._bonusType==='lefthand')  ||
      (i===4 && window._bonusType==='melon');
    c.setAttribute('aria-pressed', pressed ? 'true' : 'false');
  });
// 4) texte d’aide
  const ctx = id('bonus-context');
  if (ctx) {
    ctx.textContent =
      window._bonusType === 'miroir'   ? "Miroir : inverse le bonus adverse sur tout le match." :
      window._bonusType === 'taupe'    ? "René la taupe : choisissez le sport." :
      window._bonusType === 'lefthand' ? "10 pouces 2 mains gauche : choisissez le sport." :
      window._bonusType === 'melon'    ? "Melon d'or : choisissez le sport." :
                                          "Capitaine : aucun réglage. +2/manche gagnée ; +2 si palet.";
  }

  // 5) affichage des paramètres (Capitaine n’a plus de champs)
  setParamsOpen(window._bonusType==='capitaine', window._bonusType==='taupe', window._bonusType==='lefthand', window._bonusType==='melon');
}

function prepareBonusOptions(){
  const cards = [...document.querySelectorAll('.bonus-select .bonus-card')];
  const map   = ['capitaine','miroir','taupe','lefthand','melon']; // 5 cartes

  cards.forEach((c, i)=>{
    c.classList.add('selectable');
    c.tabIndex = 0;
    c.setAttribute('role','button');
    c.setAttribute('aria-pressed','false');

    const type = map[i] || 'capitaine';
    c.addEventListener('click', ()=>selectBonusType(type));
    c.addEventListener('keydown', ev=>{
      if(ev.key===' '||ev.key==='Enter'){
        ev.preventDefault();
        selectBonusType(type);
      }
    });
  });

  // déplacer/afficher les panneaux de paramètres (Capitaine n’en a plus)
  const cap = cards[0], tau = cards[2], leftc = cards[3], melon = cards[4];
  const capTxt = cap?.querySelector('.bonus-text');
  const tauTxt = tau?.querySelector('.bonus-text');
  const leftTxt = leftc?.querySelector('.bonus-text');
  const melonTxt = melon?.querySelector('.bonus-text');

  const wC = ensureParamWrapper();    if (capTxt   && wC && wC.parentElement   !== capTxt)   capTxt.appendChild(wC);
  const wT = ensureTaupeWrapper();    if (tauTxt   && wT && wT.parentElement   !== tauTxt)   tauTxt.appendChild(wT);
  const wL = ensureLeftHandWrapper(); if (leftTxt  && wL && wL.parentElement   !== leftTxt)  leftTxt.appendChild(wL);
  const wM = ensureMelonWrapper();    if (melonTxt && wM && wM.parentElement !== melonTxt) melonTxt.appendChild(wM);

  // init sélection
  selectBonusType(window._bonusType || 'capitaine');
}

;
window.FIREBASE_CONFIG={apiKey:"AIzaSyBSxiTryd0T1Flv15LBdzu31UFvU_I2J7Q",authDomain:"trisport-9a7b2.firebaseapp.com",databaseURL:"https://trisport-9a7b2-default-rtdb.europe-west1.firebasedatabase.app",projectId:"trisport-9a7b2",messagingSenderId:"132024051367",appId:"1:132024051367:web:f9aa39785a3d4a43875d82"};

;
'use strict';
/* ===== Helpers ===== */

/**
 * @typedef {Object} RoundCtl
 * @property {boolean} started
 * @property {boolean} finished
 *
 * @typedef {Object.<string, any>} Team
 *
 * @typedef {Object} AppState
 * @property {number} version
 * @property {string} tid
 * @property {string|null} cloudId
 * @property {string} tournamentName
 * @property {Object} rules
 * @property {Array<Team>} teams
 * @property {Array<any>} matches
 * @property {Object.<number, RoundCtl>} roundCtl
 * @property {Object.<number, Object.<string, any>>} bonusSelections
 * @property {Object.<number, Object.<string, number>>} bonusApplied
 * @property {Object.<number, Object.<string, boolean>>} bonusUsed
 */


// Centralise libellés/images pour les bonus (évite les erreurs de frappe)
const BONUS = {
  /** @param {"capitaine"|"miroir"|"taupe"|"lefthand"|"melon"|string} type */
  labelForType(type){
    switch(type){
      case "miroir":   return "Miroir";
      case "taupe":    return "René la taupe";
      case "lefthand": return "10 pouces 2 mains gauche";
      case "melon":    return "Melon d'or";
      default:         return "Capitaine";
    }
  },
  imgForType(type){
    switch(type){
      case "miroir":   return "miroir.jpg";
      case "taupe":    return "taupe.png";
      case "lefthand": return "main-gauche.png";
      case "melon":    return "melon.png";
      default:         return "capitaine.jpg";
    }
  },
  sportLabel(s){ return s==="darts" ? "Fléchettes" : (s==="ping" ? "Ping" : "Palet"); },
  playerLabel(p){ return p==="p1" ? "J1" : "J2"; }
};

// Helpers sûrs pour initialiser les containers imbriqués
function ensure(obj, key, defFactory){
  if(!obj[key]) obj[key] = defFactory();
  return obj[key];
}

const id=x=>document.getElementById(x), qs=s=>document.querySelector(s), qsa=s=>Array.from(document.querySelectorAll(s));
const esc=s=>(s==null?"":String(s)).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;","\"":"&quot;","'":"&#39;"}[c]));
const uid=()=>Math.random().toString(36).slice(2,10);
const clampInt=(v,min,max)=>{v=parseInt(v,10);if(isNaN(v))return null;return Math.max(min,Math.min(max,v));}
const help=t=>{const d=document.createElement("div");d.className="help";d.textContent=t;return d;}
function hashPass(s){s=(s||"").trim();let h=0x811c9dc5>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,0x01000193)>>>0}return("00000000"+h.toString(16)).slice(-8)}
const hy=(a,b)=>`${a}\u2011${b}`;
const BONUS_VAL=5;

/* ===== Erreurs visibles ===== */
window.onerror=(msg,src,line,col)=>{const el=id("storage-warning");if(el){el.style.display="block";el.textContent="Erreur JS : "+msg+" @"+(src||"")+":"+(line||0)+":"+(col||0)} const p=id("js-ok");if(p){p.textContent='JS chargé avec erreurs ⚠️';p.style.background='#8a2a2a'}};

/* ===== Index Cloud (local) ===== */
const STORAGE_KEY="trisports_cloud_only_v1"; const IDX_KEY="trisports_cloud_index_v1";
function getIndex(){try{return JSON.parse(localStorage.getItem(IDX_KEY)||"[]")}catch(_){return[]}}
function setIndex(a){try{localStorage.setItem(IDX_KEY,JSON.stringify(a||[]))}catch(_){}}
function upsertIndex(e){const i=getIndex();const k=i.findIndex(x=>x.id===e.id);if(k>=0)i[k]=Object.assign({},i[k],e);else i.unshift(e);setIndex(i)}
function nameExistsLocally(n){n=(n||"").trim().toLowerCase();if(!n)return false;return getIndex().some(e=>(e.name||"").trim().toLowerCase()===n)}
function codeExistsLocally(c){return getIndex().some(e=>e.id===c)}
function renderSetupRecent(){const wrap=id("recent-list");wrap.innerHTML="";const idx=getIndex().sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));if(!idx.length){wrap.appendChild(help("Aucun tournoi cloud listé pour l’instant."));return}const box=document.createElement("div");box.style.display="flex";box.style.flexWrap="wrap";box.style.gap="8px";idx.forEach(e=>{const btn=document.createElement("button");btn.className="btn";btn.type="button";btn.textContent="☁ "+e.name+" ("+e.id+")";btn.dataset.openId="cloud:"+e.id;const del=document.createElement("button");del.className="btn danger";del.type="button";del.textContent="Supprimer du cloud";del.dataset.deleteId=e.id;const w=document.createElement("div");w.style.display="flex";w.style.gap="6px";w.append(btn,del);box.appendChild(w)});wrap.appendChild(box)}
function renderManageList(){renderSetupRecent()}

/* ===== État ===== */
let state={version:40,tid:uid(),cloudId:null,tournamentName:"",rules:{dartsSingles:2,dartsDoubles:1,dartsWinPoints:5,pingSingles:2,pingDoubles:1,pingWinPoints:5,paletTarget:11,
  bonusMaxPerTeam: 99,},teams:[],matches:[],locked:false,createdAt:new Date().toISOString(),protect:{teamPassHash:{}},roundCtl:{},bonusSelections:{},bonusApplied:{}};
let ui={open:{},h2h:false}; let session={admin:false,claims:{}};
// === Session persistence (admin & team claims) ===
(function(){
  // safety: define rewriteCapitaineHelp if missing
  if (typeof window.rewriteCapitaineHelp !== 'function') { window.rewriteCapitaineHelp = function(){}; }

  const SESSION_KEY = 'trisports.session.v1';
  const MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 jours

  function loadPersisted(){
    try{
      const raw = localStorage.getItem(SESSION_KEY);
      if(!raw) return;
      const obj = JSON.parse(raw);
      if(!obj || !obj.t || (Date.now() - obj.t) > MAX_AGE_MS) return;
      if (typeof obj.admin === 'boolean') session.admin = obj.admin;
      if (obj.claims && typeof obj.claims === 'object') session.claims = obj.claims;
    }catch(e){ /* ignore */ }
  }

  function persistNow(){
    try{
      const payload = { t: Date.now(), admin: !!session.admin, claims: session.claims || {} };
      localStorage.setItem(SESSION_KEY, JSON.stringify(payload));
    }catch(e){ /* ignore */ }
  }

  // Load once on boot
  loadPersisted();

  // Persist on unload and also whenever we detect a change
  window.addEventListener('beforeunload', persistNow);

  // Optional helper APIs for your code
  window.persistSessionNow = persistNow;
  window.clearSessionPersistence = function(){
    try{ localStorage.removeItem(SESSION_KEY); }catch(e){}
  };
})();
function isAdmin(){return !!session.admin} function hasClaim(tid){return !!session.claims[tid]}
// === Droits de saisie des scores selon l'état de la journée ===
function _iAmTeamOf(m){ return hasClaim(m.a) || hasClaim(m.b); }
function canEditScores(m, rCtl){
  if (!rCtl.started && !rCtl.finished) return false; // pas commencé -> personne
  if (rCtl.finished) return isAdmin();               // terminé -> admin seul
  return isAdmin() || _iAmTeamOf(m);                 // en cours -> admin + équipe du match
}

function teamObj(tid){return state.teams.find(t=>t.id===tid)||null} function teamName(tid){const t=teamObj(tid);return t?t.name:"—"}
function initials(name){const s=(name||"").trim();if(!s)return"?";const p=s.split(/\s+/);return(p[0][0]+(p[1]?.[0]||"")).toUpperCase()}
function avatarHtml(tid,size,attrs){const t=teamObj(tid)||{name:"?"};const url=t.avatar;const cls=size==='lg'?'avatar-lg':(size==='sm'?'avatar-sm':'');const extra=attrs?(' '+attrs):'';const content=url?('<img src="'+esc(url)+'" alt="avatar">'):('<span class="avatar-initials">'+esc(initials(t.name))+'</span>');return '<span class="avatar '+cls+'" title="'+esc(t.name)+'"'+extra+'>'+content+'</span>'}
function updateWho(){try{var lb=document.getElementById("btn-open-logs");if(lb)lb.style.display=isAdmin()?"inline-block":"none"}catch(e){};const names=Object.keys(session.claims||{}).map(teamName).filter(Boolean);const who=isAdmin()?(names.length?("Admin · "+names.join(", ")):"Admin"):(names[0]||"visiteur");id("whoami").textContent="vous : "+who;id("whoami-top").textContent=who;const s=id("whoami-setup");if(s)s.textContent=who;const b=id("btn-add-team");if(b)b.style.display=isAdmin()?"inline-block":"none";const ba=id("btn-admin-on-setup");if(ba)ba.style.display=isAdmin()?"none":"inline-block"}
function renderTitle(){const name=(state.tournamentName||"").trim();document.title=(name?name+" — ":"")+"TriSports — Fléchettes • Ping-pong • Palet";const pill=id("tname-top");if(name){pill.style.display="inline-block";pill.textContent=name}else{pill.style.display="none";pill.textContent=""}}
function dartsTotal(){return (state.rules?.dartsSingles||0)+(state.rules?.dartsDoubles||0)}
function pingTotal(){return (state.rules?.pingSingles||0)+(state.rules?.pingDoubles||0)}
function ensureLengths(m){const dN=dartsTotal(),pN=pingTotal();m.darts=Array.isArray(m.darts)?m.darts.slice(0,dN):[];while(m.darts.length<dN)m.darts.push(null);if(!Array.isArray(m.pingPts))m.pingPts=[];m.pingPts=m.pingPts.slice(0,pN);while(m.pingPts.length<pN)m.pingPts.push({a:null,b:null});}
function _normMatch(m){m=m||{};m.id=m.id||uid();m.a=m.a||"";m.b=m.b||"";ensureLengths(m);m.palet=m.palet||{a:null,b:null};m.palet.a=(m.palet.a==null?null:+m.palet.a);m.palet.b=(m.palet.b==null?null:+m.palet.b);m.round=m.round||1;m.order=m.order||0;return m}
function normalize(){state.rules=state.rules||{dartsSingles:2,dartsDoubles:1,dartsWinPoints:5,pingSingles:2,pingDoubles:1,pingWinPoints:5,paletTarget:11};state.teams=Array.isArray(state.teams)?state.teams:[];state.matches=Array.isArray(state.matches)?state.matches.map(_normMatch):[];state.protect=state.protect||{};state.protect.teamPassHash=state.protect.teamPassHash||{};state.roundCtl=state.roundCtl||{};state.bonusSelections=state.bonusSelections||{};state.bonusApplied=state.bonusApplied||{};state.bonusUsed=state.bonusUsed||{};state.bonusUsed=state.bonusUsed||{}}

/* ===== Firebase ===== */
const cloud={enabled:false,db:null,id:null,ref:null,timer:null}; const hasFB=!!(window.firebase&&window.FIREBASE_CONFIG&&window.FIREBASE_CONFIG.apiKey);
function initFB(){try{if(!hasFB)return null;if(!firebase.apps||firebase.apps.length===0)firebase.initializeApp(window.FIREBASE_CONFIG);return firebase.database()}catch(_){return null}}
// If Firebase Auth is present, ensure local persistence
try{
  if (window.firebase && firebase.auth){
    firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(()=>{});
  }
}catch(e){}
function setCloudTxt(t){id("cloud-status").textContent=t;id("cloud-status-2").textContent=t}
function unsubscribeCloud(){try{if(cloud.ref)cloud.ref.off('value')}catch(_){ }cloud.ref=null;cloud.enabled=false;cloud.id=null;setCloudTxt('hors ligne')}
function resetState(){state={version:40,tid:uid(),cloudId:null,tournamentName:"",rules:{dartsSingles:2,dartsDoubles:1,dartsWinPoints:5,pingSingles:2,pingDoubles:1,pingWinPoints:5,paletTarget:11,
  bonusMaxPerTeam: 99,},teams:[],matches:[],locked:false,createdAt:new Date().toISOString(),protect:{teamPassHash:{}},roundCtl:{},bonusSelections:{},bonusApplied:{}};try{localStorage.removeItem(STORAGE_KEY)}catch(_){}} 
function joinCloud(code){if(!hasFB){showToast("Firebase non configuré.");return}if(!cloud.db){cloud.db=initFB();if(!cloud.db){showToast("Init Firebase impossible.");return}}unsubscribeCloud();cloud.id=(code||"").trim();if(!cloud.id){showToast("Saisis un code tournoi.");return}cloud.ref=cloud.db.ref("tournaments/"+cloud.id+"/payload");cloud.enabled=true;setCloudTxt("connexion");cloud.ref.on("value",snap=>{const val=snap.val();if(!val){setCloudTxt("connecté (vide)");return}safeSetStateFromCloud(val);normalize();state.cloudId=cloud.id;localStorage.setItem(STORAGE_KEY,JSON.stringify(state));upsertIndex({id:cloud.id,name:state.tournamentName||"Sans titre",updatedAt:Date.now()});renderAll();setCloudTxt("connecté ("+cloud.id+")")});try{history.replaceState(null,"",location.pathname+"?id="+encodeURIComponent(cloud.id))}catch(_){}}

function safeSetStateFromCloud(val){
  try{
    if(!val || typeof val!=="object" || !val.state || typeof val.state!=="object"){
      // pas d'état valide côté cloud : on laisse l'état local tel quel
      return;
    }
    state = val.state;
  }catch(_){ /* on ignore, on garde l'état local */ }
}


function pushCloud(immediate){
  try {
    if(!cloud || !cloud.enabled || !cloud.ref) return;
    if (!state || !Array.isArray(state.teams) || !Array.isArray(state.matches)) {
      console.warn("pushCloud aborted: invalid state shape");
      return;
    }
    clearTimeout(cloud.timer);
    cloud.timer = setTimeout(function(){
      try {
        cloud.ref.set({ state: state, updatedAt: Date.now() });
      } catch(e) { console.error("Cloud set failed:", e); }
    }, immediate ? 0 : 250);
  } catch(err) {
    console.error("pushCloud error:", err);
  }
}


const findMatch=mid=>state.matches.find(x=>x.id===mid);
function clearMatch(mid){
  const m = findMatch(mid);
  if (!m) return;
  if (!isAdmin()) return;

  // Reset Fléchettes
  m.darts = Array(dartsTotal()).fill(null);

  // Reset Ping (choix set gagnant ET scores chiffrés)
  m.ping = Array(pingTotal()).fill(null);
  m.pingPts = Array(pingTotal()).fill({ a: null, b: null });

  // Reset Palet
  m.palet = { a: null, b: null };

  saveState();
  renderMatches();
  if (typeof renderLeaderboard === 'function') renderLeaderboard();
  if (typeof renderH2H === 'function') renderH2H();
}

/* ===== Bonus ===== */
function roundState(r){state.roundCtl[r]=state.roundCtl[r]||{started:false,finished:false};return state.roundCtl[r]}
function setBonusSelection(r,tid,sel){state.bonusSelections[r]=state.bonusSelections[r]||{};state.bonusSelections[r][tid]=sel}
function getBonusSelection(r,tid){return(state.bonusSelections[r]||{})[tid]||null}
function setBonusApplied(r,tid,pts){state.bonusApplied[r]=state.bonusApplied[r]||{};state.bonusApplied[r][tid]=pts}
function getBonusAppliedSum(tid){let s=0;for(const r in state.bonusApplied){const v=state.bonusApplied[r]?.[tid];if(v)s+=v}return s}
function teamBonusUsed(tid){const t=teamObj(tid);return !!(t&&t.bonusCapitaineUsed)}function markTeamBonusUsed(tid){const t=teamObj(tid);if(t)t.bonusCapitaineUsed=true}

/* Capitaine — calcul robuste */
function computeCapitaineBonusForMatch(match, teamId/*, _player, _sport */){
  try{
    let wins = 0;
    const isA = (match.a === teamId), isB = (match.b === teamId);
    if (!isA && !isB) return 0;

    // Fléchettes
    if (Array.isArray(match.darts)) {
      match.darts.forEach(v=>{
        if (v===0 && isA) wins++;
        else if (v===1 && isB) wins++;
      });
    }

    // Ping (0/1 ou score valide ≥11 avec 2 pts d’écart)
    const getPingPts = (m) => Array.isArray(m.ping)
      ? m.ping.map(v => (v===0?{a:1,b:0} : (v===1?{a:0,b:1}:{a:null,b:null})))
      : (Array.isArray(m.pingPts) ? m.pingPts : []);
    const isPingValid = (a,b) => {
      if(a==null||b==null) return false;
      if((a===1&&b===0)||(a===0&&b===1)) return true;
      if(isNaN(a)||isNaN(b)) return false;
      const max=Math.max(a,b), diff=Math.abs(a-b);
      return (max>=11)&&(diff>=2);
    };
    (getPingPts(match) || []).forEach(s=>{
      const a = (s && s.a!=null) ? +s.a : null;
      const b = (s && s.b!=null) ? +s.b : null;
      if (!isPingValid(a,b)) return;
      if (a>b && isA) wins++;
      else if (b>a && isB) wins++;
    });

    // Palet
    const target = +((window.state && state.rules && state.rules.paletTarget) ?? 11);
    const pa = (match.palet && match.palet.a!=null) ? +match.palet.a : null;
    const pb = (match.palet && match.palet.b!=null) ? +match.palet.b : null;
    if (pa!=null && pb!=null){
      if (pa>=target && pa>pb && isA) wins++;
      else if (pb>=target && pb>pa && isB) wins++;
    }

    return 2 * wins;
  }catch(e){ return 0; }
}

/* Melon d’or — ±2 × différence en POINTS sur le sport choisi (1 manche = 5 pts au ping & fléchettes) */

function computeMelonBonusForMatch(m, tid, sport){
  try{
    const isA = (m.a === tid);
    const isB = (m.b === tid);
    if(!isA && !isB) return 0;

    if (sport === 'darts') {
      // Manches gagnées -> points (×5)
      let aw=0, bw=0;
      (m.darts||[]).forEach(v=>{ if(v===0) aw++; else if(v===1) bw++; });
      const myPts  = (isA ? aw : bw) * 5;
      const oppPts = (isA ? bw : aw) * 5;
      if (myPts > oppPts) return myPts;
      if (myPts < oppPts) return -oppPts;
      return 0;
    } else if (sport === 'ping') {
      // Manches gagnées par set -> points (×5)
      let aw=0, bw=0;
      (getPingPts(m) || []).forEach(s=>{
        const a = (s && s.a!=null) ? +s.a : null;
        const b = (s && s.b!=null) ? +s.b : null;
        if (!isPingValid(a,b)) return;
        if (a>b) aw++; else if (b>a) bw++;
      });
      const myPts  = (isA ? aw : bw) * 5;
      const oppPts = (isA ? bw : aw) * 5;
      if (myPts > oppPts) return myPts;
      if (myPts < oppPts) return -oppPts;
      return 0;
    } else { // palet
      const a = (m.palet && m.palet.a!=null) ? +m.palet.a : null;
      const b = (m.palet && m.palet.b!=null) ? +m.palet.b : null;
      if (a==null || b==null) return 0;
      const myPF  = isA ? a : b;
      const oppPF = isA ? b : a;
      // target from rules (fallback to 11)
      const R = (window.state && state.rules) || {};
      const target = +(R.paletTarget ?? 11);
      if (myPF > oppPF) return myPF;                 // victoire => +PF
      if (myPF < oppPF) return - (2 * Math.max(0, target - myPF));  // défaite => -2×(T−PF équipe)
      return 0;
    }
  }catch(e){ return 0; }
}
/* === Recompute all bonuses for finished rounds (used when admin edits scores after closure) === */
function recomputeAllBonuses(){
  try{
    const rounds = (state.matches || []).map(m=>m.round).filter((v,i,a)=>a.indexOf(v)===i).sort((a,b)=>a-b);
    state.bonusApplied = state.bonusApplied || {};
    rounds.forEach(r=>{
      const rs = roundState(r);
      if (!rs || !rs.finished) return;
      const matches = (state.matches || []).filter(m=>m.round===r);
      const sels = (state.bonusSelections && state.bonusSelections[r]) || {};
      // reset applied
      state.bonusApplied[r] = state.bonusApplied[r] || {};
      Object.keys(sels).forEach(tid=>{ state.bonusApplied[r][tid]=0; });

      Object.keys(sels).forEach(tid=>{
        const sel = sels[tid]; if (!sel) return;
        let total = 0;
        if (sel.type === 'capitaine'){
          const m = matches.find(x=>x.a===tid || x.b===tid);
          if (m){
            const oppId = (m.a===tid ? m.b : m.a);
            const oppSel = sels[oppId];
            if (oppSel && oppSel.type === 'miroir'){
              total = 0; // Capitaine transféré : l'effet sera appliqué côté Miroir adverse
            } else {
              matches.forEach(m=>{ total += computeCapitaineBonusForMatch(m, tid, sel.player, sel.sport); });
            }
          } else {
            matches.forEach(m=>{ total += computeCapitaineBonusForMatch(m, tid, sel.player, sel.sport); });
          }
        } else if (sel.type === 'melon'){
          const m = matches.find(x=>x.a===tid || x.b===tid);
          if (m){
            const oppId = (m.a===tid ? m.b : m.a);
            const oppSel = sels[oppId];
            if (oppSel && oppSel.type === 'miroir'){
              total = 0; // sera ajouté côté Miroir
            } else {
              const sport = sel.sport || 'darts';
              total = computeMelonBonusForMatch(m, tid, sport);
            }
          }
        } else if (sel.type === 'miroir'){
          const m = matches.find(x=>x.a===tid || x.b===tid);
          if (m){
            const oppId = (m.a===tid ? m.b : m.a);
            const oppSel = sels[oppId];
            if (oppSel && oppSel.type === 'melon'){
              const sport = oppSel.sport || 'darts';
              total = computeMelonBonusForMatch(m, tid, sport);
            } else if (oppSel && oppSel.type === 'capitaine'){
              // Transfert du Capitaine : applique le calcul Capitaine au camp Miroir
              total = 0;
              total += computeCapitaineBonusForMatch(m, tid, oppSel.player, oppSel.sport);
            }
          }
        }
        state.bonusApplied[r][tid] = total;
      });
    });
  }catch(e){ /* noop */ }
}




/* Icônes pour titres de sport */
function sportIcon(name){
  if(name==='darts'){ return `<span class="sport-icon" role="img" aria-label="fléchettes">🎯</span>`; }
  if(name==='ping'){  return `<span class="sport-icon" role="img" aria-label="ping-pong">🏓</span>`; }
  return `<span class="sport-icon" role="img" aria-label="palet">🥏</span>`;
}

/* ===== Rendu Rencontres ===== */
let CURRENT_ROUND=null;
function setRoundStatusPillClasses(pill,rs){
  pill.classList.remove('red','yellow','green');
  if(rs.finished) pill.classList.add('green');
  else if(rs.started) pill.classList.add('yellow');
  else pill.classList.add('red');
}
function bonusChip(r, mTeam, rs){
  const sel = getBonusSelection(r, mTeam);
  const iAmTeam = hasClaim(mTeam);
  const roundStarted  = !!rs.started;
  const roundFinished = !!rs.finished;

  // Récupère la sélection de l'adversaire pour les règles Miroir
  let oppSel = null;
  try{
    const m = (state.matches || []).find(x => x.round===r && (x.a===mTeam || x.b===mTeam));
    if (m){
      const oppId = (m.a===mTeam ? m.b : m.a);
      oppSel = getBonusSelection(r, oppId) || null;
    }
  }catch(_){}

  // --- Règles de révélation "au démarrage" ---
  // Révéler tout de suite si :
  //  - mon type est taupe/lefthand
  //  - OU je suis Miroir et l’adversaire est taupe/lefthand
  // Bloquer la révélation si Miroir est face à Melon ou Capitaine
  const isTaupeOrLeft   = !!(sel && (sel.type==='taupe' || sel.type==='lefthand'));
  const isMirrorFacingT = !!(sel && sel.type==='miroir' && oppSel && (oppSel.type==='taupe' || oppSel.type==='lefthand'));
  const isMirrorVsMC    = !!(
    (sel && sel.type==='miroir' && oppSel && (oppSel.type==='melon' || oppSel.type==='capitaine')) ||
    (sel && (sel.type==='melon' || sel.type==='capitaine') && oppSel && oppSel.type==='miroir')
  );

  const revealAtStart = roundStarted && !roundFinished && !isMirrorVsMC && (isTaupeOrLeft || isMirrorFacingT);

  // --- Visibilité admin ---
  // Avant la fin : l’admin ne voit RIEN sauf si revealAtStart (règle ci-dessus).
  if (!roundFinished && isAdmin() && !revealAtStart) return '';

  // --- Aucune sélection ---
  const bonusUsed = (state.bonusUsed?.[r]?.[mTeam]) || false;
  const canChoose = (!rs.started && !rs.finished && !bonusUsed && iAmTeam);
  if (!sel) {
    if (!roundFinished) {
      return canChoose ? (
        '<button type="button" class="bonus-btn" data-bonus data-team="' + mTeam + '">🎖 Bonus</button>'
      ) : '';
    }
    return '<span class="pill">Pas de bonus</span>';
  }

  // --- Sélection faite, visibilité côté équipes/visiteurs ---
  // Avant la fin : visible seulement si (je suis l’équipe) OU (révélation autorisée au démarrage)
  if (!roundFinished && !(iAmTeam || revealAtStart)) return '';

  const type = sel.type || 'capitaine';
  const lblType =
    type === 'miroir'   ? 'Miroir' :
    type === 'taupe'    ? 'René la taupe' :
    type === 'lefthand' ? '10 pouces 2 mains gauche' :
    type === 'melon'    ? 'Melon d\'or' :
                          'Capitaine';

  const img =
    type === 'miroir'   ? 'miroir.jpg' :
    type === 'taupe'    ? 'taupe.png' :
    type === 'lefthand' ? 'main-gauche.png' :
    type === 'melon'    ? 'melon.png' :
                          'capitaine.jpg';

  const labelSport = sel.sport ? BONUS.sportLabel(sel.sport) : null;
  const sportEmoji = (labelSport === 'Fléchettes' ? '🎯' :
                     labelSport === 'Ping'        ? '🏓' :
                     labelSport === 'Palet'       ? '🥏' : '');
  const labelPlayer = sel.player === 'p1' ? 'J1' : (sel.player === 'p2' ? 'J2' : null);

  if (!roundFinished) {
    // Pastille d’aperçu (sans valeur) avant la fin, quand visible
    var parts = [lblType];
    if (labelPlayer && type === 'capitaine') parts.push(labelPlayer);
    if (labelSport && (type==='taupe' || type==='lefthand' || type==='melon')) parts.push(labelSport);
    var __lbl = parts.join(' / ');
    return '<span class="pill pill--blue">Bonus' + (sportEmoji?('<span class="sport-emo">'+sportEmoji+'</span>'):'') +
           '<span class="mini-bonus"><img src="img/' + img + '" alt="' + __lbl + '"></span>' +
           '</span>';
  } else {
    // Révélation complète + total appliqué (logique existante inchangée)
    const applied = Math.abs((state.bonusApplied?.[r]?.[mTeam]) || 0);
    const sign = ((state.bonusApplied?.[r]?.[mTeam]) || 0) >= 0 ? '+' : '−';
    const valClass = ((state.bonusApplied?.[r]?.[mTeam]) || 0) >= 0 ? 'pos' : 'neg';
    const extra = (
      type === 'capitaine' ? (labelPlayer ? (' / ' + labelPlayer) : '') :
      ((type==='taupe' || type==='lefthand' || type==='melon') && labelSport ? (' / ' + labelSport) : '')
    );
    const desc = (
      type==='miroir'   ? 'Inverse le bonus adverse sur tout le match.' :
      type==='taupe'    ? 'Lunettes gênantes imposées à l\u2019adversaire (sport choisi).' :
      type==='lefthand' ? 'L\u2019adversaire joue un sous\u2011match avec sa mauvaise main (sport choisi).' :
      type==='melon'    ? 'Match au sport choisi : +5/manche gagnée (fléchettes & ping, différence appliquée). Palet : +PF si victoire, sinon −2×(11−PF).' :
                          'Aucun réglage. +2/manche gagnée (fléchettes & ping, simples/doubles) et +2 si palet.'
    );
    return '<span class="pill bonus-flashy ' + valClass + '" aria-label="' + lblType + '">' +
       'Bonus' +
       '<span class="mini-bonus"><img src="img/' + img + '" alt="' + lblType + '"></span>' +
       (sportEmoji?('<span class="sport-emo">'+sportEmoji+'</span>'):'') +
       '<span class="' + valClass + '">'+ sign + applied + '</span>' +
       '<span class="bonus-pop">' +
         '<img src="img/' + img + '" alt="' + lblType + '">' +
         '<strong>' + lblType + '</strong>' +
         (labelSport ? '<div class="muted">Sport : ' + labelSport + '</div>' : '') +
         '<div class="desc">' + desc + '</div>' +
       '</span>' +
       '</span>';
  }
}

// === In-place update of the match completeness chip ===
function updateMatchCompleteness(mid){
  const m = (state.matches || []).find(x => x.id === mid);
  if(!m) return;
  const card = document.querySelector('.match-card[data-id="'+mid+'"]');
  if(!card) return;
  const chip = card.querySelector('.state-chip');
  if(!chip) return;

  const done = uiIsComplete(m);
  chip.textContent = done ? 'Complet' : 'Incomplet';
  chip.classList.remove('ok','warn');
  chip.classList.add(done ? 'ok' : 'warn');
  if(!done){
    chip.classList.add('pulse');
    setTimeout(()=>chip.classList.remove('pulse'), 700);
  }
  card.setAttribute('data-complete', done ? 'true' : 'false');
}
    
function renderMatches(){
  if (typeof recomputeAllBonuses==='function') recomputeAllBonuses();
  const list=id("match-list");list.innerHTML="";
  if(!state.matches.length){list.appendChild(help("Aucune rencontre planifiée."));id("stats-matches").textContent="0 / 0 matches complets";id("round-status").textContent="—";id("btn-start-round").style.display="none";id("btn-end-round").style.display="none";return}
  const groups={};state.matches.forEach(m=>(groups[m.round]=groups[m.round]||[]).push(m));
  const rounds=Object.keys(groups).map(Number).sort((a,b)=>a-b);
  CURRENT_ROUND = rounds.find(r=>!roundState(r).finished) ?? rounds[rounds.length-1];
  const rs=roundState(CURRENT_ROUND);
  const roundPill=id("round-status");
  roundPill.textContent=`Journée active : #${CURRENT_ROUND} — ${rs.finished?'Terminée':(rs.started?'En cours':'Préparation')}`;
  roundPill.classList.remove('red','yellow','green');
  setRoundStatusPillClasses(roundPill,rs);
  id("btn-start-round").style.display=(isAdmin()&&!rs.started&&!rs.finished)?'inline-block':'none';
  id("btn-end-round").style.display  =(isAdmin()&& rs.started&&!rs.finished)?'inline-block':'none';

  let complete=0, idx=0;
  rounds.forEach(r=>{
    const rCtl=roundState(r);
    const badgeClass = rCtl.finished ? 'green' : (rCtl.started ? 'yellow' : 'red');const hdr=document.createElement("div");hdr.className="round-head";hdr.innerHTML=`<span class="round-title">Journée ${r}</span> <span class="chip round-chip ${badgeClass}">#${r}</span>`;list.appendChild(hdr);
    const roundWrap=document.createElement("div");roundWrap.className="round-grid";list.appendChild(roundWrap);
    

    groups[r].forEach(m=>{
      ensureLengths(m);
      const wins=computeSetWins(m),pal=m.palet,palScore=(pal.a!=null&&pal.b!=null)?hy(pal.a,pal.b):"—";
      const palChip = `<span class="chip">🥏 <span class="score-compact">${palScore}</span></span>`;
      const done = uiIsComplete(m);if(done)complete++;
      const el=document.createElement("div");el.setAttribute("data-id",m.id);el.setAttribute("data-complete",uiIsComplete(m)?"true":"false");el.className="match-card";el.dataset.id=m.id;const isOpen=!!ui.open[m.id];el.setAttribute("aria-expanded",isOpen?"true":"false");
      const bonusA=bonusChip(r,m.a,rCtl), bonusB=bonusChip(r,m.b,rCtl);
      const totalA = (wins.aw.darts*5 + wins.aw.ping*5 + (m.palet?.a ?? 0) + ((state.bonusApplied?.[r]?.[m.a]) || 0));
      const totalB = (wins.bw.darts*5 + wins.bw.ping*5 + (m.palet?.b ?? 0) + ((state.bonusApplied?.[r]?.[m.b]) || 0));
      const aWinGold = (rCtl.finished && done && totalA>totalB) ? ' is-winner-gold' : '';
      const bWinGold = (rCtl.finished && done && totalB>totalA) ? ' is-winner-gold' : '';

      el.innerHTML=`<div class="hd" data-expand>
    <div class="scorewrap">
      <!-- Rail gauche : #Journée -->
      <div class="left-rail">
        <span class="chip round-chip ${badgeClass}">#${r}</span>
      </div>

      <!-- Centre : équipes verticales + score général + scores par sport -->
      <div class="centerlane" style="width:100%">
        <div class="teams-row">
          <div class="team left">
            ${avatarHtml(m.a,'sm').replace('class="avatar','class="avatar'+aWinGold)}
            <div class="name">${esc(teamName(m.a))}</div>
            <div class="bonus-line">${bonusA || ''}</div>
          </div>

          <div class="score"><span class="scorebox a">${(wins.aw.darts*5 + wins.aw.ping*5 + (m.palet?.a ?? 0) + ((state.bonusApplied?.[r]?.[m.a]) || 0))}</span><span class="scorebox b">${(wins.bw.darts*5 + wins.bw.ping*5 + (m.palet?.b ?? 0) + ((state.bonusApplied?.[r]?.[m.b]) || 0))}</span></div>

          <div class="team right">
            ${avatarHtml(m.b,'sm').replace('class="avatar','class="avatar'+bWinGold)}
            <div class="name">${esc(teamName(m.b))}</div>
            <div class="bonus-line">${bonusB || ''}</div>
          </div>
        </div>

        <div class="sports-row">
          <span class="chip">🎯 <span class="score-compact">${hy(wins.aw.darts*5, wins.bw.darts*5)}</span></span>
          <span class="chip">🏓 <span class="score-compact">${hy(wins.aw.ping*5, wins.bw.ping*5)}</span></span>
          ${palChip}
        </div>
      </div>

      
      <!-- État de complétude -->
      <div class="right-rail">
        <span class="chip state-chip ${uiIsComplete(m)?'ok':'warn'}">
          ${uiIsComplete(m)?'Complet':'Incomplet'}
        </span>
      </div>

      <!-- chevron à droite -->
      <span class="chev" aria-hidden="true"></span>
    </div>
  </div>
  <div class="bd">
          <div class="match-two-col">
            ${renderDarts(m)}${renderPing(m)}
          </div>
          ${renderPalet(m)}
          <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px">
            <div class="help">La saisie nécessite d’être connecté·e à une des deux équipes (ou admin).</div>
            <div>${(isAdmin())?`<button type="button" class="btn small" data-clear="${m.id}">Effacer ce match</button>`:''}</div>
          </div>
        </div>`;
      roundWrap.appendChild(el);

      // darts
      qsa('.match-card[data-id="'+m.id+'"] select[data-kind="darts"]').forEach(sel=>{
        const can=(isAdmin()); sel.disabled=!(can && canEditScores(m,rCtl));
        sel.addEventListener("change",()=>{const i=parseInt(sel.getAttribute("data-index"),10),v=sel.value===""?null:parseInt(sel.value,10);const mm=findMatch(m.id);mm.darts[i]=v;window.logEvent('darts_set',{index:i,team:(v===0?m.a:m.b)});saveState();updateMatchCompleteness(m.id);renderMatches();renderLeaderboard();renderH2H()});
      });
      // ping
      
      // ping (vainqueur A/B)
      qsa('.match-card[data-id="'+m.id+'"] select[data-kind="ping"]').forEach(sel=>{
        const can = (isAdmin());
        sel.disabled = !(can && canEditScores(m, rCtl));
        sel.addEventListener("change", ()=>{
          const i  = parseInt(sel.getAttribute("data-index"),10);
          const vv = sel.value==="" ? null : parseInt(sel.value,10);
          const mm = findMatch(m.id);
          if (!Array.isArray(mm.ping)) mm.ping = [];
          const TOTAL = 3;
          
          while(mm.ping.length < TOTAL) mm.ping.push(null);
          mm.ping[i]=vv;window.logEvent('ping_set',{index:i,team:(vv===0?m.a:m.b)});saveState();
updateMatchCompleteness(m.id);

          renderMatches();
          renderLeaderboard();
          renderH2H();
        });
      });

      // palet
      qsa('.match-card[data-id="'+m.id+'"] input[data-palet]').forEach(inp=>{
        const can=(isAdmin()); inp.disabled=!(can && canEditScores(m,rCtl));
        const mid=m.id,which=inp.getAttribute("data-palet");
        const updateNote=()=>{const mm=findMatch(mid),T=+state.rules.paletTarget||11,a=(mm.palet?.a==null?null:+mm.palet?.a),b=(mm.palet?.b==null?null:+mm.palet?.b);const ok=(a!=null&&b!=null)&&((a===T&&b>=0&&b<=T-1)||(b===T&&a>=0&&a<=T-1));const note=qs('.match-card[data-id="'+mid+'"] [data-note="pal-'+mid+'"]');if(note)note.textContent=ok?'✔️ Score valide':`Saisissez les deux scores (l’un doit être ${T}).`}
        inp.addEventListener("input",()=>{const v=inp.value===""?null:clampInt(parseInt(inp.value,10),0,state.rules.paletTarget||11);const mm=findMatch(mid);mm.palet[which]=v;window.logScoreUpdate(which==='a'?m.a:m.b,'palet',v);saveState();updateNote()});
        const commit=()=>{const mm=findMatch(mid);const v=inp.value===""?null:clampInt(parseInt(inp.value,10),0,state.rules.paletTarget||11);mm.palet[which]=v;window.logScoreUpdate(which==='a'?m.a:m.b,'palet',v);saveState();updateMatchCompleteness(m.id);renderMatches();renderLeaderboard();renderH2H()};
        inp.addEventListener("change",commit);inp.addEventListener("blur",commit);inp.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();inp.blur()}})
      });

      const clr=qs('.match-card[data-id="'+m.id+'"] [data-clear]');if(clr)clr.addEventListener("click",()=>clearMatch(m.id));
      const head=qs('.match-card[data-id="'+m.id+'"] [data-expand]');if(head)head.addEventListener("click",()=>{const open=el.getAttribute("aria-expanded")==="true";el.setAttribute("aria-expanded",open?"false":"true");ui.open[m.id]=!open});
      qsa('.match-card[data-id="'+m.id+'"] [data-bonus]').forEach(b=>b.addEventListener('click',()=>openBonusModal(r,b.getAttribute('data-team'))));
    });
  });
  id("stats-matches").textContent=complete+" / "+state.matches.length+" matches complets";
  renderLeaderboard();
}

/* ---- Rendu des 3 sports (relookés) ---- */
function renderDarts(m){
  const s = state.rules.dartsSingles, N = dartsTotal();
  let html = '<div class="sport-group">'
    + '<div class="sport-title"><span class="sport-icon">' + sportIcon('darts') + '</span> Fléchettes</div>';
  for (let i=0; i<N; i++){
    const v = m.darts[i];
    const lab = (i < s ? ('Simple ' + (i+1)) : ('Double ' + (i - s + 1)));
    html += '<div class="sport-item">'
      + '<label>' + lab + '</label>'
      + '<select data-kind="darts" data-index="' + i + '">'
      + '<option value="" ' + (v===null ? 'selected' : '') + '>Non joué</option>'
      + '<option value="0" ' + (v===0 ? 'selected' : '') + '>Victoire ' + esc(teamName(m.a)) + '</option>'
      + '<option value="1" ' + (v===1 ? 'selected' : '') + '>Victoire ' + esc(teamName(m.b)) + '</option>'
      + '</select>'
      + '</div>';
  }
  html += '</div>';
  return html;
}
function renderPing(m){
  const sSingles = state.rules.pingSingles || 0;
  const sDoubles = state.rules.pingDoubles || 0;
  const total = sSingles + sDoubles;
  const rCtl = roundState(m.round || 1); // état de la journée

  if (!Array.isArray(m.ping)) m.ping = [];
  m.ping = m.ping.slice(0, total);
  while (m.ping.length < total) m.ping.push(null);

  let html = '<div class="sport-group">'
    + '<div class="sport-title"><span class="sport-icon">' + sportIcon('ping') + '</span> Ping-pong</div>';

  for (let i=0; i<total; i++){
    // Valeur affichée : par défaut "Non joué". Si la journée n'est pas démarrée, on force l'affichage à "Non joué".
    const raw = (m.ping[i]===0 || m.ping[i]===1) ? m.ping[i] : null;
    const v = raw;
    const label = (i < sSingles) ? ('Simple ' + (i+1)) : ('Double ' + (i - sSingles + 1));
    html += '<div class="sport-item">'
      + '<label class="muted">' + label + '</label>'
      + '<select data-kind="ping" data-index="' + i + '">'
      + '<option value="" ' + (v===null ? 'selected' : '') + '>Non joué</option>'
      + '<option value="0" ' + (v===0 ? 'selected' : '') + '>Victoire ' + esc(teamName(m.a)) + '</option>'
      + '<option value="1" ' + (v===1 ? 'selected' : '') + '>Victoire ' + esc(teamName(m.b)) + '</option>'
      + '</select>'
      + '</div>';
  }
  html += '</div>';
  return html;
}
function renderPalet(m){
  const T = +state.rules.paletTarget || 11;
  const a = (m.palet?.a==null?null:+m.palet?.a),
        b = (m.palet?.b==null?null:+m.palet?.b);
  const ok = (a!=null&&b!=null)&&((a===T&&b>=0&&b<=T-1)||(b===T&&a>=0&&a<=T-1));
  return `<div class="sport-group" style="margin-top:16px">
    <div class="sport-title"><span class="sport-icon">${sportIcon('palet')}</span> Palet</div>
    <div class="ping-row">
      <div>
        <label class="muted">${esc(teamName(m.a))}</label>
        <input type="number" min="0" max="${T}" step="1"
               value="${a==null?'':a}" data-palet="a">
      </div>
      <div>
        <label class="muted">${esc(teamName(m.b))}</label>
        <input type="number" min="0" max="${T}" step="1"
               value="${b==null?'':b}" data-palet="b">
      </div>
    </div>
    <div class="help" data-note="pal-${m.id}">${ok?'✔️ Score valide':`Saisissez les deux scores (l’un doit être ${T}).`}</div>
  </div>`;
}

/* ===== Classement ===== */
function baseLeaderboardStats(){const R=state.rules,stats={};state.teams.forEach(t=>stats[t.id]={teamId:t.id,name:t.name,avatar:t.avatar||null,pointsBase:0,bonus:0,malus:0,dartsW:0,pingW:0,palFor:0,palAg:0,matchesComplete:0});state.matches.forEach(m=>{const A=stats[m.a],B=stats[m.b];ensureLengths(m);m.darts.forEach(v=>{if(v===0){A.dartsW++;A.pointsBase+=R.dartsWinPoints}else if(v===1){B.dartsW++;B.pointsBase+=R.dartsWinPoints}});getPingPts(m).forEach(s=>{const a=(s.a==null?null:+s.a),b=(s.b==null?null:+s.b);if(isPingValid(a,b)){if(a>b){A.pingW++;A.pointsBase+=R.pingWinPoints}else if(b>a){B.pingW++;B.pointsBase+=R.pingWinPoints}}});const pa=(m.palet?.a==null?null:+m.palet?.a),pb=(m.palet?.b==null?null:+m.palet?.b);if(pa!=null&&pb!=null){A.palFor+=pa;B.palFor+=pb;A.palAg+=pb;B.palAg+=pa;A.pointsBase+=pa;B.pointsBase+=pb}if(isMatchComplete(m)){A.matchesComplete++;B.matchesComplete++}});Object.keys(state.bonusApplied||{}).forEach(r=>{const per=state.bonusApplied[r];Object.keys(per).forEach(tid=>{const v=per[tid]||0;if(stats[tid])stats[tid].bonus+=v})});return stats}
function computeLeaderboard(){const stats=baseLeaderboardStats();const rows=Object.values(stats).map(x=>({teamId:x.teamId,name:x.name,avatar:x.avatar,points:x.pointsBase+x.bonus-x.malus,bonus:x.bonus,malus:x.malus,dartsW:x.dartsW,pingW:x.pingW,palFor:x.palFor,palAg:x.palAg,matchesComplete:x.matchesComplete}));rows.sort((x,y)=>(y.points-x.points)||((y.palFor-y.palAg)-(x.palFor-x.palAg))||((y.dartsW+y.pingW)-(x.dartsW+x.pingW))||x.name.localeCompare(y.name));rows.forEach((r,i)=>r.rank=i+1);return rows}

function renderLeaderboard(){
  if (typeof recomputeAllBonuses==='function') recomputeAllBonuses();
  const tbody = qs("#table-classement tbody");
  if (!tbody) return;
  tbody.innerHTML = "";

  const teams = state.teams.slice();
  const rows = teams.map(t => {
    const tid = t.id;
    let dartsPF=0, dartsPA=0, pingPF=0, pingPA=0, palPF=0, palPA=0, pts=0, matchesComplete=0;

    state.matches.forEach(m => {
      if (m.a!==tid && m.b!==tid) return;
      const isA = (m.a===tid);

      // Points totaux (base + bonus appliqué)
      if (typeof pointsForTeamInMatch === 'function') {
        pts += pointsForTeamInMatch(m, tid) || 0;
      }

      // Stat fléchettes (manches gagnées → points ×5)
      if (Array.isArray(m.darts)) {
        let aw=0, bw=0;
        m.darts.forEach(v=>{ if(v===0) aw++; else if(v===1) bw++; });
        dartsPF += (isA ? aw : bw) * 5;
        dartsPA += (isA ? bw : aw) * 5;
      }

      // Stat ping (manches gagnées → points ×5)
      if (typeof getPingPts === 'function') {
        let aw=0, bw=0;
        (getPingPts(m) || []).forEach(s=>{
          const a = (s && s.a!=null) ? +s.a : null;
          const b = (s && s.b!=null) ? +s.b : null;
          if (!isPingValid(a,b)) return;
          if (a>b) aw++; else if (b>a) bw++;
        });
        pingPF += (isA ? aw : bw) * 5;
        pingPA += (isA ? bw : aw) * 5;
      }

      // Stat palet (PF/PA)
      if (m.palet && m.palet.a!=null && m.palet.b!=null) {
        palPF += isA ? (+m.palet.a||0) : (+m.palet.b||0);
        palPA += isA ? (+m.palet.b||0) : (+m.palet.a||0);
      }

      // Match complet ?
      if (typeof isMatchComplete === 'function' && isMatchComplete(m)) matchesComplete++;
    });

    // Bonus/Malus cumulés (toutes journées)
    let bonusPos=0, malusNeg=0;
    const BA = state.bonusApplied || {};
    Object.keys(BA).forEach(r => {
      const v = (BA[r] && BA[r][tid]) || 0;
      if (v>0) bonusPos += v;
      else if (v<0) malusNeg += (-v);
    });

    return {
      id: tid,
      name: t.name,
      avatar: t.avatar,
      points: pts,
      dartsPF, dartsPA, pingPF, pingPA, palPF, palPA,
      bonusPos, malusNeg, matchesComplete
    };
  });

  rows.sort((a,b)=> b.points - a.points || a.name.localeCompare(b.name));

  rows.forEach((r,i)=>{
    const avatar = avatarHtml ? avatarHtml(r.id, 22, '') : '';
    const diffPal = r.palPF - r.palPA;
    const signPal = diffPal>=0?'+':'';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${(()=>{const total=rows.length;const last= (i===total-1);
  if(i===0) return '🥇';
  if(i===1) return '🥈';
  if(i===2) return '🥉';
  if(last) return '💩';
  if(i===3) return '😭';
  return (i+1);
})()}</td>
      <td><span class="team-name">${avatar} ${esc(r.name||'')}</span></td>
      <td class=\"points-cell\"><span class="points-pill"><b>${r.points}</b></span></td>
      <td>${r.dartsPF}</td>
      <td>${r.pingPF}</td>
      <td>${r.palPF}-${r.palPA} <span class="muted">(${signPal}${diffPal})</span></td>
      <td>${r.bonusPos?`<span class="pos">+${r.bonusPos}</span>`:'0'}</td>
      <td>${r.malusNeg?`<span class="neg">-${r.malusNeg}</span>`:'0'}</td>
      <td>${r.matchesComplete}</td>
    `;
    tbody.appendChild(tr);
  });
}


/* ===== H2H ===== */

function pointsForTeamInMatch(m, tid){
  // Total de points marqués par l'équipe dans ce match (toutes disciplines) + bonus appliqué
  const isA = (m.a === tid);
  let pts = 0;

  // Fléchettes : 1 manche gagnée = 5 points
  if (Array.isArray(m.darts)) {
    let aw=0, bw=0;
    m.darts.forEach(v=>{ if(v===0) aw++; else if(v===1) bw++; });
    pts += (isA ? aw : bw) * 5;
  }

  // Ping : 1 manche gagnée = 5 points (on compte les manches gagnées par set)
  if (typeof getPingPts === 'function') {
    let aw=0, bw=0;
    (getPingPts(m) || []).forEach(s=>{
      const a = (s && s.a!=null) ? +s.a : null;
      const b = (s && s.b!=null) ? +s.b : null;
      if (!isPingValid(a,b)) return;
      if (a>b) aw++; else if (b>a) bw++;
    });
    pts += (isA ? aw : bw) * 5;
  }

  // Palet : score direct
  if (m.palet && m.palet.a!=null && m.palet.b!=null){
    pts += isA ? (+m.palet.a||0) : (+m.palet.b||0);
  }

  // Bonus appliqué sur la journée du match
  const applied = (state.bonusApplied?.[m.round]?.[tid]) || 0;
  return pts + applied;
}

function renderH2H(){const thead=qs("#table-h2h thead"),tbody=qs("#table-h2h tbody");thead.innerHTML="";tbody.innerHTML="";const teams=state.teams.slice();if(!teams.length){tbody.appendChild(help("Ajoutez des équipes pour voir la matrice."));return}const trH=document.createElement("tr");trH.appendChild(document.createElement("th")).textContent="Équipe";teams.forEach(t=>{const th=document.createElement("th");th.innerHTML='<span class="team-name">'+avatarHtml(t.id,'sm')+esc(t.name)+'</span>';trH.appendChild(th)});thead.appendChild(trH);const byPair={};state.matches.forEach(m=>{byPair[[m.a,m.b].sort().join("|")]=m});teams.forEach(ti=>{const tr=document.createElement("tr");const th=document.createElement("th");th.innerHTML='<span class="team-name">'+avatarHtml(ti.id,'sm')+esc(ti.name)+'</span>';tr.appendChild(th);teams.forEach(tj=>{const td=document.createElement("td");if(ti.id===tj.id){td.textContent="—";tr.appendChild(td);return}const m=byPair[[ti.id,tj.id].sort().join("|")];if(!m){td.innerHTML='<span class="chip">—</span>';tr.appendChild(td);return}const pI=pointsForTeamInMatch(m,ti.id),pJ=pointsForTeamInMatch(m,tj.id);let cls="h2h-draw",icon="≡";if(pI>pJ){cls="h2h-win";icon="✔"}else if(pI<pJ){cls="h2h-loss";icon="✖"}td.innerHTML='<span class="h2h-pill '+cls+'">'+icon+' <span class="score-compact">'+hy(pI,pJ)+'</span></span>';td.style.cursor="pointer";td.dataset.matchId=m.id;tr.appendChild(td)});tbody.appendChild(tr)});tbody.addEventListener("click",e=>{let n=e.target;while(n&&n!==tbody&&!(n.tagName==="TD"&&n.dataset.matchId))n=n.parentNode;if(!n||n===tbody)return;goto("calendrier");ui.open[n.dataset.matchId]=true;setTimeout(()=>{const card=qs('.match-card[data-id="'+n.dataset.matchId+'"]');if(card){card.setAttribute("aria-expanded","true");card.scrollIntoView({behavior:"smooth",block:"start"})}},0)})}

/* ===== Tabs & clicks ===== */
function guardTab(t){const no=(!cloud.enabled&&!state.cloudId);return(t==='equipes'||t==='calendrier'||t==='classement'||t==='options')&&(no&&state.teams.length===0)}
function goto(tabId){if(guardTab(tabId)){showToast("Aucun tournoi ouvert. Créez ou rejoignez un code Cloud.");tabId='setup'}qsa(".tab").forEach(b=>b.setAttribute("aria-selected","false"));const b=qs('.tab[data-tab="'+tabId+'"]');if(b)b.setAttribute("aria-selected","true");qsa("main section").forEach(s=>s.classList.remove("active"));id(tabId).classList.add("active")}

document.addEventListener("click",async(e)=>{
  const btn=e.target.closest("button");if(btn){switch(btn.id){
    case "btn-fullscreen":(document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen())?.catch?.(()=>{});break;

    /* --- ADMIN : activation => re-render immédiat --- */
    case "btn-admin-on-setup":
    case "btn-admin-on":{const pin=prompt("PIN administrateur :");if(pin==="30041991"){session.admin=true;session.claims={};updateWho();renderAll();showToast("Mode administrateur activé (déconnexion des équipes sur cet appareil).")}else showToast("PIN incorrect.");break}
    case "btn-admin-off":{session.admin=false;updateWho();renderAll();break}

    case "btn-create-tournament":{if(!isAdmin()){const pin=prompt("PIN administrateur :");if(pin!=="30041991")return alert("PIN incorrect.");session.admin=true;session.claims={};updateWho();renderAll()}const code=(id("tcode-input").value||"").trim();if(!code)return alert("Code cloud obligatoire.");const name=(id("tname-input").value||"").trim()||"Tournoi";if(nameExistsLocally(name))return alert("Un tournoi portant ce nom existe déjà dans cette liste.");if(codeExistsLocally(code))return alert("Ce code cloud existe déjà dans votre liste.");const exists=await(async()=>{try{const db=cloud.db||initFB();if(!db)return false;const ref=db.ref("tournaments/"+code+"/payload");const snap=await ref.get?.()??await new Promise(res=>ref.once('value',res));return !!(snap&&snap.exists&&snap.exists())}catch(_){return false}})();if(exists)return alert("Ce code cloud existe déjà sur le serveur. Choisissez-en un autre.");const n=clampInt(id("teams-count-input").value,2,64);const R={dartsSingles:clampInt(id("rule-d-s").value,0,9),dartsDoubles:clampInt(id("rule-d-d").value,0,9),dartsWinPoints:clampInt(id("rule-d-p").value,1,50),pingSingles:clampInt(id("rule-p-s").value,0,9),pingDoubles:clampInt(id("rule-p-d").value,0,9),pingWinPoints:clampInt(id("rule-p-p").value,1,50),paletTarget:clampInt(id("rule-l-target").value,1,50),
  bonusMaxPerTeam: clampInt(id("rule-bonus-max").value,0,50),};joinCloud(code);state={version:40,tid:uid(),cloudId:code,tournamentName:name,rules:R,teams:Array.from({length:n},(_,i)=>({id:uid(),name:"Équipe "+(i+1),p1:"",p2:"",avatar:null,bonusCapitaineUsed:false})),matches:[],locked:false,createdAt:new Date().toISOString(),protect:{teamPassHash:{}},roundCtl:{},bonusSelections:{},bonusApplied:{}};saveState();pushCloud(true);renderAll();goto("equipes");break}
    case "btn-join-code":{const code=(id("join-code").value||"").trim();if(!code)return alert("Renseigne un code.");joinCloud(code);goto("equipes");break}
    case "btn-copy-link":{const code=(id("join-code").value||id("tcode-input").value||state.cloudId||"").trim();if(!code)return alert("Aucun code.");const url=location.origin+location.pathname+"?id="+encodeURIComponent(code);navigator.clipboard?.writeText(url);showToast("Lien copié !\n"+url);break}

    case "btn-add-team":{if(!isAdmin())return alert("Réservé à l’admin.");if(state.locked)return alert("Calendrier figé.");state.teams.push({id:uid(),name:"Équipe "+(state.teams.length+1),p1:"",p2:"",avatar:null,bonusCapitaineUsed:false});saveState();renderTeams();break}
    case "btn-generate":{if(!isAdmin())return alert("Seul l’admin peut générer.");if(state.locked)return;generateSchedule();state.locked=true;saveState();renderAll();goto("calendrier");break}

    case "btn-refresh-standings":
    case "btn-refresh-standings-2":{renderLeaderboard();renderH2H();if(btn.id==="btn-refresh-standings-2")goto("classement");break}
    case "btn-show-summary":{id("view-summary").style.display="block";id("view-h2h").style.display="none";id("btn-show-summary").setAttribute("aria-pressed","true");id("btn-show-h2h").setAttribute("aria-pressed","false");break}
    case "btn-show-h2h":{id("view-summary").style.display="none";id("view-h2h").style.display="block";id("btn-show-summary").setAttribute("aria-pressed","false");id("btn-show-h2h").setAttribute("aria-pressed","true");break}
    case "btn-collapse":{qsa('#match-list .match-card').forEach(c=>c.setAttribute('aria-expanded','false'));ui.open={};break}

    case "btn-export":{const data=JSON.stringify(state,null,2);const url=URL.createObjectURL(new Blob([data],{type:"application/json"}));const a=document.createElement("a");a.href=url;a.download=("tournoi-"+(state.tournamentName||"TriSports")).replace(/\s+/g,'_')+".json";a.click();URL.revokeObjectURL(url);break}
    case "btn-import":{const f=id("file-import").files?.[0];if(!f)return alert("Sélectionnez un fichier JSON.");f.text().then(t=>{try{const data=JSON.parse(t);state=data;normalize();saveState();renderAll();showToast("Import réussi !")}catch(_){showToast("Fichier invalide.")}});break}

    case "btn-cloud-copy":{const code=state.cloudId||cloud.id;if(!code)return alert("Pas de code cloud.");const url=location.origin+location.pathname+"?id="+encodeURIComponent(code);navigator.clipboard?.writeText(url);showToast("Lien copié !\n"+url);break}
    case "btn-cloud-delete":{if(!isAdmin())return alert("Suppression cloud réservée à l’admin.");const code=state.cloudId||cloud.id;if(!code)return alert("Aucun code actif.");if(!confirm("Supprimer définitivement ce tournoi du cloud ?"))return;deleteCloud(code).then(()=>{setIndex(getIndex().filter(e=>e.id!==code));unsubscribeCloud();resetState();renderSetupRecent();renderAll();history.replaceState(null,"",location.pathname);showToast("Tournoi supprimé.");goto('setup')});break}

    /* ---- Réinitialiser scores => réinitialise aussi BONUS + journées ---- */
    case "btn-reset-scores":{
      if (!isAdmin()) return alert("Réservé à l’admin.");
      if (!confirm("Réinitialiser les SCORES et les BONUS ?")) return;
      (state.matches || []).forEach(m=>{
        m.darts = Array(dartsTotal()).fill(null);
        m.ping  = Array(pingTotal()).fill(null);
        m.pingPts = Array(pingTotal()).fill({a:null,b:null});
        m.palet = { a:null, b:null };
      });
      state.roundCtl = {};
      state.bonusSelections = {};
      state.bonusApplied = {};
      state.bonusUsed = {};
      (state.teams||[]).forEach(t=>{ if(t) t.bonusCapitaineUsed=false; });
      saveState();
      renderAll();
      goto("calendrier");
      break}

    case "btn-unlock":{if(!isAdmin())return alert("Réservé à l’admin.");if(!confirm("Déverrouiller le calendrier ?"))return;state.locked=false;saveState();renderTeams();renderMatches();updateLock();break}

    case "btn-start-round":{if(!isAdmin())return;const r=CURRENT_ROUND,rs=roundState(r);if(rs.started||rs.finished)return;rs.started=true;saveState();renderMatches();showToast("Journée #"+r+" démarrée — bonus verrouillés.");break}

    /* ---- Fin de journée : blocage si incomplet + bonus appliqués ---- */
    case "btn-end-round": {
      if (!isAdmin()) return;
      const r  = CURRENT_ROUND;
      const rs = roundState(r);
      if (!rs.started || rs.finished) return;

      const matchesOfRound = state.matches.filter(m => m.round === r);
      const incomplets = matchesOfRound.filter(m => !isMatchComplete(m));
      if (incomplets.length) { showToast(`Impossible de terminer la journée #${r} : ${incomplets.length} match(s) incomplet(s).`); return; }

      
      
      const sels = state.bonusSelections[r] || {};
      Object.keys(sels).forEach(tid=>{
        const sel = sels[tid]; if (!sel) return;
        if ((state.bonusUsed?.[r]?.[tid])) { setBonusApplied(r, tid, 0); return; }
        let total = 0;

        if (sel.type === 'capitaine') {
          matchesOfRound.forEach(m=>{ total += computeCapitaineBonusForMatch(m, tid, sel.player, sel.sport); });
        } else if (sel.type === 'melon') {
          const m = matchesOfRound.find(x => x.a===tid || x.b===tid);
          if (m){
            const oppId = (m.a===tid ? m.b : m.a);
            const oppSel = sels[oppId];
            if (oppSel && oppSel.type === 'miroir') {
              // Melon se retourne : rien pour l'équipe Melon, Miroir prendra le total dans sa propre branche
              total = 0;
            } else {
              const sport = sel.sport || 'darts';
              total = computeMelonBonusForMatch(m, tid, sport);
            }
          }
        } else if (sel.type === 'miroir') {
          const m = matchesOfRound.find(x => x.a===tid || x.b===tid);
          if (m){
            const oppId = (m.a===tid ? m.b : m.a);
            const oppSel = sels[oppId];
            if (oppSel && oppSel.type === 'melon') {
              // Miroir récupère le Melon d’or de l’adversaire, même sport
              const sport = oppSel.sport || 'darts';
              total = computeMelonBonusForMatch(m, tid, sport);
            } else {
              total = 0;
            }
          }
        } else {
          total = 0; // autres
        }

        setBonusApplied(r, tid, total); 
        state.bonusUsed = state.bonusUsed || {}; state.bonusUsed[r] = state.bonusUsed[r] || {}; state.bonusUsed[r][tid]=true; 
        markTeamBonusUsed(tid);
      });

      rs.finished = true; saveState(); renderMatches(); renderLeaderboard();
      showToast(`Journée #${r} terminée — bonus appliqués et révélés.`); break;
    }
  }}
  const openBtn=e.target.closest("[data-open-id]");if(openBtn){const code=openBtn.getAttribute("data-open-id").replace(/^cloud:/,"");id("join-code").value=code;joinCloud(code);goto("equipes")}
  const delBtn=e.target.closest("[data-delete-id]");if(delBtn){if(!isAdmin())return alert("Suppression cloud réservée à l’admin.");const code=delBtn.getAttribute("data-delete-id");if(!confirm("Supprimer le tournoi '"+code+"' du cloud ?"))return;deleteCloud(code).then(()=>{setIndex(getIndex().filter(e=>e.id!==code));if(state.cloudId===code||cloud.id===code){unsubscribeCloud();resetState();renderAll();history.replaceState(null,"",location.pathname);goto('setup')}showToast("Supprimé.");renderSetupRecent()})}
  const av=e.target.closest('.avatar[data-click-avatar]');if(av){const tid=av.getAttribute('data-click-avatar');if(isAdmin()||hasClaim(tid)){const input=document.querySelector('input[type="file"][data-avatar="'+tid+'"]');if(input)input.click()}return}
  const tab=e.target.closest(".tab");if(tab){let t=tab.getAttribute("data-tab");if(guardTab(t))t='setup';qsa(".tab").forEach(b=>b.setAttribute("aria-selected","false"));qs('.tab[data-tab="'+t+'"]').setAttribute("aria-selected","true");qsa("main section").forEach(s=>s.classList.remove("active"));id(t).classList.add("active")}
  const actBtn=e.target.closest("[data-act]");if(actBtn){const act=actBtn.getAttribute("data-act"),tid=actBtn.getAttribute("data-id");if(act==="del"){if(!isAdmin()||state.locked)return;if(!confirm("Supprimer cette équipe ?"))return;state.teams=state.teams.filter(tt=>tt.id!==tid);state.matches=state.matches.filter(m=>m.a!==tid&&m.b!==tid);if(state.protect?.teamPassHash)delete state.protect.teamPassHash[tid];saveState();renderTeams();renderMatches();renderLeaderboard();renderH2H()}
    if(act==="setpass"){if(!isAdmin())return alert("Réservé à l’admin.");let pass=prompt("Mot de passe pour l’équipe « "+teamName(tid)+" » :");if(pass==null)return;pass=pass.trim();if(!pass)return alert("Mot de passe vide.");state.protect=state.protect||{};state.protect.teamPassHash=state.protect.teamPassHash||{};state.protect.teamPassHash[tid]=hashPass(pass);saveState();renderTeams();showToast("Mot de passe défini.")}
    if(act==="login"){const hashes=(state.protect&&state.protect.teamPassHash)?state.protect.teamPassHash:null;if(!hashes||!hashes[tid])return alert("Cette équipe n’a pas encore de mot de passe (demandez à l’admin).");let pass=prompt("Mot de passe de l’équipe « "+teamName(tid)+" » :");if(pass==null)return;pass=pass.trim();if(!pass)return alert("Mot de passe vide.");if(hashPass(pass)===hashes[tid]){ session.admin=false; session.claims={}; session.claims[tid]=true; updateWho(); renderAll(); showToast("Connexion réussie. Mode admin désactivé sur cet appareil."); }
      else showToast("Mot de passe incorrect.") }
    if(act==="logout"){session.claims={};updateWho();renderAll()}
    if(act==="avatar"){const input=qs('[data-avatar="'+tid+'"]');if(input)input.click()}
    if(act==="avatar-clear"){const t=teamObj(tid);if(!t)return;t.avatar=null;saveState();renderTeams();renderMatches();renderLeaderboard();renderH2H()}
  }
});

/* ===== Modal bonus ===== */
let bonusCTX={round:null,teamId:null};



/* === Bonus categories & locks === */
function rebuildCategoryLocksFromSelections(){
  try{
    const S = state.bonusSelections || {};
    const teams = (state.teams||[]).map(t=>t.id);
    state.categoryLocks = {};
    teams.forEach(tid => { state.categoryLocks[tid] = {}; });
    Object.keys(S).forEach(r=>{
      const perTeam = S[r] || {};
      Object.keys(perTeam).forEach(tid=>{
        const type = perTeam[tid] && perTeam[tid].type;
        const cat = BONUS_CATEGORY[type];
        if (cat) { state.categoryLocks[tid] = state.categoryLocks[tid] || {}; state.categoryLocks[tid][cat] = true; }
      });
    });
  }catch(_){}
}

const BONUS_CATEGORY = { capitaine:'score', melon:'score', taupe:'physique', lefthand:'physique', miroir:'miroir' };

function markCategoryLocked(teamId, type){
  const cat = BONUS_CATEGORY[type];
  if (!cat) return;
  state.categoryLocks = state.categoryLocks || {};
  state.categoryLocks[teamId] = state.categoryLocks[teamId] || {};
  state.categoryLocks[teamId][cat] = true;
  if (typeof saveState==='function') saveState();
}

function getTeamCategoryLocks(teamId){
  // Returns a Set of categories already validated (locked) by THIS team for the whole tournament
  const locks = new Set();
  const CL = state.categoryLocks && state.categoryLocks[teamId];
  if (CL) Object.keys(CL).forEach(cat => { if (CL[cat]) locks.add(cat); });
  return locks;
}

function applyBonusLocks(teamId){
  if (typeof rebuildCategoryLocksFromSelections==='function') rebuildCategoryLocksFromSelections();
  try{
    const locks = getTeamCategoryLocks(teamId);
    const round = (window.bonusCTX && window.bonusCTX.round);
    const currentSel = (typeof getBonusSelection==='function' && round!=null) ? (getBonusSelection(round, teamId) || null) : null;

    const cards = [...document.querySelectorAll('.bonus-select .bonus-card')];
    const map   = ['capitaine','miroir','taupe','lefthand','melon'];
    cards.forEach((c,i)=>{
      const type = map[i] || 'capitaine';
      const cat = BONUS_CATEGORY[type];
      const locked = !!(cat && locks.has(cat));
      // Autoriser la carte du type déjà sélectionné pour CETTE journée
      const allowCurrentType = !!(currentSel && currentSel.type === type);
      const disable = locked && !allowCurrentType;

      c.classList.toggle('disabled', disable);
      c.setAttribute('aria-disabled', disable ? 'true' : 'false');
      c.title = disable ? "Déjà utilisé pour cette catégorie (tournoi)" : "";
    });

    // Si la sélection courante est désormais illégale (catégorie lockée et type différent), forcer un type autorisé
    if (window._bonusType){
      const curCat = BONUS_CATEGORY[window._bonusType];
      const curSelCat = currentSel ? BONUS_CATEGORY[currentSel.type] : null;
      if (curCat && locks.has(curCat) && (!currentSel || currentSel.type !== window._bonusType)){
        const first = map.find(t => {
          const c = BONUS_CATEGORY[t];
          const isLocked = locks.has(c);
          const isCurrent = currentSel && currentSel.type === t;
          return !isLocked || isCurrent;
        });
        if (first) selectBonusType(first);
      }
    }
  }catch(_){}
}

function openBonusModal(round, teamId){
  
// Limite saisonnière : bonusMaxPerTeam
try {
  const max = +(((state && state.rules) ? state.rules.bonusMaxPerTeam : undefined) ?? Infinity);
  if (isFinite(max)) {
    const S = state.bonusSelections || {};
    let total = 0;
    Object.keys(S).forEach(function(r){ if (S[r] && S[r][teamId]) total++; });
    const dejaIci = !!(S[round] && S[round][teamId]);
    if (!dejaIci && total >= max) {
      alert(`Limite atteinte : ${max} bonus pour cette équipe sur la saison.`);
      return;
    }
  }
} catch(_){}
const rCtl = roundState(round);
  if (rCtl.started) return alert("La journée a démarré : bonus verrouillés.");
  if (state.bonusUsed?.[round]?.[teamId]) return alert("Ce bonus a déjà été utilisé une fois.");
  if (!hasClaim(teamId)) return alert("Connectez-vous à cette équipe pour choisir son bonus.");

  bonusCTX.round = round;
  bonusCTX.teamId = teamId;
  const sel = getBonusSelection(round, teamId) || {};

  // Prépare et sélectionne la carte
  if (typeof prepareBonusOptions === 'function') {
    prepareBonusOptions();
    selectBonusType(sel.type || 'capitaine');
    if (typeof applyBonusLocks==='function') applyBonusLocks(teamId);
  }

  // Préremplissage des champs spécifiques si disponibles
  const sport = sel.sport || 'darts';
  if (document.getElementById('taupe-sport'))     document.getElementById('taupe-sport').value = sport;
  if (document.getElementById('lefthand-sport'))  document.getElementById('lefthand-sport').value = sport;
  if (document.getElementById('melon-sport'))     document.getElementById('melon-sport').value = sport;

  const modal = document.getElementById('bonus-modal');
  if (modal) {
    const ctx = document.getElementById('bonus-context');
    if (ctx) ctx.textContent = `Équipe : ${teamName(teamId)} — Journée #${round}`;
    modal.classList.add('show');
  }
}

id('bonus-cancel').addEventListener('click',()=>id('bonus-modal').classList.remove('show'));
id('bonus-save').addEventListener('click',()=>{
  const r=bonusCTX.round, t=bonusCTX.teamId;
  // Block saving if category already used this season
  try{
    const locks = getTeamCategoryLocks(t);
    const cat = BONUS_CATEGORY[type];
    if (cat && locks.has(cat)) { showToast("Bonus déjà utilisé pour cette catégorie."); return; }
  }catch(_){}

 const type =
  (window._bonusType === 'miroir')   ? 'miroir'   :
  (window._bonusType === 'taupe')    ? 'taupe'    :
  (window._bonusType === 'lefthand') ? 'lefthand' :
  (window._bonusType === 'melon')    ? 'melon'    :
                                       'capitaine';
// Nouveau : 'capitaine' et 'melon' n'ont pas de paramètres à lire
if (type === 'capitaine') {
  setBonusSelection(r, t, { type });
} else if (type === 'melon') {
  const sport = document.getElementById('melon-sport')?.value || 'darts';
  setBonusSelection(r, t, { type: 'melon', sport });
} else if (type === 'taupe') {
  const sport = document.getElementById('taupe-sport')?.value || 'darts';
  setBonusSelection(r, t, { type: 'taupe', sport });
  if (typeof markCategoryLocked==='function') markCategoryLocked(t, 'taupe');
  if (typeof applyBonusLocks==='function') applyBonusLocks(t);
} else if (type === 'lefthand') {
  const sport = document.getElementById('lefthand-sport')?.value || 'darts';
  setBonusSelection(r, t, { type: 'lefthand', sport });
  if (typeof markCategoryLocked==='function') markCategoryLocked(t, 'lefthand');
  if (typeof applyBonusLocks==='function') applyBonusLocks(t);
} else if (type === 'miroir') {
  setBonusSelection(r, t, { type: 'miroir' });
  if (typeof markCategoryLocked==='function') markCategoryLocked(t, 'miroir');
  if (typeof applyBonusLocks==='function') applyBonusLocks(t);
} else {
  // garde-fou
  setBonusSelection(r, t, { type: 'capitaine' });
  if (typeof markCategoryLocked==='function') markCategoryLocked(t, 'capitaine');
  if (typeof applyBonusLocks==='function') applyBonusLocks(t);
}

  id('bonus-modal').classList.remove('show');
  if(typeof renderPills==='function') renderPills();
  if(typeof renderMatches==='function') renderMatches();
});

/* ===== Boot ===== */
function renderAll(){renderTitle();updateWho();renderSetupRecent();renderManageList();renderTeams();renderMatches();renderLeaderboard();renderH2H()}
document.addEventListener("DOMContentLoaded",()=>{ try { renderAll(); } catch(e) {} });

;
(function(){
  function withFallback(img, primary, fall1, fall2){
    img.src = primary;
    img.onerror = function(){
      img.onerror = function(){
        img.onerror = function(){
          img.onerror = null;
          img.src = fall2;
        };
        img.src = fall1;
      };
      img.src = 'img/' + primary.split('/').pop();
    };
  }
  function ensureBrandImages(){
    var brand = document.querySelector('header .brand') || document.querySelector('.brand');
    if(!brand) return;
    if(!brand.querySelector('img.brand-logo')){
      var logo = document.createElement('img');
      logo.className = 'brand-logo';
      logo.alt = 'TriSports logo';
      brand.prepend(logo);
      withFallback(logo, 'tripsort/img/logo.png', 'trisport/img/logo.png', 'img/logo.png');
    }
    if(!brand.querySelector('img.brand-title')){
      var title = document.createElement('img');
      title.className = 'brand-title';
      title.alt = 'TriSports';
      var ref = brand.querySelector('img.brand-logo');
      if(ref && ref.nextSibling){ brand.insertBefore(title, ref.nextSibling); }
      else { brand.appendChild(title); }
      withFallback(title, 'tripsort/img/titre.png', 'trisport/img/titre.png', 'img/titre.png');
    }
  }
  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ensureBrandImages);
  }else{
    ensureBrandImages();
  }
  // garder la réécriture d'aide capitaine en async léger
  document.addEventListener('click', function(){ if (typeof rewriteCapitaineHelp==='function') setTimeout(rewriteCapitaineHelp,0); }, true);
  
  // --- Affichage après révélation : ne pas afficher joueur/sport pour Capitaine ---
  if (typeof window.bonusChip === 'function'){
    const _origChip = window.bonusChip;
    window.bonusChip = function(r, mTeam, rs){
      const html = _origChip(r, mTeam, rs);
      if (typeof html === 'string' && /Capitaine\s*:?\s*J\d/i.test(html)){
        return html.replace(/Capitaine\s*:?\s*J\d\s*\/\s*(Fléchettes|Ping|Palet)/i, 'Capitaine');
      }
      return html;
    };
  }
})();

;
(function(){
  function getPanel(card){
    return card && card.querySelector('.bd');
  }
  function animateOpen(card){
    const panel = getPanel(card);
    if(!panel) return;
    // Ensure visible style before measuring
    panel.style.display = 'block';
    // From current height (0 || set) to scrollHeight
    panel.style.maxHeight = panel.scrollHeight + 'px';
    panel.style.opacity = '1';
    panel.style.paddingTop = '';
    panel.style.paddingBottom = '';
    function onEnd(e){
      if(e.propertyName === 'max-height'){
        panel.style.maxHeight = 'none'; // natural height
        panel.removeEventListener('transitionend', onEnd);
      }
    }
    panel.addEventListener('transitionend', onEnd);
  }
  function animateClose(card){
    const panel = getPanel(card);
    if(!panel) return;
    // If currently 'none', set to current measured height for transition start
    if(getComputedStyle(panel).maxHeight === 'none'){
      panel.style.maxHeight = panel.scrollHeight + 'px';
    }
    // Force reflow to apply starting height
    panel.getBoundingClientRect();
    // Then animate to 0
    panel.style.maxHeight = '0px';
    panel.style.opacity = '0';
    panel.style.paddingTop = '0px';
    panel.style.paddingBottom = '0px';
  }

  // Observe aria-expanded changes to trigger animation
  const cards = Array.from(document.querySelectorAll('.match-card'));
  const obs = new MutationObserver((mutations)=>{
    mutations.forEach(m=>{
      if(m.type === 'attributes' && m.attributeName === 'aria-expanded'){
        const card = m.target;
        const isOpen = card.getAttribute('aria-expanded') === 'true';
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches){
          // No animation, just set styles minimally
          const p = getPanel(card);
          if(!p) return;
          if(isOpen){
            p.style.maxHeight = 'none'; p.style.opacity = '1'; p.style.paddingTop=''; p.style.paddingBottom=''; p.style.display='block';
          }else{
            p.style.maxHeight = '0px'; p.style.opacity = '0'; p.style.paddingTop='0'; p.style.paddingBottom='0'; p.style.display='block';
          }
          return;
        }
        if (isOpen) animateOpen(card); else animateClose(card);
      }
    });
  });
  cards.forEach(card=>{
    obs.observe(card, { attributes:true, attributeFilter:['aria-expanded'] });
    // Make header clickable/toggleable if not already
    const hd = card.querySelector('.hd');
    if(hd){
      hd.style.cursor = 'pointer';
      hd.setAttribute('tabindex','0');
      hd.setAttribute('role','button');
      const toggle = (ev)=>{
        if(ev && ev.type==='keydown' && !(ev.key==='Enter' || ev.key===' ')) return;
        const open = card.getAttribute('aria-expanded') !== 'true';
        card.setAttribute('aria-expanded', open ? 'true' : 'false');
        if(ev) ev.preventDefault();
      };
      hd.addEventListener('click', toggle);
      hd.addEventListener('keydown', toggle);
    }
    // Initialize panel style according to current state
    const isOpen = card.getAttribute('aria-expanded') === 'true';
    const p = getPanel(card);
    if(p){
      if(isOpen){
        p.style.maxHeight = 'none';
        p.style.opacity = '1';
      }else{
        p.style.maxHeight = '0px';
        p.style.opacity = '0';
        p.style.paddingTop='0';
        p.style.paddingBottom='0';
        p.style.display='block';
      }
    }
  });

  // Hook into "Tout replier" button if present
  const collapseBtn = document.getElementById('btn-collapse');
  if(collapseBtn){
    collapseBtn.addEventListener('click', ()=>{
      document.querySelectorAll('.match-card[aria-expanded="true"]').forEach(c=>c.setAttribute('aria-expanded','false'));
    });
  }
})();

;
(function(){
  const TBL = document.getElementById('table-classement');
  if(!TBL) return;

  const isReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURATION = isReduced ? 0 : 600;

  function numFromText(t){
    if(!t) return null;
    const m = (''+t).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
    return m ? parseFloat(m[0]) : null;
  }
  function formatLike(orig, n){
    const hasPlus = /^\s*\+/.test(orig);
    const s = Math.round(n).toString();
    return hasPlus ? (n>=0? '+' : '') + Math.round(n).toString() : s;
  }
  function animateCount(cell, from, to){
    if (DURATION === 0){ cell.textContent = formatLike(cell.textContent, to); return; }
    const start = performance.now();
    function step(now){
      const p = Math.min(1, (now - start) / DURATION);
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * eased;
      if (cell && cell.isConnected){
        cell.textContent = formatLike(cell.textContent, val);
      }
      if (p < 1 && cell && cell.isConnected) requestAnimationFrame(step);
      else if (cell && cell.isConnected) cell.textContent = formatLike(cell.textContent, to);
    }
    requestAnimationFrame(step);
  }

  const tbody = TBL.querySelector('tbody');
  if(!tbody) return;

  function initRow(tr){
    if (!tr || !tr.children) return;
    const pts = tr.children[2];
    const bon = tr.children[6];
    const mal = tr.children[7];
    if (pts) pts.dataset.prev = pts.textContent.trim();
    if (bon) bon.dataset.prev = bon.textContent.trim();
    if (mal) mal.dataset.prev = mal.textContent.trim();
  }

  Array.from(tbody.querySelectorAll('tr')).forEach(initRow);

  const mo = new MutationObserver((ms)=>{
    ms.forEach(m=>{
      if (m.type === 'characterData'){
        const parent = m.target && m.target.parentElement ? m.target.parentElement : null;
        if (!parent || !parent.parentElement) return;
        const tr = parent.parentElement;
        if (!tr || !tr.children) return;
        const colIndex = Array.from(tr.children).indexOf(parent);
        if (![2,6,7].includes(colIndex)) return;
        const prevText = parent.dataset.prev || '';
        const newText = parent.textContent.trim();
        const from = numFromText(prevText);
        const to = numFromText(newText);
        if (from==null || to==null || from===to){ parent.dataset.prev = newText; return; }
        parent.textContent = prevText;
        animateCount(parent, from, to);
        parent.dataset.prev = newText;
      }
      if (m.type === 'childList'){
        m.addedNodes.forEach(node=>{
          if(!(node && node.nodeType===1)) return;
          if (node.matches && node.matches('tr')){
            const tr = node;
            tr.style.animation = 'slideUpFade .28s ease both';
            const parent = tr.parentElement || (m.target && m.target.nodeType===1 ? m.target : null);
            if (parent && parent.children){
              const idx = Array.from(parent.children).indexOf(tr);
              tr.style.animationDelay = (Math.min(6, Math.max(0, idx)) * 0.03).toFixed(2) + 's';
            }
            initRow(tr);
          }else{
            node.querySelectorAll && node.querySelectorAll('tr').forEach(initRow);
          }
        });
      }
    });
  });
  mo.observe(tbody, { subtree:true, characterData:true, childList:true });

  function pulse(){
    TBL.style.boxShadow='0 0 0 1px rgba(122,162,255,.25) inset';
    setTimeout(()=>{ if (TBL) TBL.style.boxShadow=''; }, 250);
  }
  const r1 = document.getElementById('btn-refresh-standings');
  const r2 = document.getElementById('btn-refresh-standings-2');
  r1 && r1.addEventListener('click', pulse);
  r2 && r2.addEventListener('click', pulse);
})();

;
(function(){
  // Build a Promise-based confirm
  window.showConfirm = function(opts){
    opts = opts || {};
    var overlay = document.getElementById('confirm-overlay');
    var icon = overlay.querySelector('.icon');
    var title = overlay.querySelector('.hd');
    var body = overlay.querySelector('.bd');
    var btns = overlay.querySelectorAll('.ft .btn');
    var btnCancel = btns[0], btnOk = btns[1];

    // Title text (keep icon span intact)
    overlay.querySelector('.hd').childNodes[1].nodeValue = opts.title || 'Confirmation';
    icon.textContent = opts.icon || '⚠️';
    body.textContent = opts.message || 'Êtes-vous sûr ?';
    btnOk.textContent = opts.okText || 'Confirmer';
    btnCancel.textContent = opts.cancelText || 'Annuler';
    btnOk.classList.toggle('danger', !!opts.danger);

    return new Promise(function(resolve){
      function close(res){
        overlay.classList.remove('show');
        document.removeEventListener('keydown', esc);
        btnCancel.removeEventListener('click', onCancel);
        btnOk.removeEventListener('click', onOk);
        resolve(res);
      }
      function esc(e){ if(e.key==='Escape') close(false); }
      function onCancel(){ close(false); }
      function onOk(){ close(true); }

      document.addEventListener('keydown', esc);
      btnCancel.addEventListener('click', onCancel);
      btnOk.addEventListener('click', onOk);
      overlay.classList.add('show');
      btnOk.focus();
    });
  };

  // Intercept clicks on sensitive actions with a capturing listener
  var pass = false;
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest && (
      ev.target.closest('[data-clear]') ||
      ev.target.closest('#btn-start-round') ||
      ev.target.closest('#btn-end-round')
    );
    if(!btn) return;
    if(pass){ pass = false; return; } // let it through once

    // Prevent original handlers
    ev.stopImmediatePropagation();
    ev.preventDefault();

    // Derive context
    var isClear = !!btn.closest('[data-clear]');
    var isStart = btn.id === 'btn-start-round';
    var isEnd   = btn.id === 'btn-end-round';

    var cfg = isClear ? {
      title: 'Effacer ce match ?',
      icon: '🗑️',
      message: 'Cette action remettra à zéro Fléchettes, Ping et Palet pour ce match. Continuer ?',
      okText: 'Oui, effacer',
      danger: true
    } : isStart ? {
      title: 'Démarrer la journée ?',
      icon: '🏁',
      message: 'Vous êtes sur le point d’ouvrir la journée. Les équipes pourront saisir leurs scores. Confirmer ?',
      okText: 'Démarrer'
    } : {
      title: 'Clôturer la journée ?',
      icon: '🔒',
      message: 'Vous allez passer la journée en “terminée”. Les équipes ne pourront plus modifier les scores (sauf admin). Confirmer ?',
      okText: 'Clore',
      danger: true
    };

    showConfirm(cfg).then(function(ok){
      if(!ok) return;
      // Allow a single pass-through click to trigger the app's existing handler
      pass = true;
      btn.click();
    });
  }, true); // capture phase to beat existing listeners
})();

;
(function(){
  window.showToast = function(msg, timeout){
    timeout = timeout || 2600;
    var el = document.getElementById('toast');
    if(!el) return alert(msg);
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function(){ el.classList.remove('show'); }, timeout);
  };
})();

;
(function(){
  try{
    if (typeof renderTitle === 'function') renderTitle();
    if (typeof updateWho === 'function')  updateWho();
  }catch(e){ /* silent */ }
})();

;
(function(){
  function wrapPoints(){
    var t = document.getElementById('table-classement');
    if(!t) return;
    t.querySelectorAll('tbody td:nth-child(3)').forEach(function(td){
      var v = (td.textContent || "").trim();
      var span = td.querySelector('span.points-medal');
      if (span) {
        span.textContent = v;
      } else if (v) {
        td.textContent = "";
        var s = document.createElement('span');
        s.className = 'points-medal';
        s.textContent = v;
        td.appendChild(s);
      }
    });
  }
  function patch(){
    var orig = window.renderLeaderboard;
    if (typeof orig === 'function'){
      if (!orig._withPointsWrap){
        window.renderLeaderboard = function(){
          var r = orig.apply(this, arguments);
          requestAnimationFrame(wrapPoints);
          return r;
        };
        window.renderLeaderboard._withPointsWrap = true;
      }
      requestAnimationFrame(wrapPoints);
    } else {
      setTimeout(patch, 120);
    }
  }
  // Réappliquer quand on affiche l’onglet Classement
  document.addEventListener('click', function(ev){
    var btn = ev.target.closest && ev.target.closest('.tab[data-tab="classement"]');
    if (btn){ requestAnimationFrame(function(){ setTimeout(wrapPoints, 0); }); }
  });
  patch();
})();

;
(function(){
  function getScoreRect(root){
    var score = root.closest('.match-card')?.querySelector('.scorewrap .score, .score') ||
                document.querySelector('.scorewrap .score, .score');
    return score ? score.getBoundingClientRect() : null;
  }
  
  function place(pop, pill){
    // reset
    pop.classList.remove('is-above');
    pop.style.setProperty('--x-offset', '0px');

    var popRect   = pop.getBoundingClientRect();
    var pillRect  = pill.getBoundingClientRect();
    var scoreRect = getScoreRect(pill);

    if (!scoreRect){
      if (popRect.top < 8) pop.classList.add('is-above');
      return;
    }

    var overlapVert = !(popRect.bottom < scoreRect.top || popRect.top > scoreRect.bottom);
    if (overlapVert){
      pop.classList.add('is-above');
      popRect = pop.getBoundingClientRect();
    }

    var margin = 8;
    var needLeft  = Math.max(0, scoreRect.left  - popRect.left  + margin);
    var needRight = Math.max(0, popRect.right   - scoreRect.right + margin);

    var dx = 0;
    if (needLeft === 0 && needRight === 0){
      dx = 0;
    } else if (needRight > 0 && needLeft <= 0){
      dx = -needRight;
    } else if (needLeft > 0 && needRight <= 0){
      dx = needLeft;
    } else {
      var scoreCenter = (scoreRect.left + scoreRect.right) / 2;
      dx = (pillRect.left < scoreCenter) ? needLeft : -needRight;
    }

    var newLeft  = popRect.left  + dx;
    var newRight = popRect.right + dx;
    if (newLeft < 16) dx += (16 - newLeft);
    if (newRight > window.innerWidth - 16) dx -= (newRight - (window.innerWidth - 16));

    pop.style.setProperty('--x-offset', dx.toFixed(0) + 'px');
  }

function onEnter(e){
    var pill = (function(t){var el=t; if(el&&el.nodeType&&el.nodeType!==1) el=el.parentElement; while(el){ if(el.matches&&el.matches('.pill.bonus-flashy')) return el; el=el.parentElement; } return null;})(e.target);
    if (!pill) return;
    var pop = pill.querySelector('.bonus-pop');
    if (!pop) return;
    requestAnimationFrame(function(){ place(pop, pill); });
  }
  function onLeave(e){
    var pill = (function(t){var el=t; if(el&&el.nodeType&&el.nodeType!==1) el=el.parentElement; while(el){ if(el.matches&&el.matches('.pill.bonus-flashy')) return el; el=el.parentElement; } return null;})(e.target);
    if (!pill) return;
    var pop = pill.querySelector('.bonus-pop');
    if (!pop) return;
    pop.classList.remove('is-above');
    pop.style.removeProperty('--x-offset');
  }
  document.addEventListener('mouseenter', onEnter, true);
  document.addEventListener('mouseleave', onLeave, true);
})();

;
// === Bonus tooltip — large, hover only (fixed to body) ===================
(function bonusTooltipHoverOnly(){
  const DESCS = {
    "Capitaine": "Aucun réglage. +2 par manche gagnée (fléchettes & ping, simples et doubles) et +2 si palet gagné.",
    "Miroir": "Inverse le bonus adverse sur tout le match. Si l’adversaire choisit Capitaine, son effet s’applique à votre équipe.",
    "René la taupe": "Lunettes gênantes imposées à l’adversaire dans le sport choisi. Si l’adversaire joue « Miroir », vous portez les lunettes.",
    "10 pouces 2 mains gauche": "L’adversaire doit jouer un sous-match avec sa mauvaise main. Choisissez le sport concerné.",
    "Melon d'or": "Nouveau bonus — détails à venir."
  };

  // Single tooltip node (no backdrop)
  const tip = document.createElement('div');
  tip.className = 'bonus-tip floating';
  tip.style.position = 'fixed';
  tip.style.zIndex = '99999';
  tip.style.display = 'none';
  tip.innerHTML = '<span class="tip-img"></span><span><div class="tip-title"></div><div class="tip-desc"></div></span>';
  document.body.appendChild(tip);

  const imgBox = tip.querySelector('.tip-img');
  const tTitle = tip.querySelector('.tip-title');
  const tDesc  = tip.querySelector('.tip-desc');
  let anchor = null;    // current pill
  let overTip = false;  // track hover inside the tip

  function fill(pill){
    const img = pill.dataset?.bonusImg || pill.querySelector?.('.mini-bonus img')?.getAttribute('src') || '';
    const title = pill.dataset?.bonusTitle || pill.getAttribute?.('aria-label') || (pill.textContent || '').trim();
    const desc  = pill.dataset?.bonusDesc || DESCS[title] || '';
    imgBox.innerHTML = img ? '<img src="'+img+'" alt="" />' : '';
    tTitle.textContent = title || 'Bonus';
    tDesc.textContent  = desc;
  }

  function place(pill){
    const r = pill.getBoundingClientRect();
    tip.style.display = 'grid';
    tip.style.opacity = '0';
    tip.classList.remove('show');
    requestAnimationFrame(()=>{
      const w = tip.offsetWidth;
      const h = tip.offsetHeight;
      let x = Math.round(r.left + r.width/2 - w/2);
      let y = Math.round(r.top - h - 10);
      const margin = 10;
      if (x < margin) x = margin;
      if (x + w > window.innerWidth - margin) x = window.innerWidth - margin - w;
      if (y < margin) y = Math.round(r.bottom + 10);
      tip.style.left = x + 'px';
      tip.style.top  = y + 'px';
      tip.style.opacity = '1';
      tip.classList.add('show');
    });
  }

  function show(pill){ anchor = pill; fill(pill); place(pill); }
  function hide(){
    if (!overTip) { tip.style.display = 'none'; tip.classList.remove('show'); anchor = null; }
  }

  // Keep visible while mouse moves over the tooltip
  tip.addEventListener('mouseenter', ()=>{ overTip = true; });
  tip.addEventListener('mouseleave', ()=>{ overTip = false; hide(); });

  function attach(pill){
    if (!pill || pill.dataset.btipReady) return;
    pill.dataset.btipReady = '1';
    if (!pill.hasAttribute('tabindex')) pill.setAttribute('tabindex','0');
    pill.addEventListener('mouseenter', ()=>show(pill));
    pill.addEventListener('mouseleave', (e)=>{
      const to = e.relatedTarget;
      if (!tip.contains(to)) hide();
    });
    pill.addEventListener('focus', ()=>show(pill));
    pill.addEventListener('blur', hide);
    // No click/touch needed
  }

  function enhanceAll(root){
    (root || document).querySelectorAll('.pill').forEach(p=>{
      if (p.querySelector('.mini-bonus img')) attach(p);
    });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', ()=>enhanceAll(document));
  } else {
    enhanceAll(document);
  }

  try{
    const mo = new MutationObserver(()=>enhanceAll(document));
    mo.observe(document.body, { childList:true, subtree:true });
  }catch(_){}

  window.refreshBonusTooltips = enhanceAll;
})();

;
(function(){
  const LS_KEY = 'trisports_logs_v1';
  const MAX_DISPLAY = 1000;
  const id = (s)=>document.getElementById(s);
  const escape = s => (s==null ? '' : String(s)).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
  const teamNameById = (tid)=>{
    try{
      if(typeof window.teamName === 'function') return window.teamName(tid);
      const t = (window.state && Array.isArray(state.teams)) ? state.teams.find(x=>String(x.id)===String(tid) || String(x.tid)===String(tid)) : null;
      return (t && (t.name || t.n)) || String(tid);
    }catch(e){ return String(tid); }
  };
  const actorLabel = ()=>{
    try{
      if((window.session && window.session.admin)) return 'Admin';
      const who = (document.getElementById('whoami-top') && document.getElementById('whoami-top').textContent)?.trim();
      if(who) return who;
    }catch(e){}
    return 'Utilisateur';
  };
  function describeAction(type, data){
    var who = actorLabel();
    try{
      switch(type){
        case 'team_rename':
          return who + ' a changé le nom de l’équipe « ' + (data && (data.newName||'?')) + ' »' + (data && data.oldName ? ' (avant : « ' + data.oldName + ' »)' : '');
        case 'score_update':
          // data: {team, discipline, value}
          var team = data && data.team != null ? teamNameById(data.team) : null;
          var disc = (data && data.discipline) || 'score';
          var val  = (data && (data.value!=null ? data.value : data.to));
          if(team) return who + ' a changé le score du ' + disc + ' pour « ' + team + ' » à ' + val;
          return who + ' a changé le score du ' + disc + ' à ' + val;
        case 'ping_set':
          // data: {index, team}
          var tP = data && data.team != null ? teamNameById(data.team) : null;
          var idx = (data && typeof data.index==='number') ? data.index : 0;
          try {
            var sSingles = (state && state.rules && +state.rules.pingSingles) || 0;
            var label = (idx < sSingles) ? ('Simple ' + (idx+1)) : ('Double ' + (idx - sSingles + 1));
            return who + ' a enregistré une victoire au ping pour « ' + tP + ' » (' + label + ')';
          } catch(e){
            return who + ' a enregistré une victoire au ping pour « ' + (tP||'') + ' » (set #' + (idx+1) + ')';
          }
        case 'darts_set':
          // data: {index, team}
          var tD = data && data.team != null ? teamNameById(data.team) : null;
          var i2 = (data && typeof data.index==='number') ? data.index : 0;
          try {
            var sD = (state && state.rules && +state.rules.dartsSingles) || 0;
            var lab = (i2 < sD) ? ('Simple ' + (i2+1)) : ('Double ' + (i2 - sD + 1));
            return who + ' a enregistré une victoire aux fléchettes pour « ' + tD + ' » (' + lab + ')';
          } catch(e){
            return who + ' a enregistré une victoire aux fléchettes pour « ' + (tD||'') + ' » (manche #' + (i2+1) + ')';
          }
        case 'bonus_selection':
          // data: { round, team, sel }
          return who + ' a défini le bonus de « ' + teamNameById(data && data.team) + ' » pour la manche ' + (data && data.round);
        case 'clear_match':
          return who + ' a réinitialisé le match ' + (data && data.matchId ? data.matchId : '');
        case 'admin_on':
          return 'Admin activé';
        case 'admin_off':
          return 'Admin désactivé';
        case 'round_start':
          return who + ' a démarré la journée';
        case 'round_end':
          return who + ' a terminé la journée';
        case 'import':
          return who + ' a importé des données';
        case 'export':
          return who + ' a exporté des données';
        case 'cloud_delete':
          return who + ' a supprimé les données cloud';
        default:
          return null; // laisser tomber les types techniques
      }
    }catch(e){
      return null;
    }
  }

  let logs = [];
  function firebaseRef(){
    try{
      if(window.firebase && firebase.database){
        const tid = (window.state && (state.cloudId || state.tid)) || 'local';
        return firebase.database().ref('tournaments/' + tid + '/logs');
      }
    }catch(e){}
    return null;
  }
  function writeFirebase(entry){
    const ref = firebaseRef();
    if(!ref) return Promise.reject(new Error('no firebase'));
    return ref.push(entry);
  }
  function saveLocal(){ try{ localStorage.setItem(LS_KEY, JSON.stringify(logs)); }catch(_){} }
  function loadLocal(){ try{ const raw = localStorage.getItem(LS_KEY); if(raw) logs = JSON.parse(raw) || []; }catch(e){ logs = []; } }
  loadLocal();
  function renderList(){
    const wrap = id('ts-log-list'); if(!wrap) return;
    const out = logs.slice(-MAX_DISPLAY).map(l=>{
      const d = new Date(l.ts || Date.now());
      const ts = d.toLocaleString();
      const msg = escape(l.msg || l.type || 'action');
      return `<div class="ts-log-item"><div class=\"ts\">${ts}</div><div class=\"meta\">${msg}</div></div>`;
    }).join('');
    wrap.innerHTML = out || '<div class="help">Aucun log.</div>';
    wrap.scrollTop = wrap.scrollHeight;
  }
  
  // ---------- State diff helpers for precise logs ----------
  const deepClone = (v)=>{
    try{ return JSON.parse(JSON.stringify(v)); }catch(e){ return null; }
  };
  let __prevState = null;

  function pathMatchesDiscipline(pathStr){
    return /(palet|darts|ping|score)/i.test(pathStr);
  }
  function labelFromPath(pathArr){
    try{
      const pathStr = pathArr.join('.');
      const tIdx = pathArr.findIndex(p=>/^team(Id|id|tid)$/i.test(p));
      let team = null;
      if(tIdx!==-1){
        const tid = pathArr[tIdx+1];
        team = teamNameById(tid);
      }
      const disc = pathArr.find(p=>/palet|darts|ping/i.test(p)) || 'score';
      let base = team ? `Équipe ${team}` : 'Score';
      return `${base} ${disc}`;
    }catch(e){
      return 'Score';
    }
  }

  function walkDiff(a, b, cb, path=[]){
    if(a===b) return;
    const ta = Object.prototype.toString.call(a);
    const tb = Object.prototype.toString.call(b);
    if(ta!==tb){ cb(path, a, b); return; }
    if(typeof a!=='object' || a===null || b===null){
      cb(path, a, b); return;
    }
    const keys = new Set([...(Array.isArray(a)? Object.keys(a): Object.keys(a||{})), ...(Array.isArray(b)? Object.keys(b): Object.keys(b||{}))]);
    for(const k of keys){
      const ka = a ? a[k] : undefined;
      const kb = b ? b[k] : undefined;
      if(typeof ka==='undefined' && typeof kb==='undefined') continue;
      walkDiff(ka, kb, cb, path.concat(String(k)));
    }
  }

  function summarizeChanges(prevS, nextS){
    const out = [];

    // Team renames
    try{
      const prevTeams = Array.isArray((prevS && Array.isArray(prevS.teams) ? prevS.teams : []))? prevS.teams: [];
      const nextTeams = Array.isArray((nextS && Array.isArray(nextS.teams) ? nextS.teams : []))? nextS.teams: [];
      const byKey=function(arr){
      return Object.fromEntries(arr.map(function(t){
        var key = (t && (t.id!=null ? t.id : (t.tid!=null ? t.tid : ((t.name||t.n)||''))));
        return [String(key), t];
      }));
    };
      const A = byKey(prevTeams), B = byKey(nextTeams);
      for(const k of Object.keys(B)){
        if(A[k] && (A[k].name||A[k].n) !== (B[k].name||B[k].n)){
          out.push({type:'team_rename', data:{oldName:(A[k].name||A[k].n), newName:(B[k].name||B[k].n)}});
        }
      }
    }catch(e){}

    // Numeric score-ish changes
    try{
      walkDiff(prevS, nextS, (path, a, b)=>{
        if(a===b) return;
        const bothNum = (typeof a==='number' && typeof b==='number');
        const bothShortStr = (typeof a==='string' && typeof b==='string' && a.length<=3 && b.length<=3);
        const pathStr = path.join('.');
        if((bothNum || bothShortStr) && pathMatchesDiscipline(pathStr)){
          out.push({type:'score_update', data:{path: pathStr, label: labelFromPath(path), from: a, to: b}});
        }
      });
    }catch(e){}

    return out;
  }

  renderList();
  window.logEvent = async function(type, data){
    // masquer les types techniques si pas de message lisible
    var technical = { 'saveState':1, 'pushCloud':1, 'ui_click':1 };
    var message = describeAction(type, data);
    if (message === null || technical[type]) {
      // ne rien afficher si pas de message humain
      // (mais on peut toujours pousser en cloud si besoin plus tard)
      return null;
    }
    const entry = {
      ts: Date.now(),
      who: (window.session && (window.session.claims && Object.keys(window.session.claims).length ? Object.keys(window.session.claims).join(',') : (window.session.admin? 'admin':'visiteur'))) || (document.getElementById('whoami-top') && document.getElementById('whoami-top').textContent) || 'visiteur',
      type: type || 'event',
      path: location.pathname + location.search,
      data: (data === undefined ? null : data),
      msg: message
    };
    logs.push(entry); saveLocal(); renderList();
    try{ var ref = firebaseRef(); if(ref){ await writeFirebase(entry); } }catch(e){}
    return entry;
  };

  // Open/close modal wiring — button lives in Admin card now
  const modal = id('ts-log-modal');
  document.addEventListener('DOMContentLoaded', function(){
    var btn = document.getElementById('btn-open-logs');
    if (btn) {
      btn.addEventListener('click', function(){
        modal.classList.add('show');
        modal.setAttribute('aria-hidden','false');
        renderList();
      });
    }
  });
  document.addEventListener('click', function(e){
    var target = e.target;
    if (target && target.id === 'ts-close') {
      modal.classList.remove('show');
      modal.setAttribute('aria-hidden','true');
    }
  });
  if(id('ts-clear-local')) id('ts-clear-local').addEventListener('click', ()=>{ if(!confirm('Effacer les logs locaux ?')) return; logs=[]; saveLocal(); renderList(); });
  if(id('ts-download')) id('ts-download').addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(logs, null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'trisports-logs-'+(new Date()).toISOString().replace(/[:.]/g,'-')+'.json';
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  });

  (function attachFirebaseListener(){
    try{
      const ref = firebaseRef(); if(!ref) return;
      ref.limitToLast(200).on('child_added', snap=>{
        const v = snap.val(); if(!v) return;
        logs.push(v); saveLocal(); renderList();
      });
    }catch(e){}
  })();

  // Listen to custom events
  document.addEventListener('app:action', function(e){
    try{ window.logEvent(e.detail?.type || 'custom', e.detail?.data || null); }catch(_){}
  });

  // Intercept key UI buttons -> map to simplified types
  document.addEventListener('click', function(ev){
    try{
      const q = (sel)=>ev.target.closest && ev.target.closest(sel);
      if(q('#btn-admin-on')) return window.logEvent('admin_on');
      if(q('#btn-admin-off')) return window.logEvent('admin_off');
      if(q('#btn-start-round')) return window.logEvent('round_start');
      if(q('#btn-end-round')) return window.logEvent('round_end');
      if(q('#btn-import')) return window.logEvent('import');
      if(q('#btn-export')) return window.logEvent('export');
      if(q('#btn-cloud-delete')) return window.logEvent('cloud_delete');
      // generic
      const btn = q('[data-act]') || q('[data-clear]');
      if(btn){
        const act = btn.getAttribute('data-act') || btn.getAttribute('data-clear') || btn.id || btn.dataset.act;
        const meta = { id: btn.dataset.id || btn.getAttribute('data-id') || null, text: (btn.textContent||'').trim() };
        return window.logEvent('ui_click', { action: act, meta });
      }
    }catch(e){}
  }, true);

  // Monkey patches -> simplified types
  function maybeWrap(name, wrapper){
    try{
      if(typeof window[name] === 'function'){
        const orig = window[name];
        window[name] = function(...args){
          try{ wrapper.apply(this, args); }catch(_){}
          return orig.apply(this, args);
        };
      }
    }catch(e){}
  }
  maybeWrap('saveState', function(){
    try{
      const prev = __prevState ?? deepClone(window.state);
      // Wait a tick to let state actually change (in case original mutates after call)
      setTimeout(()=>{
        try{
          const next = deepClone(window.state);
          const changes = summarizeChanges(prev, next);
          if(changes.length){
            changes.forEach(ch => window.logEvent(ch.type, ch.data));
          }else{
            // fallback minimal
            window.logEvent('saveState', { teams: (window.state && state.teams && state.teams.length) || 0 });
          }
          __prevState = deepClone(window.state);
        }catch(e){}
      }, 0);
    }catch(_){}
  });
  maybeWrap('pushCloud', function(immediate){
    try{ window.logEvent('pushCloud', { immediate: !!immediate, cloudId: (window.state && (state.cloudId||null)) || null }); }catch(_){}
  });
  maybeWrap('setBonusSelection', function(round, tid, sel){
    try{ window.logEvent('bonus_selection', { round, team: tid, sel }); }catch(_){}
  });
  maybeWrap('clearMatch', function(mid){
    try{ window.logEvent('clear_match', { matchId: mid }); }catch(_){}
  });

  // Helpers to log from app with friendly types
  window.emitAppLog = (type, data) => document.dispatchEvent(new CustomEvent('app:action',{detail:{type, data}}));
  window.logTeamRename = (oldName, newName)=>window.logEvent('team_rename', {oldName, newName});
  window.logScoreUpdate = (team, discipline, value)=>window.logEvent('score_update', {team, discipline, value});

  renderList();
})();

;
(function(){
  const PADDING = 12; // viewport padding
  let current = null;
  const popover = document.createElement('div');
  popover.className = 'ts-popover';
  popover.setAttribute('role', 'tooltip');
  popover.innerHTML = '<div class="ts-popover__content"></div><div class="ts-popover__arrow" aria-hidden="true"></div>';
  const contentEl = popover.querySelector('.ts-popover__content');
  document.addEventListener('DOMContentLoaded', () => {
    // Upgrade legacy [data-tip] to [data-popover]
    document.querySelectorAll('[data-tip]').forEach(el => {
      if(!el.hasAttribute('data-popover')){
        el.setAttribute('data-popover', el.getAttribute('data-tip'));
      }
      // Remove legacy CSS-only tooltip by disabling ::after/::before via marker
      el.setAttribute('data-has-js-popover', 'true');
    });

    // Attach events
    const triggers = Array.from(document.querySelectorAll('[data-popover]'));
    if (!triggers.length) return;
    document.body.appendChild(popover);

    const open = (el, viaClick=false) => {
      if (current === el) return;
      close();
      current = el;
      const text = el.getAttribute('data-popover');
      if (!text) { current = null; return; }
      contentEl.textContent = text;
      // ARIA
      let id = el.getAttribute('aria-describedby');
      if (!id) {
        id = 'ts-popover-' + Math.random().toString(36).slice(2);
        popover.id = id;
        el.setAttribute('aria-describedby', id);
      } else {
        popover.id = id;
      }
      el.setAttribute('data-popover-state','open');
      place(el);
popover.setAttribute('data-placement','bottom');
popover.setAttribute('data-state','open');
      // If opened by click/touch, trap dismissal with outside click
      if (viaClick) {
        setTimeout(()=>document.addEventListener('pointerdown', onDocPointerDown, { once:true }), 0);
      }
    };

    const close = () => {
      if (!current) return;
      current.removeAttribute('data-popover-state');
      current = null;
      popover.removeAttribute('data-state');
    };

    const onDocPointerDown = (e) => {
      if (!popover.contains(e.target) && (!current || !current.contains(e.target))) {
        close();
      }
    };

    
const place = (el) => {
  const rect = el.getBoundingClientRect();
  const vw = document.documentElement.clientWidth;
  const vh = document.documentElement.clientHeight;
  const popW = Math.min(460, vw - PADDING*2);
  popover.style.maxWidth = popW + 'px';
  // Ensure measurable size before positioning
  popover.style.left = '0px';
  popover.style.top = '0px';
  popover.setAttribute('data-placement','bottom');
  // compute content size after setting content
  const margin = 10;
  const popH = popover.offsetHeight || 0;

  // Horizontal centering with clamping
  let left = rect.left + rect.width/2 - popW/2;
  left = Math.max(PADDING, Math.min(left, vw - PADDING - popW));

  // Force below the trigger
  let top = rect.bottom + margin;
  // Clamp to viewport bottom with padding
  top = Math.min(vh - PADDING - popH, top);

  popover.style.transformOrigin = 'center top';
  popover.style.left = left + 'px';
  popover.style.top = top + 'px';

  // Arrow X based on trigger center
  const arrow = popover.querySelector('.ts-popover__arrow');
  const centerX = rect.left + rect.width/2;
  const arrowLeft = Math.max(14, Math.min(popW - 14, centerX - left));
  arrow.style.left = arrowLeft + 'px';
  arrow.style.top = (-7) + 'px';
};


    // Hover/focus show, leave/blur hide
    const show = (e) => open(e.currentTarget, e.type === 'click');
    const hide = () => close();

    triggers.forEach(el => {
      el.setAttribute('tabindex', el.tabIndex >= 0 ? el.tabIndex : 0);
      el.setAttribute('aria-haspopup','tooltip');
      el.addEventListener('mouseenter', show);
      el.addEventListener('focusin', show);
      el.addEventListener('mouseleave', hide);
      el.addEventListener('focusout', hide);
      el.addEventListener('click', (e)=>{
        // Toggle on click/touch
        if (current === el) { close(); }
        else { open(el, true); }
      });
    });

    window.addEventListener('resize', () => { if (current) place(current); });
    window.addEventListener('scroll', () => { if (current) place(current); }, true);

    // Esc to close
    document.addEventListener('keydown', (e)=>{
      if (e.key === 'Escape') close();
    });
  });
})();

// Soft admin confirmation helper (prompt-based). Customize ADMIN_PIN retrieval as needed.
async function confirmerActionAdmin(message = "Confirmer l’action admin") {
  try {
    if (typeof isAdmin === "function" && !isAdmin()) return false;
    const pin = prompt(message + " — entrez le code admin");
    // TODO: Replace window.ADMIN_PIN with a secure retrieval method
    return pin && pin === (window.ADMIN_PIN || "1234");
  } catch (e) {
    console.error("confirmerActionAdmin error:", e);
    return false;
  }
}


// --- Legacy compatibility: renderTeams shim ---
if (typeof renderTeams !== 'function') {
  function renderTeams(){
    try { if (typeof renderManageList === 'function') renderManageList(); } catch(e) { console.warn('renderManageList failed', e); }
    try { if (typeof updateWho === 'function') updateWho(); } catch(e) { console.warn('updateWho failed', e); }
    try { if (typeof renderTitle === 'function') renderTitle(); } catch(e) { console.warn('renderTitle failed', e); }
    try { if (typeof renderMatches === 'function') renderMatches(); } catch(e) { console.warn('renderMatches failed', e); }
    try { if (typeof renderLeaderboard === 'function') renderLeaderboard(); } catch(e) { console.warn('renderLeaderboard failed', e); }
    try { if (typeof renderH2H === 'function') renderH2H(); } catch(e) { /* optional */ }
  }
}
