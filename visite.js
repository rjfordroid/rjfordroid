/*********************************
 * VISITE.JS – STATS FIREBASE v8
 *********************************/

const db = firebase.database();

// 🔹 ID inik itilizatè
function getUserId() {
  let id = localStorage.getItem("visitorId");
  if (!id) {
    id = "u-" + Math.random().toString(36).substr(2, 9);
    localStorage.setItem("visitorId", id);
  }
  return id;
}

// 🔹 Infos navigateur
function getUserInfo() {
  return {
    browser: navigator.userAgent.includes("Chrome") ? "Chrome" :
             navigator.userAgent.includes("Firefox") ? "Firefox" :
             navigator.userAgent.includes("Safari") ? "Safari" : "Autre",
    platform: navigator.platform
  };
}

// 🔹 Pays
async function getCountry() {
  try {
    const res = await fetch("https://ipapi.co/json/");
    const data = await res.json();
    return data.country_name || "Unknown";
  } catch {
    return "Unknown";
  }
}

// 🔹 Page actuelle + params
function getPageInfo() {
  const params = Object.fromEntries(new URLSearchParams(location.search).entries());
  let pageKey = "home";

  // Article si id
  if (params.id) pageKey = `article-${params.id}`;
  // Tab sinon
  else if (params.tab) pageKey = `tab-${params.tab}`;

  return { pageKey, params };
}

// 🔹 Sauvegarde visite
async function saveVisit(articleId = null) {
  const userId = getUserId();
  const info = getUserInfo();
  const country = await getCountry();
  const now = Date.now();
  const { pageKey, params } = getPageInfo();

  // 🔹 Visite individuelle
  const visitRef = db.ref("stats/visits").push();
  visitRef.set({
    userId,
    page: pageKey,
    articleId: articleId || null,
    country,
    browser: info.browser,
    platform: info.platform,
    timestamp: now,
    params
  });

  // 🔹 Stats agrégées
  db.ref(`stats/pages/${pageKey}/count`).transaction(c => (c || 0) + 1);
  db.ref(`stats/countries/${country}/count`).transaction(c => (c || 0) + 1);
  db.ref(`stats/browsers/${info.browser}/count`).transaction(c => (c || 0) + 1);
  if (articleId) db.ref(`stats/articles/${articleId}/views`).transaction(v => (v || 0) + 1);

  // 🔹 User online
  const onlineRef = db.ref(`stats/online/${userId}`);
  onlineRef.set({ page: pageKey, lastSeen: now });
  onlineRef.onDisconnect().remove();
}

// 🔹 Initial save + render stats
document.addEventListener("DOMContentLoaded", () => {
  saveVisit();
  renderStats();
});

// 🔹 Render stats
function renderStats() {
  // Pages
  db.ref("stats/pages").on("value", snap => {
    const ul = document.getElementById("statsListPages");
    if (!ul) return;
    ul.innerHTML = "";
    snap.forEach(p => {
      ul.innerHTML += `<li>${p.key} : ${p.val().count}</li>`;
    });
  });

  // Countries
  db.ref("stats/countries").on("value", snap => {
    const ul = document.getElementById("statsListPays");
    if (!ul) return;
    ul.innerHTML = "";
    snap.forEach(c => {
      ul.innerHTML += `<li>${c.key} : ${c.val().count}</li>`;
    });
  });

  // Browsers
  db.ref("stats/browsers").on("value", snap => {
    const ul = document.getElementById("statsListBrowsers");
    if (!ul) return;
    ul.innerHTML = "";
    snap.forEach(b => {
      ul.innerHTML += `<li>${b.key} : ${b.val().count}</li>`;
    });
  });

  // Users online
  db.ref("stats/online").on("value", snap => {
    const ul = document.getElementById("statsListUserOnline");
    if (!ul) return;
    ul.innerHTML = "";
    snap.forEach(u => {
      const lastSeen = new Date(u.val().lastSeen).toLocaleTimeString();
      ul.innerHTML += `<li>${u.key} – ${u.val().page} (dernière visite: ${lastSeen})</li>`;
    });
  });

  // Articles views
  db.ref("stats/articles").on("value", snap => {
    const ul = document.getElementById("statsListArticles");
    if (!ul) return;
    ul.innerHTML = "";
    snap.forEach(a => {
      ul.innerHTML += `<li>${a.key} : ${a.val().views}</li>`;
    });
  });
}