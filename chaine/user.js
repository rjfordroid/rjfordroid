function initUserAuth() {

  const loginTab     = document.getElementById('loginTab');
  const signupTab    = document.getElementById('signupTab');
  const loginForm    = document.getElementById('loginForm');
  const signupForm   = document.getElementById('signupForm');
  const loginMessage = document.getElementById('loginMessage');
  const signupMessage= document.getElementById('signupMessage');
  const logoutBtn    = document.getElementById('logoutBtn');
  const container = document.querySelector('.container');

  if (!loginTab || !signupTab) {
    console.warn("Auth DOM not ready");
    return;
  }

  /* SWITCH FORM */
  loginTab.addEventListener('click', () => {
    loginTab.classList.add('active');
    signupTab.classList.remove('active');
    loginForm.classList.add('active');
    signupForm.classList.remove('active');
    clearMessages();
  });

  signupTab.addEventListener('click', () => {
    signupTab.classList.add('active');
    loginTab.classList.remove('active');
    signupForm.classList.add('active');
    loginForm.classList.remove('active');
    clearMessages();
  });

  /* LOGIN */
  document.getElementById('login').addEventListener('submit', async e => {
    e.preventDefault();

    const identifier = loginUsername.value.trim();
    const password   = loginPassword.value.trim();

    showMessage(loginMessage, "Connexion...", "info");

    const snap = await firebase.database().ref("RJFORDROID/USERS").once("value");
    const users = snap.val() || {};

    let uid = null;
    for (const k in users) {
      const u = users[k];
      if (
        (u.username === identifier || u.email === identifier) &&
        u.password === password
      ) {
        uid = k;
        break;
      }
    }

    if (!uid) {
      showMessage(loginMessage, "Identifiants incorrects", "error");
      return;
    }

    localStorage.setItem("connectedUID", uid);
    showMessage(loginMessage, "Connexion réussie", "success");
    setTimeout(() => container.style.display='none', 500);
    reload();
  });
  function reload() {
  // ⛔ Si deja rechargé une fois, on stop
  if (sessionStorage.getItem("reloaded")) {
    sessionStorage.removeItem("reloaded");
    return;
  }

  // ✅ Marque que le reload est volontaire
  sessionStorage.setItem("reloaded", "yes");
  location.reload();
}

  /* SIGNUP */
  document.getElementById('signup').addEventListener('submit', async e => {
    e.preventDefault();

    const pass = password.value;
    if (pass !== confirmPassword.value) {
      showMessage(signupMessage, "Mots de passe différents", "error");
      return;
    }

    const ref = firebase.database().ref("RJFORDROID/USERS");
    const snap = await ref.once("value");
    const users = snap.val() || {};

    for (const k in users) {
      if (users[k].username === username.value || users[k].email === email.value) {
        showMessage(signupMessage, "Utilisateur existant", "error");
        return;
      }
    }

    const newRef = ref.push();
    await newRef.set({
      fullName: fullName.value,
      username: username.value,
      email: email.value,
      phone: phone.value,
      password: pass,
      credits: 10,
      isAdmin: false,
      createdAt: Date.now()
    });

    localStorage.setItem("connectedUID", newRef.key);
    showMessage(signupMessage, "Compte créé", "success");
    setTimeout(() => container.style.display='none', 700);
  });

  /* LOGOUT */
  logoutBtn?.addEventListener('click', () => {
    localStorage.removeItem("connectedUID");
    location.reload();
  });
}

/* Utils */
function clearMessages() {
  loginMessage && (loginMessage.style.display = "none");
  signupMessage && (signupMessage.style.display = "none");
}

function showMessage(el, msg, type) {
  el.textContent = msg;
  el.className = `message ${type}`;
  el.style.display = "block";
}