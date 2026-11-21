const $ = (id) => document.getElementById(id);
const form = $("chatForm");
const input = $("messageInput");
const messagesEl = $("messages");
const welcome = $("welcome");
const sendBtn = $("sendBtn");
const personality = $("personality");
const history = [];

function showToast(text) {
  const toast = $("toast");
  toast.textContent = text;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2800);
}

function addMessage(role, text) {
  welcome.hidden = true;
  const row = document.createElement("div");
  row.className = `message ${role === "user" ? "user" : "assistant"}`;
  const avatar = document.createElement("div");
  avatar.className = "avatar";
  avatar.textContent = role === "user" ? "K" : "A";
  const body = document.createElement("div");
  body.className = "message-body";
  const name = document.createElement("div");
  name.className = "message-name";
  name.textContent = role === "user" ? "Kamu" : "Alif AI";
  const content = document.createElement("div");
  content.className = "message-text";
  content.textContent = text;
  body.append(name, content);
  row.append(avatar, body);
  messagesEl.append(row);
  $("chatArea").scrollTop = $("chatArea").scrollHeight;
  return row;
}

function setBusy(busy) {
  sendBtn.disabled = busy;
  input.disabled = busy;
  sendBtn.textContent = busy ? "…" : "➤";
}

async function sendMessage(text) {
  const clean = text.trim();
  if (!clean || sendBtn.disabled) return;
  addMessage("user", clean);
  history.push({ role: "user", text: clean });
  input.value = "";
  input.style.height = "auto";
  setBusy(true);

  const loading = addMessage("model", "Alif AI sedang berpikir…");
  loading.querySelector(".message-text").classList.add("typing");

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: history,
        personality: personality.value
      })
    });
    const data = await response.json();
    loading.remove();

    if (!response.ok) throw new Error(data.error || "Permintaan gagal.");
    addMessage("model", data.answer);
    history.push({ role: "model", text: data.answer });
  } catch (error) {
    loading.remove();
    addMessage("model", `Maaf, ada masalah: ${error.message}`);
    history.pop();
  } finally {
    setBusy(false);
    input.focus();
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage(input.value);
});

input.addEventListener("input", () => {
  input.style.height = "auto";
  input.style.height = `${Math.min(input.scrollHeight, 180)}px`;
});
input.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form.requestSubmit();
  }
});

$("newChat").addEventListener("click", () => {
  history.length = 0;
  messagesEl.replaceChildren();
  welcome.hidden = false;
  $("sidebar").classList.remove("open");
  input.focus();
});
$("clearChat").addEventListener("click", () => {
  history.length = 0;
  messagesEl.replaceChildren();
  welcome.hidden = false;
  showToast("Percakapan dibersihkan.");
});
$("menuBtn").addEventListener("click", () => $("sidebar").classList.toggle("open"));
document.querySelectorAll(".suggestion").forEach(button => {
  button.addEventListener("click", () => sendMessage(button.dataset.prompt));
});
