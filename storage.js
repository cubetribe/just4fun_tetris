const KEYS = {
  config: "tetris_admin_config_v1",
  rewardCodes: "tetris_reward_codes_v1",
  rewardClaims: "tetris_reward_claims_v1",
  highscores: "tetris_highscores_v1",
};

const DEFAULT_CONFIG = {
  adminPin: "1234",
  level9Multiplier: 1.6,
  level10Multiplier: 2.1,
  linesToWin: 100,
};

const DEFAULT_CODES = Array.from({ length: 10 }, () => "");

function parseJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return fallback;
    }
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getConfig() {
  const stored = parseJson(KEYS.config, DEFAULT_CONFIG);
  return {
    ...DEFAULT_CONFIG,
    ...stored,
    level9Multiplier: clampNumber(stored.level9Multiplier, 1, 3, DEFAULT_CONFIG.level9Multiplier),
    level10Multiplier: clampNumber(stored.level10Multiplier, 1, 3, DEFAULT_CONFIG.level10Multiplier),
    linesToWin: clampNumber(stored.linesToWin, 40, 300, DEFAULT_CONFIG.linesToWin),
    adminPin: typeof stored.adminPin === "string" && stored.adminPin.length > 0 ? stored.adminPin : DEFAULT_CONFIG.adminPin,
  };
}

export function saveConfig(patch) {
  const next = {
    ...getConfig(),
    ...patch,
  };
  writeJson(KEYS.config, next);
  return next;
}

export function getRewardCodes() {
  const codes = parseJson(KEYS.rewardCodes, DEFAULT_CODES);
  if (!Array.isArray(codes)) {
    return [...DEFAULT_CODES];
  }
  const normalized = codes.slice(0, 10).map((code) => (typeof code === "string" ? code.trim() : ""));
  while (normalized.length < 10) {
    normalized.push("");
  }
  return normalized;
}

export function saveRewardCodes(codes) {
  const normalized = Array.isArray(codes)
    ? codes.slice(0, 10).map((code) => (typeof code === "string" ? code.trim() : ""))
    : [...DEFAULT_CODES];
  while (normalized.length < 10) {
    normalized.push("");
  }
  writeJson(KEYS.rewardCodes, normalized);
  return normalized;
}

export function getRewardClaims() {
  const claims = parseJson(KEYS.rewardClaims, []);
  if (!Array.isArray(claims)) {
    return [];
  }
  return claims
    .filter((item) => item && typeof item.code === "string" && typeof item.winnerName === "string")
    .map((item) => ({
      code: item.code,
      winnerName: item.winnerName,
      slot: Number.isFinite(item.slot) ? item.slot : -1,
      claimedAt: typeof item.claimedAt === "string" ? item.claimedAt : new Date().toISOString(),
    }))
    .sort((a, b) => a.claimedAt.localeCompare(b.claimedAt));
}

export function saveRewardClaims(claims) {
  const sanitized = Array.isArray(claims)
    ? claims.map((item) => ({
        code: String(item.code ?? "").trim(),
        winnerName: String(item.winnerName ?? "").trim(),
        slot: Number.isFinite(item.slot) ? item.slot : -1,
        claimedAt: String(item.claimedAt ?? new Date().toISOString()),
      }))
    : [];
  writeJson(KEYS.rewardClaims, sanitized);
  return sanitized;
}

export function resetRewardClaims() {
  writeJson(KEYS.rewardClaims, []);
}

export function claimRewardCode(winnerName) {
  const cleanName = String(winnerName ?? "").trim();
  if (!cleanName) {
    return { ok: false, reason: "Bitte Namen eingeben." };
  }

  const claims = getRewardClaims();
  const duplicate = claims.find((item) => item.winnerName.toLowerCase() === cleanName.toLowerCase());
  if (duplicate) {
    return {
      ok: true,
      alreadyClaimed: true,
      code: duplicate.code,
      slot: duplicate.slot,
      winnerName: duplicate.winnerName,
    };
  }

  const codes = getRewardCodes();
  const occupiedSlots = new Set(claims.map((item) => item.slot));
  const slot = codes.findIndex((code, idx) => code.length > 0 && !occupiedSlots.has(idx));

  if (slot === -1) {
    return { ok: false, reason: "Keine Gutscheine mehr verfügbar oder keine Codes hinterlegt." };
  }

  const claim = {
    code: codes[slot],
    winnerName: cleanName,
    slot,
    claimedAt: new Date().toISOString(),
  };

  const nextClaims = [...claims, claim];
  saveRewardClaims(nextClaims);

  return {
    ok: true,
    alreadyClaimed: false,
    code: claim.code,
    slot: slot,
    winnerName: claim.winnerName,
  };
}

export function getHighscores() {
  const highscores = parseJson(KEYS.highscores, []);
  if (!Array.isArray(highscores)) {
    return [];
  }
  return highscores
    .filter((row) => row && typeof row.name === "string")
    .map((row) => ({
      name: row.name,
      score: Number(row.score) || 0,
      lines: Number(row.lines) || 0,
      level: Number(row.level) || 1,
      achievedAt: typeof row.achievedAt === "string" ? row.achievedAt : new Date().toISOString(),
    }))
    .sort((a, b) => b.score - a.score || b.lines - a.lines)
    .slice(0, 20);
}

export function addHighscore(entry) {
  const cleanName = String(entry.name ?? "Player").trim().slice(0, 20) || "Player";
  const next = [
    ...getHighscores(),
    {
      name: cleanName,
      score: Number(entry.score) || 0,
      lines: Number(entry.lines) || 0,
      level: Number(entry.level) || 1,
      achievedAt: new Date().toISOString(),
    },
  ]
    .sort((a, b) => b.score - a.score || b.lines - a.lines)
    .slice(0, 20);

  writeJson(KEYS.highscores, next);
  return next;
}

export function exportAdminData() {
  return {
    exportedAt: new Date().toISOString(),
    config: getConfig(),
    codes: getRewardCodes(),
    claims: getRewardClaims(),
    highscores: getHighscores(),
  };
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return fallback;
  }
  return Math.max(min, Math.min(max, n));
}
