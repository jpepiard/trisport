// JS OK roles2b — admin caché + équipes protégées + calendrier robuste + synchro Firebase
(function () {
  window.onerror = function (msg, src, line, col) {
    var el = document.getElementById("storage-warning");
    if (!el) return;
    el.style.display = "block";
    el.textContent =
      "Erreur JS : " +
      msg +
      " @" +
      (src || "") +
      ":" +
      (line || 0) +
      ":" +
      (col || 0);
  };

  document.addEventListener("DOMContentLoaded", function () {
    banner("JS OK roles2b");

    // ---------- Local storage
    var STORAGE_KEY = "tournoi_amis_roles2b";
    var MEMORY_ONLY = false;
    function saveLocal() {
      try {
        if (!MEMORY_ONLY)
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        MEMORY_ONLY = true;
        warnStorage();
      }
    }
    function loadLocal() {
      try {
        var raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
      } catch (e) {
        MEMORY_ONLY = true;
        return null;
      }
    }
    function warnStorage() {
      var el = id("storage-warning");
      if (el) {
        el.style.display = "block";
        el.textContent =
          "JS OK roles2b" +
          (MEMORY_ONLY ? " — ⚠️ stockage local indisponible" : "");
      }
    }
    function banner(msg) {
      var el = id("storage-warning");
      if (!el) return;
      el.style.display = "block";
      el.textContent = msg;
    }

    // ---------- State + session
    var state =
      loadLocal() || {
        version: 12,
        teams: [],
        matches: [],
        locked: false,
        createdAt: new Date().toISOString(),
        protect: { teamPassHash: {} },
      };
    var ui = { open: {}, h2h: false };

    // session locale (par tournoi) : admin + équipes "claim"
    var session = { admin: false, claims: {} };
    function sessionKey() {
      return "tournoi_session_" + (cloud.id || "local");
    }
    function loadSession() {
      try {
        var raw = localStorage.getItem(sessionKey());
        if (raw) {
          var s = JSON.parse(raw);
          if (s) session = s;
        }
      } catch (_) {}
      updateWho();
    }
    function saveSession() {
      try {
        localStorage.setItem(sessionKey(), JSON.stringify(session));
      } catch (_) {}
      updateWho();
    }

    // ---------- Firebase (compat)
    var cloud = { enabled: false, db: null, id: null, ref: null, lastRemoteAt: 0, pushTimer: null };
    var hasFB = !!(
      window.firebase &&
      window.FIREBASE_CONFIG &&
      window.FIREBASE_CONFIG.apiKey
    );

    function initFB() {
      if (!hasFB) return null;
      try {
        // firebase.apps peut être undefined → on sécurise
        var apps;
        try {
          apps = firebase.apps;
        } catch (_) {
          apps = [];
        }
        if (!apps || !Array.isArray(apps) || apps.length === 0) {
          firebase.initializeApp(window.FIREBASE_CONFIG);
        }
        return firebase.database();
      } catch (e) {
        console.warn("Firebase init error", e);
        return null;
      }
    }
    function setCloud(txt) {
      var el = id("cloud-status");
      if (el) el.textContent = txt;
    }

    function joinCloud(code) {
      if (!hasFB) {
        alert("Firebase non configuré (voir index.html).");
        return;
      }
      if (!cloud.db) {
        cloud.db = initFB();
        if (!cloud.db) {
          alert("Initialisation Firebase impossible.");
          return;
        }
      }
      cloud.id = (code || "").trim();
      if (!cloud.id) {
        alert("Saisis un code tournoi.");
        return;
      }
      cloud.ref = cloud.db.ref("tournaments/" + cloud.id + "/payload");
      cloud.enabled = true;
      setCloud("connexion…");
      loadSession();

      // Ecoute temps réel
      cloud.ref.on("value", function (snap) {
        var val = snap.val();
        if (!val) {
          pushCloud(true);
          return;
        }
        var remoteAt = +val.updatedAt || 0;
        if (remoteAt <= cloud.lastRemoteAt) return;
        cloud.lastRemoteAt = remoteAt;
        var newState = val.state || state;
        if (!newState.protect) newState.protect = { teamPassHash: {} };
        state = newState;
        saveLocal();
        renderAll();
        setCloud("connecté (" + cloud.id + ")");
      });

      // pousse un 1er état si nécessaire
      pushCloud(true);
      setCloud("connecté (" + cloud.id + ")");
      try {
        history.replaceState(
          null,
          "",
          location.pathname + "?v=roles2b&id=" + encodeURIComponent(cloud.id)
        );
      } catch (_) {}
    }

    function leaveCloud() {
      if (cloud.ref) cloud.ref.off();
      cloud.enabled = false;
      cloud.id = null;
      cloud.ref = null;
      setCloud("hors ligne");
      loadSession();
    }

    function pushCloud(immediate) {
      if (!cloud.enabled || !cloud.ref) return;
      var doPush = function () {
        cloud.ref.set({ state: state, updatedAt: Date.now() });
      };
      if (immediate) {
        clearTimeout(cloud.pushTimer);
        doPush();
      } else {
        clearTimeout(cloud.pushTimer);
        cloud.pushTimer = setTimeout(doPush, 250);
      }
    }

    // Auto-join si ?id=...
    (function () {
      var p = new URLSearchParams(location.search);
      var idp = p.get("id");
      if (idp) {
        id("cloud-id").value = idp;
        joinCloud(idp);
      }
    })();

    // ---------- Utils
    function uid() {
      return Math.random().toString(36).slice(2, 10);
    }
    function esc(s) {
      return (s == null ? "" : String(s)).replace(/[&<>"']/g, function (ch) {
        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        }[ch];
      });
    }
    function clampInt(v, min, max) {
      if (isNaN(v)) return null;
      if (v < min) return min;
      if (v > max) return max;
      return v;
    }
    function id(x) {
      return document.getElementById(x);
    }
    function qs(s) {
      return document.querySelector(s);
    }
    function qsa(s) {
      return Array.from(document.querySelectorAll(s));
    }
    function qsaIn(n, s) {
      return Array.from(n.querySelectorAll(s));
    }
    function help(t) {
      var d = document.createElement("div");
      d.className = "help";
      d.textContent = t;
      return d;
    }
    async function sha256(str) {
      try {
        if (window.crypto && window.crypto.subtle) {
          const enc = new TextEncoder().encode(str);
          const buf = await crypto.subtle.digest("SHA-256", enc);
          return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, "0"))
            .join("");
        }
      } catch (_) {}
      // Fallback simple (suffisant pour notre usage loisir)
      let h = 2166136261 >>> 0;
      for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = (h * 16777619) >>> 0;
      }
      return ("00000000" + h.toString(16)).slice(-8).repeat(8);
    }
    function salt() {
      return cloud.id || "local";
    }

    // ---------- Rôles & droits
    function isAdmin() {
      return !!session.admin;
    }
    function hasClaim(teamId) {
      return !!session.claims[teamId];
    }
    function canEditTeam(teamId) {
      return isAdmin() || (!state.locked && hasClaim(teamId));
    }
    function canEditMatch(m) {
      return isAdmin() || hasClaim(m.a) || hasClaim(m.b);
    }
    function teamName(tid) {
      var t = state.teams.find((x) => x.id === tid);
      return t ? t.name : "—";
    }
    function updateWho() {
      var who = id("whoami");
      if (!who) return;
      var role = isAdmin()
        ? "ADMIN"
        : Object.keys(session.claims || {}).length
        ? "équipe: " +
          Object.keys(session.claims)
            .map((k) => teamName(k))
            .filter(Boolean)
            .join(", ")
        : "visiteur (lecture seule)";
      who.textContent = "vous : " + role;
      var addBtn = id("btn-add-team");
      if (addBtn) addBtn.style.display = isAdmin() ? "inline-block" : "none";
    }

    // ---------- Tabs
    qsa(".tab").forEach(function (btn) {
      btn.addEventListener("click", function () {
        qsa(".tab").forEach((b) => b.setAttribute("aria-selected", "false"));
        btn.setAttribute("aria-selected", "true");
        qsa("main section").forEach((s) => s.classList.remove("active"));
        id(btn.getAttribute("data-tab")).classList.add("active");
      });
    });

    // ---------- Cloud UI
    onClick(id("btn-cloud-join"), function () {
      joinCloud(id("cloud-id").value.trim());
    });
    onClick(id("btn-cloud-leave"), function () {
      leaveCloud();
    });
    onClick(id("btn-cloud-copy"), function () {
      var code = id("cloud-id").value.trim();
      if (!code) {
        alert("Renseigne d’abord le code tournoi.");
        return;
      }
      var url =
        location.origin +
        location.pathname +
        "?v=roles2b&id=" +
        encodeURIComponent(code);
      navigator.clipboard && navigator.clipboard.writeText(url);
      alert("Lien copié !\n" + url);
    });

    // ---------- Admin ON/OFF (PIN jamais affiché)
    onClick(id("btn-admin-on"), function () {
      var pin = prompt("PIN administrateur :");
      if (pin === "30041991") {
        session.admin = true;
        saveSession();
        renderAll();
        alert("Mode administrateur activé.");
      } else {
        alert("PIN incorrect.");
      }
    });
    onClick(id("btn-admin-off"), function () {
      session.admin = false;
      saveSession();
      renderAll();
    });

    // ---------- Teams
    var teamListEl = id("team-list");

    onClick(id("btn-create-my-team"), async function () {
      if (state.locked) {
        alert("Calendrier figé : impossible de créer une équipe.");
        return;
      }
      var name = prompt("Nom de l'équipe :");
      if (!name) return;
      var p1 = prompt("Joueur·se 1 :") || "";
      var p2 = prompt("Joueur·se 2 :") || "";
      var pass = prompt("Mot de passe d'équipe (à retenir) :");
      if (!pass) return;
      var hash = await sha256(salt() + "|" + pass);
      var idt = uid();
      state.teams.push({ id: idt, name: name, p1: p1, p2: p2 });
      if (!state.protect) state.protect = { teamPassHash: {} };
      state.protect.teamPassHash[idt] = hash;
      session.claims[idt] = true;
      saveSession();
      saveState();
      renderTeams();
      updateCounts();
      updateLockUI();
      alert("Équipe créée et protégée. Conservez le mot de passe !");
    });

    onClick(id("btn-add-team"), function () {
      if (!isAdmin()) {
        alert("Réservé à l’admin.");
        return;
      }
      if (state.locked) {
        alert("Calendrier figé.");
        return;
      }
      state.teams.push({
        id: uid(),
        name: "Équipe " + (state.teams.length + 1),
        p1: "",
        p2: "",
      });
      saveState();
      renderTeams();
      updateCounts();
      updateLockUI();
    });

    onClick(id("btn-generate"), function () {
      if (!isAdmin()) {
        alert("Seul l’admin peut générer.");
        return;
      }
      if (state.locked) return;
      generateSchedule();
      state.locked = true;
      saveState();
      renderAll();
      var tab = qs('.tab[data-tab="calendrier"]');
      if (tab && tab.click) tab.click();
    });

    function renderTeams() {
      teamListEl.innerHTML = "";
      if (!Array.isArray(state.teams)) state.teams = [];
      if (state.teams.length === 0) {
        teamListEl.appendChild(
          help("Aucune équipe pour le moment. Ajoutez votre première équipe !")
        );
        updateCounts();
        updateLockUI();
        return;
      }
      state.teams.forEach(function (t, idx) {
        var iOwn = hasClaim(t.id),
          admin = isAdmin();
        var claimed =
          !!(state.protect &&
          state.protect.teamPassHash &&
          state.protect.teamPassHash[t.id]);
        var dis = !canEditTeam(t.id) ? " disabled" : "";
        var delBtn =
          admin && !state.locked
            ? '<button type="button" class="btn small danger" data-act="del" data-id="' +
              t.id +
              '">Supprimer</button>'
            : "";
        var protectInfo = claimed
          ? iOwn
            ? "🔒 vous êtes connecté à cette équipe"
            : "🔒 protégée"
          : "🔓 non protégée";
        var protectBtns =
          (iOwn || admin
            ? '<button type="button" class="btn small" data-act="setpass" data-id="' +
              t.id +
              '">Définir / changer mot de passe</button>'
            : "") +
          (!iOwn
            ? '<button type="button" class="btn small" data-act="login" data-id="' +
              t.id +
              '">Se connecter à cette équipe</button>'
            : '<button type="button" class="btn small" data-act="logout" data-id="' +
              t.id +
              '">Se déconnecter</button>');

        var card = document.createElement("div");
        card.className = "match-card";
        card.innerHTML =
          '<div class="match-head"><div class="teams"><span class="chip">#' +
          (idx + 1) +
          '</span> ' +
          '<input type="text"' +
          dis +
          ' value="' +
          esc(t.name) +
          '" data-field="name" data-id="' +
          t.id +
          '"/></div><div>' +
          delBtn +
          "</div></div>" +
          '<div class="match-body" style="display:block"><div class="grid cols-2">' +
          '<div><label>Joueur·se 1</label><input type="text"' +
          dis +
          ' value="' +
          esc(t.p1) +
          '" data-field="p1" data-id="' +
          t.id +
          '"/></div>' +
          '<div><label>Joueur·se 2</label><input type="text"' +
          dis +
          ' value="' +
          esc(t.p2) +
          '" data-field="p2" data-id="' +
          t.id +
          '"/></div>' +
          "</div>" +
          '<div class="help" style="margin-top:6px">' +
          protectInfo +
          "</div>" +
          '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">' +
          protectBtns +
          "</div>" +
          "</div>";
        teamListEl.appendChild(card);
      });

      // Handlers équipe
      qsa('#team-list input[data-field]').forEach(function (inp) {
        inp.addEventListener("input", function () {
          var tid = inp.getAttribute("data-id"),
            f = inp.getAttribute("data-field");
          if (!canEditTeam(tid)) return;
          var t = state.teams.find((x) => x.id === tid);
          if (!t) return;
          t[f] = inp.value;
          saveState();
          renderMatches();
          renderLeaderboard();
          renderH2H();
        });
      });
      qsa('#team-list [data-act="del"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          if (!isAdmin() || state.locked) return;
          var tid = btn.getAttribute("data-id");
          if (!confirm("Supprimer cette équipe ?")) return;
          state.teams = state.teams.filter((tt) => tt.id !== tid);
          state.matches = state.matches.filter(
            (m) => m.a !== tid && m.b !== tid
          );
          if (state.protect && state.protect.teamPassHash)
            delete state.protect.teamPassHash[tid];
          if (session.claims && session.claims[tid]) {
            delete session.claims[tid];
            saveSession();
          }
          saveState();
          renderTeams();
          renderMatches();
          renderLeaderboard();
          renderH2H();
          updateCounts();
        });
      });
      qsa('#team-list [data-act="setpass"]').forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var tid = btn.getAttribute("data-id");
          if (!(isAdmin() || hasClaim(tid))) {
            alert("Réservé à l’équipe ou à l’admin.");
            return;
          }
          var pass = prompt(
            "Nouveau mot de passe (équipe " + teamName(tid) + ") :"
          );
          if (!pass) return;
          var hash = await sha256(salt() + "|" + pass);
          if (!state.protect) state.protect = { teamPassHash: {} };
          state.protect.teamPassHash[tid] = hash;
          saveState();
          renderTeams();
          alert("Mot de passe mis à jour.");
        });
      });
      qsa('#team-list [data-act="login"]').forEach(function (btn) {
        btn.addEventListener("click", async function () {
          var tid = btn.getAttribute("data-id");
          var pass = prompt("Mot de passe de l’équipe " + teamName(tid) + " :");
          if (!pass) return;
          var hash = await sha256(salt() + "|" + pass);
          var ok =
            state.protect &&
            state.protect.teamPassHash &&
            state.protect.teamPassHash[tid] === hash;
          if (ok) {
            session.claims[tid] = true;
            saveSession();
            renderTeams();
            renderMatches();
            alert("Connexion à l’équipe réussie.");
          } else {
            alert("Mot de passe incorrect.");
          }
        });
      });
      qsa('#team-list [data-act="logout"]').forEach(function (btn) {
        btn.addEventListener("click", function () {
          var tid = btn.getAttribute("data-id");
          delete session.claims[tid];
          saveSession();
          renderTeams();
          renderMatches();
        });
      });

      updateCounts();
      updateLockUI();
    }

    function updateCounts() {
      id("teams-count").textContent =
        state.teams.length + " " + (state.teams.length > 1 ? "équipes" : "équipe");
      var perTeam = Math.max(0, state.teams.length - 1);
      id("rounds-count").textContent =
        perTeam + " " + (perTeam > 1 ? "matchs" : "match") + " par équipe";
    }

    // ---------- Calendrier (round-robin) robuste
    function generateSchedule() {
      var teamArr = Array.isArray(state.teams) ? state.teams : [];
      var ids = teamArr.map((t) => t.id);
      if (ids.length < 2) {
        state.matches = [];
        saveState();
        return;
      }

      var BYE = "__BYE__";
      if (ids.length % 2 === 1) ids.push(BYE);

      var fixed = ids[0];
      var rest = ids.slice(1);
      if (!Array.isArray(rest)) rest = [];

      // mélange sécurisé
      for (let i = rest.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        var tmp = rest[i];
        rest[i] = rest[j];
        rest[j] = tmp;
      }

      var n = ids.length,
        rounds = n - 1,
        out = [],
        order = 0;
      for (let r = 0; r < rounds; r++) {
        var arr = [fixed].concat(rest),
          half = n / 2,
          pairs = [];
        for (let k = 0; k < half; k++) {
          var a = arr[k],
            b = arr[n - 1 - k];
          if (a !== BYE && b !== BYE)
            pairs.push(r % 2 === 0 ? [a, b] : [b, a]);
        }
        // rotation sûre
        rest = [rest[rest.length - 1]].concat(rest.slice(0, rest.length - 1));

        // petit shift pour éviter répétitions d'adversaires dans l'ordre
        if (pairs.length > 1) {
          var shift = r % pairs.length;
          while (shift-- > 0) pairs.unshift(pairs.pop());
        }

        for (let p = 0; p < pairs.length; p++) {
          var pr = pairs[p];
          out.push({
            id: uid(),
            a: pr[0],
            b: pr[1],
            darts: [null, null, null],
            pingPts: [
              { a: null, b: null },
              { a: null, b: null },
              { a: null, b: null },
            ],
            palet: { a: null, b: null },
            round: r + 1,
            order: order++,
          });
        }
      }
      out.sort((x, y) => x.round - y.round || x.order - y.order);
      state.matches = out;
      saveState();
    }

    // ---------- Rencontres
    var matchListEl = id("match-list"),
      statsMatchesEl = id("stats-matches");

    function renderMatches() {
      matchListEl.innerHTML = "";
      if (!Array.isArray(state.matches) || state.matches.length === 0) {
        matchListEl.appendChild(help("Aucune rencontre planifiée."));
        statsMatchesEl.textContent = "0 / 0 matches complets";
        return;
      }
      var groups = {};
      state.matches.forEach(function (m) {
        (groups[m.round] = groups[m.round] || []).push(m);
      });
      var rounds = Object.keys(groups)
        .map((k) => +k)
        .sort((a, b) => a - b);
      var complete = 0,
        idx = 0;

      rounds.forEach(function (r) {
        var hdr = help("Journée " + r);
        hdr.style.fontWeight = "600";
        hdr.style.margin = "8px 0";
        matchListEl.appendChild(hdr);

        groups[r].forEach(function (m) {
          var wins = computeSetWins(m),
            pal = m.palet,
            palScore = pal.a != null && pal.b != null ? pal.a + "–" + pal.b : "—";
          var done = isMatchComplete(m);
          if (done) complete++;
          var can = canEditMatch(m);

          var el = document.createElement("div");
          el.className = "match-card";
          el.dataset.id = m.id;
          el.setAttribute(
            "aria-expanded",
            ui.open[m.id] !== undefined ? (ui.open[m.id] ? "true" : "false") : "true"
          );
          el.innerHTML =
            '<div class="match-head" data-expand>' +
            '<div class="teams"><span class="chip">#' +
            ++idx +
            "</span> " +
            esc(teamName(m.a)) +
            ' <span class="muted">vs</span> ' +
            esc(teamName(m.b)) +
            "</div>" +
            '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">' +
            '<span class="chip">Journée ' +
            (m.round || "?") +
            "</span>" +
            '<span class="chip">Fléchettes G: ' +
            wins.aw.darts +
            "-" +
            wins.bw.darts +
            "</span>" +
            '<span class="chip">Ping G: ' +
            wins.aw.ping +
            "-" +
            wins.bw.ping +
            "</span>" +
            '<span class="chip">Palet: ' +
            palScore +
            "</span>" +
            (done
              ? '<span class="pill" style="border-color:#2c6;color:#8fd">✅ Complet</span>'
              : '<span class="pill" style="border-color:#aa6;color:#ffc">⏳ Incomplet</span>') +
            '<span class="caret">▶</span></div></div>' +
            '<div class="match-body">' +
            renderDarts(m, can) +
            renderPing(m, can) +
            renderPalet(m, can) +
            '<div style="display:flex;justify-content:space-between;align-items:center;gap:8px;margin-top:8px">' +
            '<div class="help">' +
            (can ? "" : "Lecture seule — connectez-vous à une des deux équipes.") +
            "</div>" +
            "<div>" +
            (can
              ? '<button type="button" class="btn small" data-clear="' +
                m.id +
                '">Effacer ce match</button>'
              : "") +
            "</div></div></div>";

          el.querySelector("[data-expand]").addEventListener("click", function () {
            var isOpen = el.getAttribute("aria-expanded") === "true";
            el.setAttribute("aria-expanded", isOpen ? "false" : "true");
            ui.open[m.id] = !isOpen;
          });

          // darts
          qsaIn(el, "select[data-match][data-kind]").forEach(function (sel) {
            if (!can) sel.disabled = true;
            sel.addEventListener("change", function () {
              if (!can) return;
              var k = sel.getAttribute("data-kind"),
                ii = parseInt(sel.getAttribute("data-index"), 10);
              var v = sel.value === "" ? null : parseInt(sel.value, 10);
              var mm = findMatch(m.id);
              mm[k][ii] = v;
              saveState();
            });
          });

          // ping
          qsaIn(el, "input[data-ping]").forEach(function (inp) {
            if (!can) inp.disabled = true;
            inp.addEventListener("input", function () {
              if (!can) return;
              var w = inp.getAttribute("data-ping"),
                ii = parseInt(inp.getAttribute("data-index"), 10);
              var v = inp.value === "" ? null : clampInt(parseInt(inp.value, 10), 0, 99);
              var mm = findMatch(m.id);
              mm.pingPts[ii][w] = v;
              saveState();
            });
            inp.addEventListener("keydown", function (e) {
              if (e.key === "Enter") {
                e.preventDefault();
                inp.blur();
              }
            });
          });

          // palet
          qsaIn(el, "input[data-palet]").forEach(function (inp) {
            if (!can) inp.disabled = true;
            inp.addEventListener("input", function () {
              if (!can) return;
              var w = inp.getAttribute("data-palet");
              var v = inp.value === "" ? null : clampInt(parseInt(inp.value, 10), 0, 11);
              var mm = findMatch(m.id);
              mm.palet[w] = v;
              saveState();
            });
            inp.addEventListener("keydown", function (e) {
              if (e.key === "Enter") {
                e.preventDefault();
                inp.blur();
              }
            });
          });

          // clear
          var clr = el.querySelector("[data-clear]");
          if (clr)
            clr.addEventListener("click", function () {
              if (!can) return;
              clearMatch(m.id);
            });

          matchListEl.appendChild(el);
        });
      });
      statsMatchesEl.textContent =
        complete + " / " + state.matches.length + " matches complets";
    }

    function renderDarts(m, can) {
      var subs = ["Simple 1", "Simple 2", "Double"],
        names = [teamName(m.a), teamName(m.b)],
        html = "";
      for (var i = 0; i < 3; i++) {
        var v = m.darts[i];
        html +=
          '<div class="grid cols-3" style="align-items:end"><div>' +
          "<label>Fléchettes — " +
          subs[i] +
          "</label>" +
          "<select " +
          (can ? "" : "disabled ") +
          'data-match="' +
          m.id +
          '" data-kind="darts" data-index="' +
          i +
          '">' +
          '<option value="" ' +
          (v === null ? "selected" : "") +
          ">Non joué</option>" +
          '<option value="0" ' +
          (v === 0 ? "selected" : "") +
          ">Victoire " +
          esc(names[0]) +
          "</option>" +
          '<option value="1" ' +
          (v === 1 ? "selected" : "") +
          ">Victoire " +
          esc(names[1]) +
          "</option>" +
          "</select></div><div></div><div></div></div>";
      }
      return html;
    }
    function getPingPts(m) {
      return Array.isArray(m.pingPts)
        ? m.pingPts
        : [{ a: null, b: null }, { a: null, b: null }, { a: null, b: null }];
    }
    function isPingValid(a, b) {
      if (a == null || b == null) return false;
      if (isNaN(a) || isNaN(b)) return false;
      var max = Math.max(a, b),
        diff = Math.abs(a - b);
      return max >= 11 && diff >= 2;
    }
    function renderPing(m, can) {
      var labels = ["Simple 1", "Simple 2", "Double"],
        sets = getPingPts(m),
        html = "";
      for (var i = 0; i < 3; i++) {
        var s = sets[i] || { a: null, b: null },
          note =
            s.a == null || s.b == null
              ? "Saisissez deux scores (11+ et écart ≥ 2)."
              : isPingValid(s.a, s.b)
              ? "✔️ Score valide"
              : "⚠️ Vainqueur à 11+ et écart de 2 (11–9, 12–10…).";
        html +=
          '<div class="grid cols-4" style="align-items:end;margin-top:6px">' +
          "<div><label>Ping — " +
          labels[i] +
          " — " +
          esc(teamName(m.a)) +
          '</label><input ' +
          (can ? "" : "disabled ") +
          'type="number" min="0" max="99" step="1" value="' +
          (s.a == null ? "" : s.a) +
          '" data-ping="a" data-index="' +
          i +
          '"/></div>' +
          "<div><label>Ping — " +
          labels[i] +
          " — " +
          esc(teamName(m.b)) +
          '</label><input ' +
          (can ? "" : "disabled ") +
          'type="number" min="0" max="99" step="1" value="' +
          (s.b == null ? "" : s.b) +
          '" data-ping="b" data-index="' +
          i +
          '"/></div>' +
          '<div class="help">' +
          note +
          "</div><div></div></div>";
      }
      return html;
    }
    function renderPalet(m, can) {
      var a = m.palet.a,
        b = m.palet.b,
        note =
          a == null || b == null
            ? "Saisissez les deux scores (l’un doit être 11)."
            : (a === 11 && b >= 0 && b <= 10) ||
              (b === 11 && a >= 0 && a <= 10)
            ? "✔️ Score valide"
            : "⚠️ Un score doit être 11, l’autre entre 0 et 10.";
      return (
        '<div class="grid cols-4" style="align-items:end;margin-top:6px">' +
        "<div><label>Palet — " +
        esc(teamName(m.a)) +
        '</label><input ' +
        (can ? "" : "disabled ") +
        'type="number" min="0" max="11" step="1" value="' +
        (a == null ? "" : a) +
        '" data-palet="a"/></div>' +
        "<div><label>Palet — " +
        esc(teamName(m.b)) +
        '</label><input ' +
        (can ? "" : "disabled ") +
        'type="number" min="0" max="11" step="1" value="' +
        (b == null ? "" : b) +
        '" data-palet="b"/></div>' +
        '<div class="help">' +
        note +
        "</div><div></div></div>"
      );
    }

    function findMatch(idv) {
      return state.matches.find((x) => x.id === idv);
    }
    function clearMatch(idv) {
      var m = findMatch(idv);
      if (!m || !canEditMatch(m)) return;
      if (!confirm("Effacer tous les scores de ce match ?")) return;
      m.darts = [null, null, null];
      m.pingPts = [
        { a: null, b: null },
        { a: null, b: null },
        { a: null, b: null },
      ];
      m.palet = { a: null, b: null };
      saveState();
      renderMatches();
      renderLeaderboard();
      renderH2H();
    }

    // ---------- Classement
    function computeSetWins(m) {
      var aw = { darts: 0, ping: 0 },
        bw = { darts: 0, ping: 0 };
      m.darts.forEach(function (v) {
        if (v === 0) aw.darts++;
        else if (v === 1) bw.darts++;
      });
      getPingPts(m).forEach(function (s) {
        if (isPingValid(s.a, s.b)) {
          if (s.a > s.b) aw.ping++;
          else if (s.b > s.a) bw.ping++;
        }
      });
      return { aw: aw, bw: bw };
    }
    function isMatchComplete(m) {
      var okD = m.darts.every((v) => v === 0 || v === 1);
      var okP = getPingPts(m).every((s) => isPingValid(s.a, s.b));
      var pa = m.palet.a,
        pb = m.palet.b;
      var okL =
        pa != null &&
        pb != null &&
        ((pa === 11 && pb >= 0 && pb <= 10) || (pb === 11 && pa >= 0 && pa <= 10));
      return okD && okP && okL;
    }
    function computeLeaderboard() {
      var stats = {};
      state.teams.forEach(function (t) {
        stats[t.id] = {
          teamId: t.id,
          name: t.name,
          points: 0,
          dartsW: 0,
          pingW: 0,
          palFor: 0,
          palAg: 0,
          matchesComplete: 0,
        };
      });
      state.matches.forEach(function (m) {
        var A = stats[m.a],
          B = stats[m.b];
        m.darts.forEach(function (v) {
          if (v === 0) {
            A.dartsW++;
            A.points += 5;
          } else if (v === 1) {
            B.dartsW++;
            B.points += 5;
          }
        });
        getPingPts(m).forEach(function (s) {
          if (isPingValid(s.a, s.b)) {
            if (s.a > s.b) {
              A.pingW++;
              A.points += 5;
            } else if (s.b > s.a) {
              B.pingW++;
              B.points += 5;
            }
          }
        });
        var pa = m.palet.a,
          pb = m.palet.b;
        if (pa != null && pb != null) {
          A.palFor += pa;
          B.palFor += pb;
          A.palAg += pb;
          B.palAg += pa;
          A.points += pa;
          B.points += pb;
        }
        if (isMatchComplete(m)) {
          A.matchesComplete++;
          B.matchesComplete++;
        }
      });
      var rows = Object.values(stats);
      rows.sort(function (x, y) {
        return (
          y.points - x.points ||
          (y.palFor - y.palAg) - (x.palFor - x.palAg) ||
          (y.dartsW + y.pingW) - (x.dartsW + x.pingW) ||
          x.name.localeCompare(y.name)
        );
      });
      rows.forEach(function (r, i) {
        r.rank = i + 1;
      });
      return rows;
    }
    function renderLeaderboard() {
      var tbody = qs("#table-classement tbody");
      if (!tbody) return;
      tbody.innerHTML = "";
      computeLeaderboard().forEach(function (r) {
        var diff = r.palFor - r.palAg;
        var tr = document.createElement("tr");
        tr.innerHTML =
          "<td>" +
          r.rank +
          "</td><td>" +
          esc(r.name) +
          "</td><td><b>" +
          r.points +
          "</b></td><td>" +
          r.dartsW +
          "</td><td>" +
          r.pingW +
          "</td><td>" +
          r.palFor +
          "–" +
          r.palAg +
          ' <span class="muted">(' +
          (diff >= 0 ? "+" : "") +
          diff +
          ")</span></td><td>" +
          r.matchesComplete +
          "</td>";
        tbody.appendChild(tr);
      });
    }

    // ---------- H2H cliquable
    function pointsForTeamInMatch(m, teamId) {
      var isA = m.a === teamId,
        isB = m.b === teamId;
      if (!isA && !isB) return 0;
      var pts = 0;
      m.darts.forEach(function (v) {
        if (v === 0 && isA) pts += 5;
        else if (v === 1 && isB) pts += 5;
      });
      getPingPts(m).forEach(function (s) {
        if (isPingValid(s.a, s.b)) {
          if (s.a > s.b && isA) pts += 5;
          else if (s.b > s.a && isB) pts += 5;
        }
      });
      if (m.palet && m.palet.a != null && m.palet.b != null)
        pts += isA ? m.palet.a : m.palet.b;
      return pts;
    }
    function renderH2H() {
      var thead = qs("#table-h2h thead"),
        tbody = qs("#table-h2h tbody");
      if (!thead || !tbody) return;
      thead.innerHTML = "";
      tbody.innerHTML = "";
      var teams = state.teams.slice();
      if (!teams.length) {
        tbody.appendChild(help("Ajoutez des équipes pour voir la matrice."));
        return;
      }
      var trH = document.createElement("tr");
      trH.appendChild(document.createElement("th")).textContent = "Équipe";
      teams.forEach(function (t) {
        var th = document.createElement("th");
        th.textContent = t.name;
        trH.appendChild(th);
      });
      thead.appendChild(trH);

      var byPair = {};
      state.matches.forEach(function (m) {
        byPair[[m.a, m.b].sort().join("|")] = m;
      });

      teams.forEach(function (ti) {
        var tr = document.createElement("tr");
        var th = document.createElement("th");
        th.textContent = ti.name;
        tr.appendChild(th);
        teams.forEach(function (tj) {
          var td = document.createElement("td");
          if (ti.id === tj.id) {
            td.textContent = "—";
            tr.appendChild(td);
            return;
          }
          var m = byPair[[ti.id, tj.id].sort().join("|")];
          if (!m) {
            td.innerHTML = '<span class="h2h-badge h2h-pend">—</span>';
            tr.appendChild(td);
            return;
          }
          var pI = pointsForTeamInMatch(m, ti.id),
            pJ = pointsForTeamInMatch(m, tj.id);
          if (pI === 0 && pJ === 0) {
            td.innerHTML = '<span class="h2h-badge h2h-pend">•</span>';
          } else {
            var cls = pI > pJ ? "h2h-win" : pI < pJ ? "h2h-loss" : "h2h-pend";
            var tag = pI > pJ ? "W" : pI < pJ ? "L" : "=";
            td.innerHTML =
              '<span class="h2h-badge ' +
              cls +
              '">' +
              tag +
              " " +
              pI +
              "–" +
              pJ +
              "</span>";
          }
          td.className = "h2h-clickable";
          td.dataset.matchId = m.id;
          tr.appendChild(td);
        });
        tbody.appendChild(tr);
      });

      tbody.addEventListener("click", function (e) {
        var node = e.target;
        while (
          node &&
          node !== tbody &&
          !(node.tagName === "TD" && node.dataset.matchId)
        )
          node = node.parentNode;
        if (!node || node === tbody) return;
        goToMatch(node.dataset.matchId);
      });
    }
    function goToMatch(mid) {
      var tab = qs('.tab[data-tab="calendrier"]');
      tab && tab.click && tab.click();
      ui.open[mid] = true;
      setTimeout(function () {
        var card = qs('.match-card[data-id="' + mid + '"]');
        if (card) {
          card.setAttribute("aria-expanded", "true");
          try {
            card.scrollIntoView({ behavior: "smooth", block: "start" });
          } catch (_) {
            card.scrollIntoView();
          }
        }
      }, 0);
    }

    // ---------- Export/Import/Share
    onClick(id("btn-export"), function () {
      var data = JSON.stringify(state, null, 2);
      var blob = new Blob([data], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "tournoi-amis-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click();
      URL.revokeObjectURL(url);
    });
    var importFile = null;
    id("file-import").addEventListener("change", function (e) {
      importFile = e.target.files[0];
    });
    onClick(id("btn-import"), function () {
      if (!importFile) {
        alert("Sélectionnez un fichier JSON.");
        return;
      }
      importFile.text().then(function (text) {
        try {
          var data = JSON.parse(text);
          if (!(data && Array.isArray(data.teams) && Array.isArray(data.matches)))
            throw new Error("format");
          state = data;
          if (!state.protect) state.protect = { teamPassHash: {} };
          saveState();
          renderAll();
          alert("Import réussi !");
        } catch (e) {
          alert("Fichier invalide.");
        }
      });
    });
    onClick(id("btn-share"), function () {
      var json = JSON.stringify(state);
      var b64 = btoa(unescape(encodeURIComponent(json)));
      var enc = encodeURIComponent(b64);
      var url = location.origin + location.pathname + "?v=roles2b#s=" + enc;
      var inp = id("share-url");
      inp.value = url;
      inp.select();
      document.execCommand && document.execCommand("copy");
      navigator.clipboard && navigator.clipboard.writeText(url);
      alert("Lien (offline) copié !");
    });
    (function () {
      var m = location.hash.match(/^#s=([^&]+)$/);
      if (!m) return;
      try {
        var b64 = decodeURIComponent(m[1]);
        var json = decodeURIComponent(escape(atob(b64)));
        var data = JSON.parse(json);
        if (!(data && Array.isArray(data.teams) && Array.isArray(data.matches)))
          throw new Error("format");
        state = data;
        if (!state.protect) state.protect = { teamPassHash: {} };
        saveLocal();
        history.replaceState(null, "", location.pathname + location.search);
      } catch (_) {
        alert("Lien de partage invalide.");
      }
    })();

    // ---------- Reset & unlock (admin)
    onClick(id("btn-reset"), function () {
      var pin = prompt("PIN administrateur :");
      if (pin !== "30041991") {
        alert("PIN incorrect.");
        return;
      }
      if (!confirm("Confirmer la ré-initialisation complète du tournoi ?")) return;
      state = {
        version: 12,
        teams: [],
        matches: [],
        locked: false,
        createdAt: new Date().toISOString(),
        protect: { teamPassHash: {} },
      };
      session = { admin: false, claims: {} };
      saveSession();
      saveState();
      renderAll();
    });
    onClick(id("btn-unlock"), function () {
      if (!isAdmin()) {
        alert("Réservé à l’admin.");
        return;
      }
      if (!confirm("Déverrouiller le calendrier ?")) return;
      state.locked = false;
      saveState();
      renderTeams();
      renderMatches();
      updateLockUI();
    });

    // ---------- Divers helpers
    function updateLockUI() {
      var pill = id("lock-pill");
      if (pill) pill.style.display = state.locked ? "inline-block" : "none";
      var gen = id("btn-generate");
      if (gen) {
        gen.disabled = !!state.locked;
        gen.textContent = state.locked ? "Calendrier figé" : "Générer le calendrier";
      }
    }
    function onClick(el, fn) {
      if (el && el.addEventListener) el.addEventListener("click", fn);
    }

    // ---------- Sauvegarde + push cloud
    function saveState() {
      saveLocal();
      renderLeaderboard();
      if (cloud.enabled) pushCloud(false);
    }

    // ---------- Init complet
    loadSession();
    renderAll();
    warnStorage();
    showH2H(ui.h2h);
    setCloud(cloud.enabled ? "connecté" : "hors ligne");

    function renderAll() {
      renderTeams();
      renderMatches();
      renderLeaderboard();
      renderH2H();
      updateCounts();
      updateLockUI();
      updateWho();
    }

    // Toggle H2H
    function showH2H(on) {
      ui.h2h = !!on;
      var a = id("view-summary"),
        b = id("view-h2h"),
        btn = id("btn-toggle-h2h");
      if (a && b) {
        a.style.display = on ? "none" : "block";
        b.style.display = on ? "block" : "none";
      }
      if (btn) btn.textContent = on ? "Vue classement" : "Vue face-à-face";
      if (on) renderH2H();
    }
    onClick(id("btn-toggle-h2h"), function (e) {
      e.preventDefault();
      showH2H(!ui.h2h);
    });
    window.__toggleH2H = function () {
      showH2H(!ui.h2h);
    };

    // (optionnel) boutons "maj classement" / expand / collapse si présents
    onClick(id("btn-refresh-standings"), renderLeaderboard);
    onClick(id("btn-refresh-standings-2"), renderLeaderboard);
    onClick(id("btn-expand"), function () {
      qsa(".match-card").forEach(function (c) {
        c.setAttribute("aria-expanded", "true");
      });
    });
    onClick(id("btn-collapse"), function () {
      qsa(".match-card").forEach(function (c) {
        c.setAttribute("aria-expanded", "false");
      });
    });
  });
})();
