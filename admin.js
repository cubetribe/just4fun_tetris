import {
  exportAdminData,
  getConfig,
  getRewardClaims,
  getRewardCodes,
  resetRewardClaims,
  saveConfig,
  saveRewardCodes,
} from "./storage.js";

const loginCard = document.getElementById("loginCard");
const adminPanel = document.getElementById("adminPanel");
const loginBtn = document.getElementById("loginBtn");
const pinInput = document.getElementById("pinInput");
const loginMsg = document.getElementById("loginMsg");
const adminMsg = document.getElementById("adminMsg");

const lvl9Input = document.getElementById("lvl9");
const lvl10Input = document.getElementById("lvl10");
const linesToWinInput = document.getElementById("linesToWin");
const saveDifficultyBtn = document.getElementById("saveDifficulty");

const codeFields = document.getElementById("codeFields");
const saveCodesBtn = document.getElementById("saveCodes");

const claimsList = document.getElementById("claimsList");
const resetClaimsBtn = document.getElementById("resetClaims");
const exportDataBtn = document.getElementById("exportData");

const newPinInput = document.getElementById("newPin");
const savePinBtn = document.getElementById("savePin");

let unlocked = false;

function setLoginMessage(message, isError = false) {
  loginMsg.textContent = message;
  loginMsg.classList.toggle("error", isError);
}

function setAdminMessage(message, isError = false) {
  adminMsg.textContent = message;
  adminMsg.classList.toggle("error", isError);
}

function createCodeInputs() {
  codeFields.innerHTML = "";
  for (let i = 0; i < 10; i += 1) {
    const wrap = document.createElement("label");
    wrap.className = "code-slot";

    const title = document.createElement("span");
    title.textContent = `Slot ${i + 1}`;

    const input = document.createElement("input");
    input.type = "text";
    input.maxLength = 64;
    input.placeholder = "z. B. AMZ-XXXX-XXXX";
    input.dataset.slot = String(i);

    wrap.append(title, input);
    codeFields.append(wrap);
  }
}

function fillFormFromStorage() {
  const config = getConfig();
  const codes = getRewardCodes();

  lvl9Input.value = String(config.level9Multiplier);
  lvl10Input.value = String(config.level10Multiplier);
  linesToWinInput.value = String(config.linesToWin);

  const inputs = codeFields.querySelectorAll("input[data-slot]");
  inputs.forEach((input, index) => {
    input.value = codes[index] || "";
  });

  renderClaims();
}

function renderClaims() {
  const claims = getRewardClaims();
  claimsList.innerHTML = "";

  if (claims.length === 0) {
    const li = document.createElement("li");
    li.textContent = "Noch keine Claims vorhanden.";
    claimsList.append(li);
    return;
  }

  claims.forEach((claim) => {
    const li = document.createElement("li");
    const localDate = new Date(claim.claimedAt).toLocaleString("de-DE");
    li.innerHTML = `<strong>Slot ${claim.slot + 1}</strong> · ${escapeHtml(claim.winnerName)} · <code>${escapeHtml(claim.code)}</code> · ${localDate}`;
    claimsList.append(li);
  });
}

function unlockAdmin() {
  unlocked = true;
  loginCard.classList.add("hidden");
  adminPanel.classList.remove("hidden");
  fillFormFromStorage();
}

function tryLogin() {
  const pin = pinInput.value.trim();
  const config = getConfig();

  if (!pin) {
    setLoginMessage("PIN fehlt.", true);
    return;
  }

  if (pin !== config.adminPin) {
    setLoginMessage("Falsche PIN.", true);
    return;
  }

  setLoginMessage("");
  unlockAdmin();
}

function saveDifficulty() {
  if (!unlocked) {
    return;
  }

  const lvl9 = clamp(Number(lvl9Input.value), 1, 3, getConfig().level9Multiplier);
  const lvl10 = clamp(Number(lvl10Input.value), 1, 3, getConfig().level10Multiplier);
  const linesToWin = Math.round(clamp(Number(linesToWinInput.value), 40, 300, getConfig().linesToWin));

  saveConfig({
    level9Multiplier: lvl9,
    level10Multiplier: lvl10,
    linesToWin,
  });

  lvl9Input.value = String(lvl9);
  lvl10Input.value = String(lvl10);
  linesToWinInput.value = String(linesToWin);
  setAdminMessage("Schwierigkeit gespeichert.");
}

function saveCodes() {
  if (!unlocked) {
    return;
  }

  const inputs = Array.from(codeFields.querySelectorAll("input[data-slot]"));
  const codes = inputs.map((input) => input.value.trim());
  saveRewardCodes(codes);
  setAdminMessage("Codes gespeichert.");
}

function savePin() {
  if (!unlocked) {
    return;
  }

  const newPin = newPinInput.value.trim();
  if (newPin.length < 4) {
    setAdminMessage("PIN muss mindestens 4 Zeichen haben.", true);
    return;
  }

  saveConfig({ adminPin: newPin });
  newPinInput.value = "";
  setAdminMessage("PIN gespeichert.");
}

function resetClaims() {
  if (!unlocked) {
    return;
  }

  const confirmed = window.confirm("Alle Claims wirklich zurücksetzen?");
  if (!confirmed) {
    return;
  }

  resetRewardClaims();
  renderClaims();
  setAdminMessage("Claims wurden zurückgesetzt.");
}

function exportData() {
  if (!unlocked) {
    return;
  }

  const payload = exportAdminData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = `tetris-admin-export-${Date.now()}.json`;
  a.click();

  URL.revokeObjectURL(url);
  setAdminMessage("Export erstellt.");
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, value));
}

function escapeHtml(input) {
  return String(input)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function boot() {
  createCodeInputs();

  loginBtn.addEventListener("click", tryLogin);
  pinInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      tryLogin();
    }
  });

  saveDifficultyBtn.addEventListener("click", saveDifficulty);
  saveCodesBtn.addEventListener("click", saveCodes);
  savePinBtn.addEventListener("click", savePin);
  resetClaimsBtn.addEventListener("click", resetClaims);
  exportDataBtn.addEventListener("click", exportData);
}

boot();
