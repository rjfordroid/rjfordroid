let selectedAvatar = ""; // <-- mete li la, global

document.addEventListener("DOMContentLoaded", () => {

  const avatarList = document.getElementById("avatarList");
  const btnEmoji = document.getElementById("btnEmoji");
  const commentInput = document.getElementById("commentText");

  if (!avatarList) {
    console.log("avatarList pa jwenn");
    return;
  }

  let selectedAvatar = "";

  const avatars = ["😀","😎","🔥","💎","🚀","👑","🤖","🎮","❤️","⚡"];

  avatars.forEach(emoji => {
    const span = document.createElement("span");
    span.textContent = emoji;
    span.style.fontSize = "24px";
    span.style.cursor = "pointer";
    span.style.margin = "5px";

    span.addEventListener("click", () => {
      selectedAvatar = emoji;
      commentInput.value += emoji;
      avatarList.style.display = "none";
    });

    avatarList.appendChild(span);
  });

  btnEmoji.addEventListener("click", () => {
    avatarList.style.display =
      avatarList.style.display === "none" ? "flex" : "none";
  });

});
