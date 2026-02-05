/*********************************
 * FIREBASE INIT
 *********************************/
const firebaseConfig = {
  apiKey: "AIzaSyAQeHWr_vUiQmVVgJJ_cOF9qrCCLd7IJNc",
  authDomain: "ayiweb.firebaseapp.com",
  databaseURL: "https://ayiweb-default-rtdb.firebaseio.com",
  projectId: "ayiweb",
  storageBucket: "ayiweb.appspot.com",
  messagingSenderId: "115054504556",
  appId: "1:115054504556:web:ccd713ba01dd8f02830649"
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}

const database = firebase.database();

/*********************************
 * LOCAL STORAGE HELPERS
 *********************************/
const STORAGE_KEY = "connectedUID";
let userPanel = null;
let overlay = null;


function getConnectedUID() {
  return localStorage.getItem(STORAGE_KEY);
}

function setConnectedUID(uid) {
  localStorage.setItem(STORAGE_KEY, uid);
}

function clearConnectedUID() {
  localStorage.removeItem(STORAGE_KEY);
}

async function verifierAdmin() {
  const btnAdm = document.getElementById("btnAdmin");
  if (!btnAdm) return;

  const uid = getConnectedUID();
  if (!uid) {
    btnAdm.style.display = "none";
    return;
  }

  const user = await getUserByUID(uid);
  btnAdm.style.display = user?.isAdmin ? "block" : "none";
}

function verifierConnexion() {
  const uid = getConnectedUID();
  const container = document.querySelector(".container"); // login box
  const btnConect = document.getElementById('btnConect');
  const btnLogout = document.getElementById('btnLogout');

  if (!container || !btnConect || !btnLogout) return;

  if (uid) {
    // ✅ itilizatè konekte
    btnConect.style.display = "none";
    btnLogout.style.display = "block";
    container.style.display = "none"; // cache login box

    displayConnectedUser();
    verifierAdmin();
  } else {
    // ❌ pa konekte
    btnConect.style.display = "block";
    btnLogout.style.display = "none";
    container.style.display = "none"; // login box pa montre
  }
}

function logout() {
  animatedPopup("Voulez-vous vraiment ?", async () => {
    try {
      if (firebase.auth) {
        await firebase.auth().signOut();
      }

      localStorage.clear();

      // Reset UI
      const usernameEl = document.querySelector(".userHeader .username");
      const creditEl = document.querySelector(".userHeader .usercredit");
      if (usernameEl) usernameEl.textContent = "user";
      if (creditEl) creditEl.textContent = "0.00";

      verifierConnexion(); // rafrechi bouton Connect/Logout
      verifierAdmin();

      console.log("✅ Utilisateur déconnecté avec confirmation");

    } catch (e) {
      console.error("Erreur logout :", e);
      alert("Erreur lors de la déconnexion");
    }
  });
}

function conect() {
  const container = document.querySelector(".container");
  if (container) container.style.display = "flex";
}

// ⚡ Rele sa lè paj la chaje
document.addEventListener("DOMContentLoaded", verifierConnexion);

/*********************************
 * UI HELPERS
 *********************************/
function showMessage(el, msg, type = "info") {
  if (!el) return;
  el.textContent = msg;
  el.className = `message ${type}`;
  el.style.display = "block";

  if (type !== "info") {
    setTimeout(() => (el.style.display = "none"), 4000);
  }
}

/*********************************
 * USER FETCH
 *********************************/
async function getUserByUID(uid) {
  if (!uid) return null;
  const snap = await database.ref(`RJFORDROID/USERS/${uid}`).once("value");
  return snap.exists() ? snap.val() : null;
}

/*********************************
 * DISPLAY CONNECTED USER
 *********************************/
async function displayConnectedUser() {
  const uid = getConnectedUID();
  if (!uid) return;

  const user = await getUserByUID(uid);
  if (!user) return;

  const container = document.querySelector(".container");
  if (container) container.style.display = "none"; // kache login/signup si konekte

  const usernameEl = document.querySelector(".userHeader .username");
  const creditEl = document.querySelector(".userHeader .usercredit");

  if (usernameEl) usernameEl.textContent = user.username || user.username || "Utilisateur";
  if (creditEl) creditEl.textContent = `${Number(user.credits || 0).toFixed(2)} C`;
}

/*********************************
 * LOGOUT
 *********************************/
/*********************************
 * POPUP
 *********************************/
function animatedPopup(message, onConfirm) {
  const overlay = document.createElement("div");
  overlay.className = "popup-overlay";

  overlay.innerHTML = `
    <div class="popup-box">
      <p>${message}</p>
      <div class="actions">
        <button id="popupCancel">Annuler</button>
        <button id="popupOk">OK</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById("popupCancel").onclick = () => overlay.remove();
  document.getElementById("popupOk").onclick = () => {
    overlay.remove();
    if (typeof onConfirm === "function") onConfirm();
  };
}

/*********************************
 * DEVICE BLOCKER
 *********************************/
function showDeviceBlocker() {
  if (window.innerWidth > 768) return;

  const blocker = document.createElement("div");
  blocker.className = "device-blocker";
  blocker.innerHTML = `
    <div class="box">
      <h3>App Android uniquement</h3>
      <p>Utilisez un smartphone en mode portrait.</p>
    </div>
  `;
  document.body.appendChild(blocker);
}

// =============aw==== HEADER =================
function loadMainHeader() {
  const header = document.createElement("header");
  header.className = "header";

  header.innerHTML = `
    <div class="userData">
      <div class="logo">
        <img src="logo1.png" alt="">
      </div>
      <h1>RJFORDROID</h1>
      <div class="userHeader">
        <span class="username">user</span><br>
        <span class="usercredit">0.00</span>
      </div>
    </div>
  `;

  document.body.prepend(header);
  
}


function loadMainSignLog() {
  const signLog = document.createElement("signLog");
  signLog.className = "signLog";

  signLog.innerHTML = `
    <div class="container">
        <div class="form-container">
            <div class="form-switch">
                <button id="loginTab" class="active">Login</button>
                <button id="signupTab">Sign Up</button>
            </div>
            
            <!-- Login Form -->
            <div id="loginForm" class="form active">
                <h2>Welcome Back</h2>
                <p class="subtitle">Sign in to your account to continue</p>
                
                <div id="loginMessage" class="message"></div>
                
                <form id="login">
                    <div class="form-group">
                        <label for="loginUsername">Username or Email</label>
                        <input type="text" id="loginUsername" placeholder="Enter username or email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="loginPassword">Password</label>
                        <input type="password" id="loginPassword" placeholder="Enter password" required>
                    </div>
                    
                    <button type="submit" class="btn">Sign In</button>
                </form>
            </div>
            
            <!-- Signup Form -->
            <div id="signupForm" class="form">
                <h2>Create Account</h2>
                <p class="subtitle">Fill in your details to get started</p>
                
                <div id="signupMessage" class="message"></div>
                
                <form id="signup">
                    <div class="form-group">
                        <label for="fullName">Full Name</label>
                        <input type="text" id="fullName" placeholder="Enter your full name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="username">Username</label>
                        <input type="text" id="username" placeholder="Choose a username" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="email">Email</label>
                        <input type="email" id="email" placeholder="Enter your email" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="phone">Phone Number</label>
                        <input type="tel" id="phone" placeholder="Enter phone number" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="password">Password</label>
                        <input type="password" id="password" placeholder="Create a password" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="confirmPassword">Confirm Password</label>
                        <input type="password" id="confirmPassword" placeholder="Confirm password" required>
                    </div>
                    
                    <button type="submit" class="btn">Create Account</button>
                </form>
            </div>
            
            <!-- User Info Section -->
            <div id="userInfo" class="user-info">
                <h4>User Profile</h4>
                <div class="user-details">
                    <div class="detail-item">
                        <div class="detail-label">Full Name</div>
                        <div class="detail-value" id="infoFullName"></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Username</div>
                        <div class="detail-value" id="infoUsername"></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Email</div>
                        <div class="detail-value" id="infoEmail"></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Phone</div>
                        <div class="detail-value" id="infoPhone"></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Credits</div>
                        <div class="detail-value" id="infoCredits"></div>
                    </div>
                    <div class="detail-item">
                        <div class="detail-label">Admin</div>
                        <div class="detail-value" id="infoAdmin"></div>
                    </div>
                </div>
                <button id="logoutBtn" class="btn logout-btn">Logout</button>
            </div>
        </div>
        
        <div class="image-container">
            <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
            </svg>
            <h3>Welcome to Our Platform</h3>
            <p>Join thousands of users who trust us with their data</p>
        </div>
    </div>
  `;

  document.body.prepend(signLog);

/* 🔥 ICI ET SEULEMENT ICI */
initUserAuth();
  const foldersToTry = ["images/", "../images/", "./images/", "/images/", "/", "../", "./"];

// Fonksyon pou teste chemen pou yon imaj
function tryPaths(img) {
  const original = img.getAttribute('src');
  if (!original) return;

  let index = 0;

  function next() {
    if (index >= foldersToTry.length) return; // fini
    img.onerror = next; // si li fail, teste pwochen
    img.src = foldersToTry[index] + original;
    index++;
  }

  next(); // premye tès
}

// Aplike sou tout img ki gen src
document.querySelectorAll('img[src]').forEach(tryPaths);
}

// ================= FOOTER a=================
function loadMainFooter() {
  const footer = document.createElement("footer");
  footer.className = "footer";

  footer.innerHTML = `
   <header class="tabs">
    <button id="btnHome">Home</button>
    <button id="btnList">A Lire</button>
    <button id="btnLogout" onclick="logout()">Logout</button>
    <button id="btnConect" onclick="conect()">Connectez</button>
    <button id="btnAdmin">Admin</button>
  </header>
`;
document.body.appendChild(footer);
verifierAdmin();
}
 

console.log("visite.js chargé");

window.addEventListener('load', () => {

    console.log("window load déclenché");

    // --- Vérifications vitales ---
    if (typeof firebase === 'undefined') {
        console.error("Firebase pa chaje. Tcheke lòd script yo.");
        return;
    }

    if (!firebase.apps.length) {
        console.error("Firebase pa initialisé. initializeApp manke.");
        return;
    }

    console.log("Firebase OK");

    const database = firebase.database();

    // --- ID navigateur unique (format fixe: ID-Broswer12345678) ---
    function jwennBrowserID() {
        const key = 'browser_id';
        let bid = localStorage.getItem(key);
        if (!bid) {
            // Kreye ID fiks ak 8 chif random
            const randomNumber = Math.floor(Math.random() * 90000000) + 10000000; // 8 chif
            bid = 'ID-Broswer' + randomNumber;
            localStorage.setItem(key, bid);
        }
        return bid;
    }

    // --- Enregistrement visite ---
    async function anrejistreVizit() {
        try {
            let locationData = {};

            // IP facultative (ne bloque jamais l’enregistrement)
            try {
                const res = await fetch('https://ipapi.co/json/');
                locationData = await res.json();
            } catch (_) {
                console.warn("IP non disponible");
            }

            const elTitre = document.getElementById('display-titre');
            let titrePage = elTitre ? elTitre.innerText.trim() : document.title;

            if (!titrePage || titrePage === "Chaje...") {
                titrePage = document.title || "Page inconnue";
            }

            const data = {
                Visit: titrePage,
                Pays: locationData.country_name || "Enkoni",
                ip: locationData.ip || "0.0.0.0",
                Date_visite: new Date().toLocaleString(),
                Usernavigater: navigator.userAgent,
                BrowserID: jwennBrowserID(),
                Path: window.location.pathname
            };

            await database.ref("RJFORDROID/visites").push(data);
            console.log("✅ Visite enregistrée :", titrePage);

        } catch (err) {
            console.error("❌ Erreur enregistrement visite :", err);
        }
    }

    // --- Déclenchement GARANTI (1 seule fois) ---
    let dejaFait = false;

    function triggerVisite() {
        if (dejaFait) return;
        dejaFait = true;
        console.log("🚀 Déclenchement visite");
        anrejistreVizit();
    }

    // 1️⃣ Immédiat (pages simples)
    triggerVisite();

    // 2️⃣ Sécurité SPA / contenu dynamique
    const titre = document.getElementById('display-titre');
    if (titre) {
        const obs = new MutationObserver(() => triggerVisite());
        obs.observe(titre, {
            childList: true,
            characterData: true,
            subtree: true
        });
    }

    // 3️⃣ Ultime filet de sécurité
    setTimeout(triggerVisite, 3000);
});

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", () => {
  loadMainHeader();      // 1️⃣ Chaje header la
  loadMainFooter();      // 2️⃣ Chaje footer la
  loadMainSignLog();     // 3️⃣ Chaje login/signup box
  showDeviceBlocker();   // 4️⃣ Device warning pou mobile

  verifierConnexion();   // 5️⃣ Verifye si itilizatè konekte
  // displayConnectedUser() ap kouri anndan verifierConnexion() si itilizatè konekte
});