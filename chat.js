/*********************************
 * ELEMENTS UI
 *********************************/
const chatArea = document.getElementById("chatArea");
const messageInput = document.getElementById("messageInput");
const sendBtn = document.getElementById("sendBtn");
const chatClientEtAdm = document.querySelector(".chatClientEtAdm");

// Toggle sidebar clients
const toggleBtn = document.getElementById("toggleClientsBtn");
const sidebar = document.querySelector(".chatClientEtAdm.sidebar");

toggleBtn.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

/*********************************
 * NOTIFICATIONS & SOUND
 *********************************/
let notificationPermission = false;
let audioContext;
let unlockAudio;

// Demande pèmisyon notifikasyon
function requestNotificationPermission() {
  if ("Notification" in window) {
    Notification.requestPermission().then(permission => {
      notificationPermission = permission === "granted";
      console.log("Notification permission:", notificationPermission);
    });
  }
}

// Kreye konteks odyo pou son
function createAudioContext() {
  if (!audioContext) {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // Fonksyon pou deboke odyo sou klik
    unlockAudio = () => {
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }
    };
    
    // Ajoute event listener pou deboke odyo
    document.addEventListener("click", unlockAudio);
    document.addEventListener("touchstart", unlockAudio);
    document.addEventListener("keydown", unlockAudio);
  }
}

// Son notifikasyon
function playNotificationSound(type = "message") {
  try {
    createAudioContext();
    
    if (audioContext.state === "suspended") {
      audioContext.resume();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    // Konfigire son selon kalite notifikasyon
    if (type === "message") {
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    } else if (type === "new_chat") {
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime);
      oscillator.frequency.setValueAtTime(1200, audioContext.currentTime + 0.1);
      oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.2);
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    }
    
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
  } catch (error) {
    console.warn("Could not play sound:", error);
  }
}

// Kreye notifikasyon navigatè
function showBrowserNotification(title, message, icon = null) {
  if (!notificationPermission) return;
  
  if ("Notification" in window && Notification.permission === "granted") {
    const options = {
      body: message,
      icon: icon || "/icon.png",
      badge: "/badge.png",
      tag: "chat-notification",
      renotify: true,
      requireInteraction: false,
      silent: false
    };
    
    const notification = new Notification(title, options);
    
    // Ouvri chat la lè notifikasyon an klike
    notification.onclick = function() {
      window.focus();
      notification.close();
      
      // Si gen client aktif, mete li devan
      if (currentClientUID) {
        const clientElement = clients[currentClientUID]?.element;
        if (clientElement) {
          clientElement.scrollIntoView({ behavior: "smooth" });
        }
      }
    };
    
    // Fem notifikasyon otomatikman apre 5 segond
    setTimeout(() => notification.close(), 5000);
  }
}

// Vibrasyon pou telefòn
function vibrateIfSupported(pattern = [100, 50, 100]) {
  if ("vibrate" in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      console.warn("Vibration failed:", e);
    }
  }
}

/*********************************
 * UTILS
 *********************************/
function getConnectedUID() {
  return localStorage.getItem("connectedUID");
}

async function getUserByUID(uid) {
  if (!uid) return null;
  const snap = await firebase.database().ref(`RJFORDROID/USERS/${uid}`).once("value");
  return snap.exists() ? snap.val() : null;
}

/*********************************
 * ENVOI MESSAGE (COMMUN)
 *********************************/
async function envoyerMessage() {
  const uid = getConnectedUID();
  if (!uid) {
    alert("Veuillez vous connecter");
    return;
  }

  const text = messageInput.value.trim();
  if (!text) return;

  const user = await getUserByUID(uid);
  
  if (user?.isAdmin) {
    // Si se admin k ap ekri
    await envoyerMessageAdmin();
  } else {
    // Si se client k ap ekri
    await envoyerMessageClient();
  }
}

/*********************************
 * ENVOI MESSAGE CLIENT → ADMIN
 *********************************/
async function envoyerMessageClient() {
  const uidClient = getConnectedUID();
  const text = messageInput.value.trim();
  const timestamp = Date.now();
  const user = await getUserByUID(uidClient);

  // 1️⃣ Sauvegarde côté client
  await firebase.database()
    .ref(`RJFORDROID/CHAT/conversations/${uidClient}/messages`)
    .push({ from: "client", text, timestamp });

  // 2️⃣ Envoyer à tout admin automatiquement
  const snap = await firebase.database()
    .ref("RJFORDROID/USERS")
    .orderByChild("isAdmin")
    .equalTo(true)
    .once("value");

  if (snap.exists()) {
    const admins = snap.val();
    for (const adminUID of Object.keys(admins)) {
      await firebase.database()
        .ref(`RJFORDROID/USERS/${adminUID}/inbox`)
        .push({ 
          from: uidClient, 
          username: user.username, 
          text, 
          timestamp, 
          read: false 
        });
    }
  }

  afficherMessage(text, "client", "Moi", timestamp);
  messageInput.value = "";
  sendBtn.disabled = true;
}

/*********************************
 * ENVOI MESSAGE ADMIN → CLIENT
 *********************************/
async function envoyerMessageAdmin() {
  if (!currentClientUID) return alert("Sélectionnez un client.");

  const text = messageInput.value.trim();
  const timestamp = Date.now();
  const uidAdmin = getConnectedUID();
  const adminUser = await getUserByUID(uidAdmin);

  // 1️⃣ Save message in conversation
  await firebase.database()
    .ref(`RJFORDROID/CHAT/conversations/${currentClientUID}/messages`)
    .push({ from: "admin", text, timestamp });

  // 2️⃣ Save in client inbox
  await firebase.database()
    .ref(`RJFORDROID/USERS/${currentClientUID}/inbox`)
    .push({ 
      from: uidAdmin, 
      username: adminUser.username, 
      text, 
      timestamp, 
      read: false 
    });

  // Show message locally as "Moi"
  afficherMessage(text, "admin", "Moi", timestamp);
  
  messageInput.value = "";
  sendBtn.disabled = true;
}

/*********************************
 * LISTE CLIENTS POU ADMIN
 *********************************/
let currentClientUID = null;
const clients = {};

/*********************************
 * CHARGE NON-ADMIN USERS POU ADMIN
 *********************************/
async function chargerClients() {
  const uid = getConnectedUID();
  if (!uid) return;

  const user = await getUserByUID(uid);
  if (!user?.isAdmin) return; // Se sèlman admin

  const snap = await firebase.database()
    .ref("RJFORDROID/USERS")
    .orderByChild("isAdmin")
    .equalTo(false)
    .once("value");

  const allUsers = snap.val() || {};

  Object.keys(allUsers).forEach(uID => {
    const usr = allUsers[uID];
    if (!usr.username) return;
    if (clients[uID]) return;

    const el = document.createElement("div");
    el.className = "client-item";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "space-between";
    el.style.padding = "5px 10px";
    el.style.cursor = "pointer";
    el.style.borderBottom = "1px solid #eee";

    // Avatar
    const avatar = document.createElement("div");
    avatar.innerText = usr.username.charAt(0).toUpperCase();
    avatar.style.width = "35px";
    avatar.style.height = "35px";
    avatar.style.borderRadius = "50%";
    avatar.style.display = "flex";
    avatar.style.alignItems = "center";
    avatar.style.justifyContent = "center";
    avatar.style.marginRight = "10px";
    avatar.style.color = "#fff";
    avatar.style.fontWeight = "bold";
    avatar.style.backgroundColor = getRandomColor();

    // Info client
    const infoEl = document.createElement("div");
    infoEl.style.flex = "1";
    infoEl.innerHTML = `
      <strong>${usr.username}</strong><br>
      📞 ${usr.phone || "N/A"} | 💰 ${Number(usr.credits || 0).toFixed(2)}
    `;

    // Badge pou mesaj nouvo
    const badge = document.createElement("span");
    badge.className = "msg-badge";
    badge.style.backgroundColor = "#e74c3c";
    badge.style.color = "#fff";
    badge.style.borderRadius = "50%";
    badge.style.padding = "2px 6px";
    badge.style.fontSize = "12px";
    badge.style.display = "none";

    el.appendChild(avatar);
    el.appendChild(infoEl);
    el.appendChild(badge);
    chatClientEtAdm.appendChild(el);

    clients[uID] = { ...usr, element: el, badge };

    // Badge live update ak notifikasyon
    const refreshBadge = async () => {
      const inboxSnap = await firebase.database().ref(`RJFORDROID/USERS/${uid}/inbox`).once("value");
      const inbox = inboxSnap.val() || {};
      let unreadCount = 0;
      let newMessage = false;
      
      Object.values(inbox).forEach(msg => {
        if (msg.from === uID && !msg.read) {
          unreadCount++;
          newMessage = true;
        }
      });
      
      if (unreadCount > 0) {
        badge.textContent = unreadCount;
        badge.style.display = "inline-block";
        
        // Si gen nouvo mesaj epi konvèsasyon an pa ouvri
        if (newMessage && currentClientUID !== uID) {
          // Jwe son notifikasyon
          playNotificationSound("message");
          
          // Vibrasyon
          vibrateIfSupported();
          
          // Notifikasyon navigatè
          if (document.hidden) {
            showBrowserNotification(
              `Nouvo mesaj nan ${usr.username}`,
              `📩 ${inbox[Object.keys(inbox)[Object.keys(inbox).length - 1]]?.text?.substring(0, 50) || "Nouvo mesaj"}...`
            );
          }
          
          // Animation badge
          badge.style.animation = "pulse 1s infinite";
          setTimeout(() => {
            badge.style.animation = "";
          }, 2000);
        }
      } else {
        badge.style.display = "none";
      }
    };

    // Listener real-time pou mesaj
    firebase.database().ref(`RJFORDROID/USERS/${uid}/inbox`).on("value", refreshBadge);
    
    // Listener pou tout konvèsasyon
    firebase.database().ref(`RJFORDROID/CHAT/conversations/${uID}/messages`).on("child_added", async (snap) => {
      const msg = snap.val();
      
      // Si mesaj la soti nan client e admin an pa nan konvèsasyon sa a
      if (msg.from === "client" && currentClientUID !== uID) {
        // Jwe son diferan pou nouvo konvèsasyon
        playNotificationSound("new_chat");
        
        // Ajoute efè vizyèl sou item client la
        el.style.backgroundColor = "rgba(255, 235, 59, 0.3)";
        setTimeout(() => {
          el.style.backgroundColor = "";
        }, 1000);
      }
    });
    
    refreshBadge();

    // Klike sou client
    el.addEventListener("click", async () => {
      ouvrirConversation(uID, usr.username);

      // Mark messages as read
      const inboxSnap = await firebase.database().ref(`RJFORDROID/USERS/${uid}/inbox`).once("value");
      const inbox = inboxSnap.val() || {};
      for (const msgID of Object.keys(inbox)) {
        const msg = inbox[msgID];
        if (msg.from === uID && !msg.read) {
          await firebase.database().ref(`RJFORDROID/USERS/${uid}/inbox/${msgID}`).update({ read: true });
        }
      }
      refreshBadge();
    });
  });
}

/*********************************
 * AFFICHAGE MESSAGES AMÉLIORÉ
 *********************************/
function afficherMessage(text, senderType, senderName = "", timestamp = null) {
  const msg = document.createElement("div");
  msg.className = `chat-message ${senderType}`;
  
  // Detèmine non ki pou parèt
  let displayName = senderName;
  if (!displayName) {
    displayName = senderType === "client" ? "Moi" : "Admin";
  }
  
  // Ajoute data-sender pou CSS
  msg.setAttribute("data-sender", displayName);
  
  // Kreye kontni mesaj la
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.textContent = text;
  
  // Ajoute timestamp si genyen
  if (timestamp) {
    const timeElement = document.createElement("span");
    timeElement.className = "message-time";
    const date = new Date(timestamp);
    timeElement.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msg.appendChild(messageContent);
    msg.appendChild(timeElement);
  } else {
    msg.appendChild(messageContent);
  }
  
  // Ajoute klas pou animasyon nouvo mesaj
  msg.classList.add("new-message");
  
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  // Retire animasyon apre yon ti tan
  setTimeout(() => {
    msg.classList.remove("new-message");
  }, 1000);
}

function afficherMessageAdmin(from, text, timestamp = null) {
  const msg = document.createElement("div");
  msg.className = "chat-message client";
  msg.setAttribute("data-sender", from);
  
  const messageContent = document.createElement("div");
  messageContent.className = "message-content";
  messageContent.textContent = text;
  
  if (timestamp) {
    const timeElement = document.createElement("span");
    timeElement.className = "message-time";
    const date = new Date(timestamp);
    timeElement.textContent = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    msg.appendChild(messageContent);
    msg.appendChild(timeElement);
  } else {
    msg.appendChild(messageContent);
  }
  
  msg.classList.add("new-message");
  chatArea.appendChild(msg);
  chatArea.scrollTop = chatArea.scrollHeight;
  
  setTimeout(() => {
    msg.classList.remove("new-message");
  }, 1000);
}

/*********************************
 * OUVRIR CONVERSATION AMÉLIORÉ
 *********************************/
async function ouvrirConversation(uidClient, username) {
  currentClientUID = uidClient;
  
  sidebar.classList.toggle("open");
  
  // Vide chat area epi ajoute tit
  chatArea.innerHTML = `
    <div class="chat-header">
      <div>
        <h2>Conversation avec ${username}</h2>
        <span class="online-status">En ligne</span>
      </div>
      <button class="toggle-sidebar-btn" onclick="document.querySelector('.chat-sidebar').classList.toggle('closed')">
        <i>☰</i>
      </button>
    </div>
  `;

  // Detache ansyen listener si genyen
  const currentRef = firebase.database().ref(`RJFORDROID/CHAT/conversations/${uidClient}/messages`);
  currentRef.off();

  // Chaje tout mesaj ki deja egziste yo
  const initialSnap = await currentRef.orderByChild("timestamp").once("value");
  
  if (initialSnap.exists()) {
    const messages = [];
    initialSnap.forEach(childSnap => {
      messages.push({
        key: childSnap.key,
        ...childSnap.val()
      });
    });
    
    // Trie mesaj yo pa timestamp
    messages.sort((a, b) => a.timestamp - b.timestamp);
    
    // Afiche tout mesaj yo
    messages.forEach(msg => {
      if (msg.from === "client") {
        // Mesaj soti nan client
        afficherMessageAdmin(username, msg.text, msg.timestamp);
      } else {
        // Mesaj soti nan admin
        afficherMessage(msg.text, "admin", "Moi", msg.timestamp);
      }
    });
  }

  // Ekoute pou nouvo mesaj
  currentRef.on("child_added", snap => {
    // Pa afiche mesaj ki te deja afiche
    if (snap.key && document.querySelector(`[data-message-id="${snap.key}"]`)) {
      return;
    }
    
    const msg = snap.val();
    
    // Jwe son pou nouvo mesaj
    if (msg.from === "client") {
      playNotificationSound("message");
      vibrateIfSupported([100]);
      afficherMessageAdmin(username, msg.text, msg.timestamp);
    } else {
      afficherMessage(msg.text, "admin", "Moi", msg.timestamp);
    }
  });
}

/*********************************
 * GENERATE RANDOM COLOR
 *********************************/
function getRandomColor() {
  const colors = ["#e74c3c", "#8e44ad", "#3498db", "#f39c12", "#16a085", "#d35400"];
  return colors[Math.floor(Math.random() * colors.length)];
}

/*********************************
 * GESTION VISIBILITÉ PAGE
 *********************************/
let pageVisible = true;

document.addEventListener("visibilitychange", () => {
  pageVisible = !document.hidden;
  console.log("Page visible:", pageVisible);
});

/*********************************
 * INIT
 *********************************/
document.addEventListener("DOMContentLoaded", async () => {
  const uid = getConnectedUID();
  if (!uid) return;

  // Demande pèmisyon notifikasyon
  requestNotificationPermission();
  
  // Kreye kontèks odyo
  createAudioContext();

  const user = await getUserByUID(uid);
  
  // Setup event listeners
  sendBtn.addEventListener("click", envoyerMessage);
  messageInput.addEventListener("input", () => {
    sendBtn.disabled = messageInput.value.trim() === "";
  });
  sendBtn.disabled = true;

  if (user?.isAdmin) {
    // Admin - charge liste clients
    chargerClients();
  } else {
    // Client - ekoute mesaj yo
    firebase.database()
      .ref(`RJFORDROID/CHAT/conversations/${uid}/messages`)
      .on("child_added", snap => {
        const msg = snap.val();
        const senderType = msg.from;
        const senderName = senderType === "client" ? "Moi" : "Admin";
        
        // Jwe son pou mesaj ki soti nan admin
        if (senderType === "admin") {
          playNotificationSound("message");
          vibrateIfSupported();
          
          // Notifikasyon si paj nan background
          if (document.hidden) {
            showBrowserNotification(
              "Nouvo mesaj nan chat",
              `📩 ${msg.text.substring(0, 50)}...`
            );
          }
        }
        
        afficherMessage(msg.text, senderType, senderName, msg.timestamp);
      });
  }
});