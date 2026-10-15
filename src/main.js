import { EOS_LORE, buildEosPromptContext } from "./eos.js";
import {
  createNewGameState,
  getStatModifier,
  formatModifier,
  evaluateActionCheck,
  formatChoiceDisplay,
  parseGmResponse,
  useInventoryItem,
  updateLocationAndRewardsOnTurn,
  getActiveSlotId,
  loadFromSlot,
  saveToSlot,
  exportSaveFile,
  validateImportedSave,
} from "./engine.js";

// Initialize Web Worker for In-Browser LLM (Transformers.js + WebGPU)
const worker = new Worker(new URL("./worker.js", import.meta.url), {
  type: "module",
});

// Active state
let activeSlotId = getActiveSlotId();
let gameState = loadFromSlot(activeSlotId);
if (!gameState) {
  gameState = createNewGameState("Kaelen", "warrior");
  saveToSlot(activeSlotId, gameState);
}

let isGenerating = false;
let activeJobId = 0;
let selectedClassForModal = "warrior";
let streamingBubbleEl = null;

// DOM Elements
const sidebarEl = document.getElementById("sidebar");
const mobileSidebarBtn = document.getElementById("mobile-sidebar-btn");
const newHeroBtn = document.getElementById("new-hero-btn");

const uiLocationName = document.getElementById("ui-location-name");
const uiLocationRegion = document.getElementById("ui-location-region");
const uiHeroName = document.getElementById("ui-hero-name");
const uiHeroClass = document.getElementById("ui-hero-class");
const uiHeroGold = document.getElementById("ui-hero-gold");

const uiHpText = document.getElementById("ui-hp-text");
const uiHpBar = document.getElementById("ui-hp-bar");
const uiManaText = document.getElementById("ui-mana-text");
const uiManaBar = document.getElementById("ui-mana-bar");

const uiStatStr = document.getElementById("ui-stat-str");
const uiModStr = document.getElementById("ui-mod-str");
const uiStatDex = document.getElementById("ui-stat-dex");
const uiModDex = document.getElementById("ui-mod-dex");
const uiStatInt = document.getElementById("ui-stat-int");
const uiModInt = document.getElementById("ui-mod-int");
const uiStatWis = document.getElementById("ui-stat-wis");
const uiModWis = document.getElementById("ui-mod-wis");

const uiDiceResult = document.getElementById("ui-dice-result");
const uiEquipmentList = document.getElementById("ui-equipment-list");
const uiInventoryList = document.getElementById("ui-inventory-list");

const saveSlotSelect = document.getElementById("save-slot-select");
const saveNowBtn = document.getElementById("save-now-btn");
const exportSaveBtn = document.getElementById("export-save-btn");
const importSaveInput = document.getElementById("import-save-input");
const uiAutosaveBadge = document.getElementById("ui-autosave-badge");

const modelSelect = document.getElementById("model-select");
const dtypeSelect = document.getElementById("dtype-select");
const loadModelBtn = document.getElementById("load-model-btn");
const telemetryPill = document.getElementById("telemetry-pill");
const gpuStatusBadge = document.getElementById("gpu-status-badge");

const downloadBanner = document.getElementById("download-banner");
const downloadLabel = document.getElementById("download-label");
const downloadPct = document.getElementById("download-pct");
const downloadBar = document.getElementById("download-bar");

const storyFeed = document.getElementById("story-feed");
const choicesContainer = document.getElementById("choices-container");
const actionForm = document.getElementById("action-form");
const actionInput = document.getElementById("action-input");
const sendBtn = document.getElementById("send-btn");
const stopBtn = document.getElementById("stop-btn");

const charModal = document.getElementById("char-modal");
const closeModalBtn = document.getElementById("close-modal-btn");
const cancelCharBtn = document.getElementById("cancel-char-btn");
const charCreateForm = document.getElementById("char-create-form");
const heroNameInput = document.getElementById("hero-name-input");
const classCardsGrid = document.getElementById("class-cards-grid");

/**
 * Render basic markdown bold/italic safely for narrative bubbles
 */
function formatNarrativeHtml(text) {
  const escaped = String(text || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}

/**
 * Flash the Auto-Saved indicator whenever state is persisted
 */
function flashAutoSave(label = "Auto-Saved") {
  saveToSlot(activeSlotId, gameState);
  uiAutosaveBadge.textContent = label;
  uiAutosaveBadge.style.opacity = "1";
}

/**
 * Sync the entire Character Sheet, Location, Inventory, and Choices UI
 */
function renderCharacterSidebar() {
  const p = gameState.player;
  const loc =
    EOS_LORE.locations[gameState.locationId] ||
    EOS_LORE.locations.oakhaven_tavern;

  uiLocationName.textContent = loc.name;
  uiLocationRegion.textContent = `${loc.region} • Turn ${gameState.turn}`;

  uiHeroName.textContent = p.name;
  uiHeroClass.textContent = `Lv ${p.level} ${p.className} (${p.xp}/${
    p.level * 60
  } XP)`;
  uiHeroGold.textContent = `🪙 ${p.gold} GP`;

  const hpPct = Math.max(0, Math.min(100, Math.round((p.hp / p.maxHp) * 100)));
  uiHpText.textContent = `${p.hp} / ${p.maxHp}`;
  uiHpBar.style.width = `${hpPct}%`;

  const manaPct = Math.max(
    0,
    Math.min(100, Math.round((p.mana / p.maxMana) * 100))
  );
  uiManaText.textContent = `${p.mana} / ${p.maxMana}`;
  uiManaBar.style.width = `${manaPct}%`;

  uiStatStr.textContent = p.stats.STR;
  uiModStr.textContent = formatModifier(getStatModifier(p.stats.STR));
  uiStatDex.textContent = p.stats.DEX;
  uiModDex.textContent = formatModifier(getStatModifier(p.stats.DEX));
  uiStatInt.textContent = p.stats.INT;
  uiModInt.textContent = formatModifier(getStatModifier(p.stats.INT));
  uiStatWis.textContent = p.stats.WIS;
  uiModWis.textContent = formatModifier(getStatModifier(p.stats.WIS));

  // Equipped gear
  uiEquipmentList.innerHTML = "";
  const slots = [
    ["Weapon", p.equipment.weapon],
    ["Armor", p.equipment.armor],
    ["Relic", p.equipment.relic],
  ];
  for (const [slotName, itemName] of slots) {
    const div = document.createElement("div");
    div.className = "equip-item";
    div.innerHTML = `<span><span class="equip-slot">${slotName}:</span>${itemName}</span>`;
    uiEquipmentList.appendChild(div);
  }

  // Inventory items
  uiInventoryList.innerHTML = "";
  if (!p.inventory || p.inventory.length === 0) {
    const empty = document.createElement("span");
    empty.style.fontSize = "12px";
    empty.style.color = "var(--text-dim)";
    empty.textContent = "Pack is empty";
    uiInventoryList.appendChild(empty);
  } else {
    p.inventory.forEach((item, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "inv-pill";
      btn.textContent = item;
      btn.title = "Click to use or inspect item";
      btn.addEventListener("click", () => {
        const resultMsg = useInventoryItem(gameState, idx);
        if (resultMsg) {
          uiDiceResult.textContent = resultMsg;
          renderCharacterSidebar();
          flashAutoSave("Saved (Item Used)");
        } else {
          actionInput.value = `Use my ${item}`;
          actionInput.focus();
        }
      });
      uiInventoryList.appendChild(btn);
    });
  }
}

/**
 * Render the 3-4 clickable numbered choices in the bottom dock
 */
function renderChoices() {
  choicesContainer.innerHTML = "";
  const choices = gameState.currentChoices || [];

  choices.slice(0, 4).forEach((rawChoice, index) => {
    const { label, checkBadge } = formatChoiceDisplay(rawChoice);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "choice-btn";
    btn.disabled = isGenerating;

    const left = document.createElement("div");
    left.className = "choice-left";

    const num = document.createElement("span");
    num.className = "choice-num";
    num.textContent = String(index + 1);

    const textSpan = document.createElement("span");
    textSpan.textContent = label;

    left.appendChild(num);
    left.appendChild(textSpan);
    btn.appendChild(left);

    if (checkBadge) {
      const badge = document.createElement("span");
      badge.className = "choice-check-badge";
      badge.textContent = `🎲 ${checkBadge}`;
      btn.appendChild(badge);
    }

    btn.addEventListener("click", () => {
      if (!isGenerating) {
        submitPlayerAction(rawChoice);
      }
    });

    choicesContainer.appendChild(btn);
  });
}

/**
 * Render the full Story Feed from `gameState.storyLog`
 */
function renderStoryFeed() {
  storyFeed.innerHTML = "";

  for (const entry of gameState.storyLog) {
    appendMessageCardToDom(entry);
  }

  storyFeed.scrollTop = storyFeed.scrollHeight;
}

function appendMessageCardToDom(entry) {
  const card = document.createElement("article");
  card.className = `msg-card ${entry.role === "user" ? "msg-user" : "msg-gm"}`;

  const meta = document.createElement("div");
  meta.className = "msg-meta";
  if (entry.role === "user") {
    meta.textContent = `${gameState.player.name} • Turn ${entry.turn || ""}`;
  } else {
    meta.textContent = `Dungeon Master (Eos) • ${
      entry.locationName || "Realm of Eos"
    }`;
  }
  card.appendChild(meta);

  const bubble = document.createElement("div");
  bubble.className = "msg-bubble";
  bubble.innerHTML = formatNarrativeHtml(entry.content);
  card.appendChild(bubble);

  if (Array.isArray(entry.events) && entry.events.length > 0) {
    const badges = document.createElement("div");
    badges.className = "event-badges";
    for (const ev of entry.events) {
      const pill = document.createElement("span");
      const isSuccess =
        ev.includes("SUCCESS") || ev.includes("Passed") || ev.includes("LEVEL UP");
      const isFail = ev.includes("FAILURE") || ev.includes("FUMBLE") || ev.includes("Failed");
      pill.className = `event-pill ${
        isSuccess ? "success" : isFail ? "fail" : ""
      }`;
      pill.textContent = ev;
      badges.appendChild(pill);
    }
    card.appendChild(badges);
  }

  storyFeed.appendChild(card);
  storyFeed.scrollTop = storyFeed.scrollHeight;
  return bubble;
}

/**
 * Build the compact, lore-grounded LLM prompt for the current turn
 */
function buildDungeonMasterMessages(cleanAction, diceCheck) {
  const eosContext = buildEosPromptContext(gameState, cleanAction);

  const systemPrompt = `You are the Dungeon Master for an old-school 1980s Sword & Sorcery text RPG set in the world of Eos.
Use the authoritative EOS LORE CONTEXT below to guide the story:
${eosContext}

RULES FOR EVERY RESPONSE:
1. Write 2 short, vivid second-person paragraphs ("You...") describing the outcome of the player's action, referencing specific NPCs, monsters, or lore from the current location in Eos.
2. Respect the d20 Dice Check result if one was rolled.
3. Optional state tags you may include if earned: [HP:-3], [GOLD:+15], [ITEM:+Sun-Chalice], [LOC:whispering_catacombs].
4. End your response with "Choices:" followed by 4 numbered options (1. to 4.) for what the player can do next. Add [CHECK:STR:12], [CHECK:DEX:12], [CHECK:INT:12], or [CHECK:WIS:12] to risky choices.`;

  // Include the last 2 turns of history to keep context window lean & fast
  const recentHistory = [];
  const recentEntries = gameState.storyLog.slice(-4);
  for (const item of recentEntries) {
    recentHistory.push({
      role: item.role === "user" ? "user" : "assistant",
      content: item.content,
    });
  }

  const checkInstruction = diceCheck
    ? `\n[DICE ROLL RESULT: ${diceCheck.summary}. Narrate the ${
        diceCheck.success ? "successful" : "failed"
      } outcome accordingly!]`
    : "";

  return [
    { role: "system", content: systemPrompt },
    ...recentHistory,
    {
      role: "user",
      content: `Player Action: ${cleanAction}${checkInstruction}\nRespond with vivid Eos narration and 4 numbered Choices (1. 2. 3. 4.):`,
    },
  ];
}

/**
 * Handle player selecting a choice (1-4) or submitting a freeform action
 */
function submitPlayerAction(rawActionText) {
  if (isGenerating) return;
  const trimmed = (rawActionText || "").trim();
  if (!trimmed) return;

  // Evaluate d20 check if applicable
  const diceCheck = evaluateActionCheck(gameState, trimmed);
  const { label: cleanAction } = formatChoiceDisplay(trimmed);

  gameState.turn += 1;
  const preTurnEvents = updateLocationAndRewardsOnTurn(
    gameState,
    cleanAction,
    diceCheck
  );

  if (diceCheck) {
    uiDiceResult.textContent = `🎲 ${diceCheck.summary}`;
  }

  const userEvents = [];
  if (diceCheck) {
    userEvents.push(`🎲 ${diceCheck.summary}`);
  }
  userEvents.push(...preTurnEvents);

  // Build prompt messages before pushing user entry so it isn't duplicated
  const messages = buildDungeonMasterMessages(cleanAction, diceCheck);

  // Append player's turn to story log
  const userEntry = {
    id: `user_${Date.now()}`,
    role: "user",
    turn: gameState.turn,
    content: cleanAction,
    events: userEvents,
    timestamp: new Date().toISOString(),
  };
  gameState.storyLog.push(userEntry);
  appendMessageCardToDom(userEntry);

  actionInput.value = "";
  renderCharacterSidebar();
  flashAutoSave();

  // Start streaming GM response from local browser LLM
  isGenerating = true;
  activeJobId += 1;
  sendBtn.classList.add("hidden");
  stopBtn.classList.remove("hidden");
  renderChoices();

  const loc =
    EOS_LORE.locations[gameState.locationId] ||
    EOS_LORE.locations.oakhaven_tavern;

  streamingBubbleEl = appendMessageCardToDom({
    role: "gm",
    turn: gameState.turn,
    locationName: loc.name,
    content: "Consulting the Chronicles of Eos...",
  });

  worker.postMessage({
    type: "generate_turn",
    payload: {
      jobId: activeJobId,
      modelId: modelSelect.value,
      dtype: dtypeSelect.value,
      messages,
      config: {
        maxNewTokens: 320,
        temperature: 0.72,
        topP: 0.9,
      },
    },
  });
}

/**
 * Worker Event Listener
 */
worker.addEventListener("message", (event) => {
  const data = event.data || {};

  switch (data.status) {
    case "webgpu_status":
      gpuStatusBadge.textContent = data.message;
      if (data.supported) {
        gpuStatusBadge.classList.add("ready");
      }
      break;

    case "loading_start":
      downloadBanner.classList.remove("hidden");
      downloadLabel.textContent = `Loading ${data.modelId} (${data.dtype})...`;
      loadModelBtn.disabled = true;
      loadModelBtn.textContent = "Loading...";
      break;

    case "model_progress":
      if (data.status === "progress" && typeof data.progress === "number") {
        const pct = Math.round(data.progress);
        downloadBanner.classList.remove("hidden");
        downloadLabel.textContent = `Downloading ${
          data.file || "model weights"
        }...`;
        downloadPct.textContent = `${pct}%`;
        downloadBar.style.width = `${pct}%`;
      }
      break;

    case "model_ready":
      downloadBanner.classList.add("hidden");
      loadModelBtn.disabled = false;
      loadModelBtn.textContent = "LLM Ready ✓";
      break;

    case "generation_start":
      if (streamingBubbleEl) {
        streamingBubbleEl.innerHTML = "<em>The Dungeon Master speaks...</em>";
      }
      break;

    case "token":
      if (data.jobId !== activeJobId) return;
      if (data.tps) {
        telemetryPill.classList.remove("hidden");
        telemetryPill.textContent = `${data.tps} tok/s`;
      }
      if (streamingBubbleEl) {
        streamingBubbleEl.innerHTML = formatNarrativeHtml(data.fullText);
        storyFeed.scrollTop = storyFeed.scrollHeight;
      }
      break;

    case "complete": {
      if (data.jobId !== activeJobId) return;
      isGenerating = false;
      sendBtn.classList.remove("hidden");
      stopBtn.classList.add("hidden");

      const parsed = parseGmResponse(data.fullText, gameState);
      const loc =
        EOS_LORE.locations[gameState.locationId] ||
        EOS_LORE.locations.oakhaven_tavern;

      gameState.currentChoices = parsed.choices;

      const gmEntry = {
        id: `gm_${Date.now()}`,
        role: "gm",
        turn: gameState.turn,
        locationName: loc.name,
        content: parsed.narrative,
        choices: parsed.choices,
        events: parsed.events,
        timestamp: new Date().toISOString(),
      };
      gameState.storyLog.push(gmEntry);

      renderStoryFeed();
      renderCharacterSidebar();
      renderChoices();
      flashAutoSave();
      streamingBubbleEl = null;
      break;
    }

    case "error":
      isGenerating = false;
      sendBtn.classList.remove("hidden");
      stopBtn.classList.add("hidden");
      loadModelBtn.disabled = false;
      loadModelBtn.textContent = "Load LLM";
      downloadBanner.classList.add("hidden");

      if (streamingBubbleEl) {
        streamingBubbleEl.innerHTML = `<span style="color: var(--danger)">LLM Error: ${
          data.message || "Failed to generate turn."
        }</span>`;
      }
      renderChoices();
      break;

    default:
      break;
  }
});

/**
 * Character Creation Modal Setup
 */
function renderClassSelectionCards() {
  classCardsGrid.innerHTML = "";
  Object.values(EOS_LORE.classes).forEach((cls) => {
    const card = document.createElement("div");
    card.className = `class-card ${
      cls.id === selectedClassForModal ? "selected" : ""
    }`;
    card.innerHTML = `
      <div class="class-card-title">${cls.name}</div>
      <div class="class-card-sub">${cls.title}</div>
      <div class="class-card-desc">${cls.description}</div>
      <div class="class-card-stats">HP ${cls.maxHp} • MP ${cls.maxMana} • STR ${cls.baseStats.STR} / DEX ${cls.baseStats.DEX} / INT ${cls.baseStats.INT} / WIS ${cls.baseStats.WIS}</div>
    `;
    card.addEventListener("click", () => {
      selectedClassForModal = cls.id;
      renderClassSelectionCards();
    });
    classCardsGrid.appendChild(card);
  });
}

function openCharModal() {
  renderClassSelectionCards();
  charModal.classList.remove("hidden");
  heroNameInput.focus();
}

function closeCharModal() {
  charModal.classList.add("hidden");
}

/**
 * Wire UI Event Listeners
 */
newHeroBtn.addEventListener("click", openCharModal);
closeModalBtn.addEventListener("click", closeCharModal);
cancelCharBtn.addEventListener("click", closeCharModal);

charCreateForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const heroName = heroNameInput.value.trim() || "Kaelen";
  gameState = createNewGameState(heroName, selectedClassForModal);
  saveToSlot(activeSlotId, gameState);
  closeCharModal();
  renderCharacterSidebar();
  renderStoryFeed();
  renderChoices();
  flashAutoSave("New Hero Saved");
});

actionForm.addEventListener("submit", (e) => {
  e.preventDefault();
  submitPlayerAction(actionInput.value);
});

stopBtn.addEventListener("click", () => {
  worker.postMessage({ type: "interrupt" });
});

// Number keys 1-4 shortcut when not typing in an input
window.addEventListener("keydown", (e) => {
  const activeTag = document.activeElement?.tagName;
  if (activeTag === "INPUT" || activeTag === "TEXTAREA" || activeTag === "SELECT") {
    return;
  }
  if (!charModal.classList.contains("hidden") || isGenerating) return;

  const num = parseInt(e.key, 10);
  if (num >= 1 && num <= 4) {
    const choice = gameState.currentChoices?.[num - 1];
    if (choice) {
      e.preventDefault();
      submitPlayerAction(choice);
    }
  }
});

// Manual d20 Stat Roller buttons in sidebar
document.querySelectorAll(".roll-stat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const stat = btn.dataset.stat || "STR";
    const score = gameState.player.stats[stat] || 10;
    const mod = getStatModifier(score);
    const d20 = Math.floor(Math.random() * 20) + 1;
    const total = d20 + mod;
    uiDiceResult.textContent = `🎲 Rolled d20(${d20}) ${formatModifier(
      mod
    )} ${stat} = ${total}`;
  });
});

// Save Slot switching & Save File Export/Import
saveSlotSelect.value = activeSlotId;
saveSlotSelect.addEventListener("change", () => {
  activeSlotId = saveSlotSelect.value;
  const existing = loadFromSlot(activeSlotId);
  if (existing) {
    gameState = existing;
  } else {
    gameState = createNewGameState("Kaelen", "warrior");
    saveToSlot(activeSlotId, gameState);
  }
  renderCharacterSidebar();
  renderStoryFeed();
  renderChoices();
  flashAutoSave(`Loaded ${activeSlotId.replace("_", " ")}`);
});

saveNowBtn.addEventListener("click", () => {
  flashAutoSave("Saved Now ✓");
});

exportSaveBtn.addEventListener("click", () => {
  const filename = exportSaveFile(gameState);
  flashAutoSave(`Exported ${filename}`);
});

importSaveInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const importedState = validateImportedSave(text);
    gameState = importedState;
    saveToSlot(activeSlotId, gameState);
    renderCharacterSidebar();
    renderStoryFeed();
    renderChoices();
    flashAutoSave("Imported Save File ✓");
  } catch (err) {
    alert(`Could not load save file: ${err.message}`);
  } finally {
    importSaveInput.value = "";
  }
});

// Model Preload button
loadModelBtn.addEventListener("click", () => {
  worker.postMessage({
    type: "load_model",
    payload: {
      modelId: modelSelect.value,
      dtype: dtypeSelect.value,
    },
  });
});

modelSelect.addEventListener("change", () => {
  loadModelBtn.textContent = "Load LLM";
});

mobileSidebarBtn.addEventListener("click", () => {
  sidebarEl.classList.toggle("open");
});

// Initial render & WebGPU check
renderCharacterSidebar();
renderStoryFeed();
renderChoices();
worker.postMessage({ type: "check_webgpu" });
