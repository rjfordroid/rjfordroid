
/* ================================
   OUTILS UTILITAIRES
================================ */
function safeParseUser(str) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return { uid: str, credits: 0, username: "Anonyme", mes_cours: {} };
  }
}

/* ================================
   CHARGER LE CATALOGUE
================================ */
window.chargerCatalogue = async function () {
  const container = document.getElementById("catalogue-cours");
  const loading = document.getElementById("catalogue-loading");
  if (!container) return;

  if (loading) loading.style.display = "flex";

  const uid = localStorage.getItem("connectedUID");
  let currentUser = {};
  let userCredits = 0;
  let username = "Anonyme";

  if (uid) {
    const snapUser = await database.ref("RJFORDROID/USERS/" + uid).once("value");
    currentUser = snapUser.val() || {};
    userCredits = Number(currentUser.credits ?? 0);
    username = currentUser.username || "Anonyme";
  }

  const snapCours = await database.ref("RJFORDROID/COURE").once("value");

  container.innerHTML = "";
  if (loading) loading.style.display = "none";

  if (!snapCours.exists()) {
    container.innerHTML = "<p>Aucun cours disponible.</p>";
    return;
  }

  snapCours.forEach(child => {
    const courseId = child.key;
    const c = child.val();

    const likes = c.likes || {};
    const shares = c.shares || {};
    const numLikes = Object.keys(likes).length;
    const numShares = Object.keys(shares).length;
    const hasLiked = !!likes[username];

    const creditsCours = Number(c.credits ?? 0);
    const alreadyEnrolled = !!currentUser?.mes_cours?.[courseId];
    const bloque = creditsCours > 0 && userCredits < creditsCours && !alreadyEnrolled;

    const lessons = c.lessons || {};
    const totalLessons = Object.keys(lessons).length;
    const doneLessons = Object.keys(
      currentUser?.mes_cours?.[courseId]?.lessons || {}
    ).length;

    const progression = totalLessons
      ? Math.round((doneLessons / totalLessons) * 100)
      : 0;

    const card = document.createElement("div");
    card.className = "course-card";

    card.innerHTML = `
      <h4>${c.NomCours || "Sans titre"}</h4>
      <p>${c.DesCours || ""}</p>

      <div class="social-stats">
        <span onclick="toggleLike('${courseId}','${username}',${hasLiked})">
          <i class="${hasLiked ? 'fas' : 'far'} fa-heart"></i> ${numLikes}
        </span>
        <span>
          <i class="fas fa-share"></i> ${numShares}
        </span>
      </div>

        <div style="display:flex; flex-wrap:nowrap; gap:10px;">
                <small>📘 ${totalLessons} leçons</small>
      <small>📊 ${progression}%</small>
      <small>${creditsCours}Credits</small>
        </div>

      <div style="display:flex; flex-wrap:nowrap; gap:10px;">
        <button class="share-btn"
        onclick="patajeKou('${courseId}','${c.NomCours}','${username}')">
        Partager
      </button>

      ${
        alreadyEnrolled
          ? `<button disabled>Déjà inscrit</button>`
          : `<button ${bloque ? "disabled" : ""}
              onclick="inscrireCours('${courseId}',${creditsCours})">
              ${bloque ? "Crédits insuffisants" : "S’inscrire"}
            </button>`
      }
      </div>
    `;

    container.appendChild(card);
  });
};

/* ================================
   LIKE
================================ */
window.toggleLike = function (courseId, username, hasLiked) {
  if (!username) return;
  const ref = database.ref(`RJFORDROID/COURE/${courseId}/likes/${username}`);
  hasLiked ? ref.remove() : ref.set(Date.now());
};

/* ================================
   PARTAGE
================================ */
window.patajeKou = function (id, titre, username) {
  const url = location.href + "?id=" + id;
  const msg = `📚 ${titre}\n${url}`;

  database.ref(`RJFORDROID/COURE/${id}/shares`).push({
    user: username,
    date: Date.now()
  });

  if (navigator.share) {
    navigator.share({ title: titre, text: msg, url });
  } else {
    navigator.clipboard.writeText(msg);
    alert("Lien copié");
  }
};

/* ================================
   INSCRIPTION
================================ */
window.inscrireCours = async function (courseId, creditsCours) {
  const uid = localStorage.getItem("connectedUID");
  if (!uid) {
    animatedPopup("Veuillez vous connecter");
    return;
  }

  const userRef = database.ref("RJFORDROID/USERS/" + uid);
  const snap = await userRef.once("value");
  const user = snap.val();
  if (!user) return;

  const credits = Number(user.credits ?? 0);
  if (creditsCours > 0 && credits < creditsCours) {
    animatedPopup("Crédits insuffisants");
    return;
  }

  const updates = {
    [`mes_cours/${courseId}`]: { progression: 0, lessons: {} }
  };

  if (creditsCours > 0) {
    updates.credits = credits - creditsCours;
  }

  await userRef.update(updates);
  animatedPopup("Inscription réussie");
  chargerCatalogue();
};
/* ================================
   INIT
================================ */
document.addEventListener("DOMContentLoaded", () => {
  chargerCatalogue();
  afficherCoursInscrits();
});