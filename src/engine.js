/**
 * EOS GAME ENGINE, D20 DICE SYSTEM & SAVE MANAGER (engine.js)
 *
 * Manages:
 * - Character Creation (Warrior, Rogue, Mage, Cleric)
 * - Classic 80s D&D Lite d20 + Stat Modifier checks & combat resolution
 * - LLM Output parsing (extracting narrative, state tags, and 3-4 dynamic choices)
 * - Multi-slot `localStorage` auto-save and `.eos.json` Player Save File export/import
 */

import { EOS_LORE, resolveLocationFromText } from "./eos.js";

const STORAGE_SLOTS_KEY = "eos_rpg_save_slots_v1";
const STORAGE_ACTIVE_SLOT_KEY = "eos_rpg_active_slot_v1";

export function getStatModifier(score) {
  return Math.floor((Number(score) - 10) / 2);
}

export function formatModifier(mod) {
  return mod >= 0 ? `+${mod}` : `${mod}`;
}

/**
 * Create a new game state for the chosen hero name and class
 */
export function createNewGameState(playerName = "Kaelen", classId = "warrior") {
  const cls = EOS_LORE.classes[classId] || EOS_LORE.classes.warrior;
  const cleanName = (playerName || "").trim() || "Alden";

  const openingNarrative = `Rain hammers against the leaded windows of **The Rusty Flagon Inn**, the last warm hearth on the edge of the frontier town of **Oakhaven**. Smoke from tallow candles and roasting mutton curls beneath blackened oak rafters.

Across the tavern floor, **Bork One-Ear** wipes down a scarred counter, his voice dropping to a gravelly whisper: *"The town guard sealed the lower cellar an hour ago, ${cleanName}. Something broke through the old limestone wall from the **Whispering Catacombs** below—and Magistrate Vane is offering two hundred Gold Crowns for proof of what stirs in the dark."*

Near the hearth, **Seraphina of the Silver Bow** binds a freshly nicked forearm, while in the shadowed corner booth, a hooded factor of the **Velvet Mask** flips a square First-Age gold coin, watching your every move.`;

  const openingChoices = [
    "Question Bork One-Ear about the cellar breach and the hidden passage [CHECK:WIS:10]",
    "Approach the hooded Velvet Mask factor in the shadowed booth [CHECK:INT:11]",
    "Speak with Seraphina the Dawnblade Ranger about the Cult of the Ashen Hand",
    "Unbar the heavy oak cellar door and descend into the Whispering Catacombs [CHECK:STR:11]",
  ];

  return {
    version: "1.0.0",
    world: "Eos",
    saveId: `eos_${Date.now()}`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    turn: 1,
    locationId: "oakhaven_tavern",
    visitedLocations: ["oakhaven_tavern"],
    activeQuestId: "secrets_under_oakhaven",
    worldFlags: {
      metBork: true,
      catacombsUnlocked: false,
      sunChaliceFound: false,
      emberShardSecured: false,
    },
    player: {
      name: cleanName,
      classId: cls.id,
      className: cls.name,
      title: cls.title,
      level: 1,
      xp: 0,
      hp: cls.maxHp,
      maxHp: cls.maxHp,
      mana: cls.maxMana,
      maxMana: cls.maxMana,
      gold: cls.startingGold,
      stats: { ...cls.baseStats },
      equipment: { ...cls.equipment },
      inventory: [...cls.inventory],
      abilities: [...cls.abilities],
    },
    currentChoices: openingChoices,
    storyLog: [
      {
        id: "turn_0",
        role: "gm",
        turn: 1,
        locationName: EOS_LORE.locations.oakhaven_tavern.name,
        content: openingNarrative,
        choices: openingChoices,
        timestamp: new Date().toISOString(),
      },
    ],
  };
}

/**
 * Determine if an action triggers a d20 skill/combat check and roll it.
 * Actions can contain explicit tags like `[CHECK:DEX:12]` or keywords implying risk/combat.
 */
export function evaluateActionCheck(gameState, actionText) {
  const explicitMatch = actionText.match(
    /\[CHECK:(STR|DEX|INT|WIS):(\d+)\]/i
  );

  let stat = null;
  let dc = 12;

  if (explicitMatch) {
    stat = explicitMatch[1].toUpperCase();
    dc = parseInt(explicitMatch[2], 10);
  } else {
    const lower = actionText.toLowerCase();
    if (
      lower.includes("attack") ||
      lower.includes("strike") ||
      lower.includes("cleave") ||
      lower.includes("smash") ||
      lower.includes("force") ||
      lower.includes("break") ||
      lower.includes("bash")
    ) {
      stat = "STR";
      dc = 12;
    } else if (
      lower.includes("sneak") ||
      lower.includes("pick") ||
      lower.includes("disarm") ||
      lower.includes("dodge") ||
      lower.includes("steal") ||
      lower.includes("backstab") ||
      lower.includes("climb")
    ) {
      stat = "DEX";
      dc = 12;
    } else if (
      lower.includes("cast") ||
      lower.includes("decipher") ||
      lower.includes("rune") ||
      lower.includes("arcane") ||
      lower.includes("spell") ||
      lower.includes("investigate") ||
      lower.includes("examine")
    ) {
      stat = "INT";
      dc = 11;
    } else if (
      lower.includes("pray") ||
      lower.includes("smite") ||
      lower.includes("turn undead") ||
      lower.includes("sense") ||
      lower.includes("perceive") ||
      lower.includes("persuade")
    ) {
      stat = "WIS";
      dc = 11;
    }
  }

  if (!stat) {
    return null;
  }

  const statScore = gameState.player.stats[stat] || 10;
  const modifier = getStatModifier(statScore);
  const rawRoll = Math.floor(Math.random() * 20) + 1;
  const total = rawRoll + modifier;
  const isCrit = rawRoll === 20;
  const isFumble = rawRoll === 1;
  const success = isCrit || (!isFumble && total >= dc);

  return {
    stat,
    statScore,
    modifier,
    rawRoll,
    total,
    dc,
    success,
    isCrit,
    isFumble,
    summary: `d20(${rawRoll}) ${formatModifier(modifier)} ${stat} = ${total} vs DC ${dc} (${
      isCrit
        ? "CRITICAL SUCCESS!"
        : isFumble
        ? "CRITICAL FUMBLE!"
        : success
        ? "SUCCESS"
        : "FAILURE"
    })`,
  };
}

/**
 * Strip `[CHECK:...]` tags from choice labels for clean UI display
 */
export function formatChoiceDisplay(choiceText) {
  const match = choiceText.match(/\[CHECK:(STR|DEX|INT|WIS):(\d+)\]/i);
  const cleanText = choiceText
    .replace(/\[CHECK:(STR|DEX|INT|WIS):(\d+)\]/gi, "")
    .trim();
  if (!match) {
    return { label: cleanText, checkBadge: null };
  }
  return {
    label: cleanText,
    checkBadge: `${match[1].toUpperCase()} DC ${match[2]}`,
  };
}

/**
 * Parse the raw LLM output into:
 * 1) Narrative text (cleaned of state tags and choice lists)
 * 2) State mutations (`[HP:-3]`, `[GOLD:+15]`, `[ITEM:+Sun-Chalice]`, `[LOC:whispering_catacombs]`)
 * 3) 3 to 4 actionable player choices
 */
export function parseGmResponse(rawText, gameState) {
  if (!rawText || !rawText.trim()) {
    return {
      narrative:
        "Torchlight flickers against the cold stone walls as shadows lengthen across your path.",
      choices: getFallbackChoices(gameState),
      events: [],
    };
  }

  const events = [];
  let workingText = rawText.trim();

  // Extract state mutation tags if emitted by the LLM
  const hpRegex = /\[HP:([+-]?\d+)\]/gi;
  let match;
  while ((match = hpRegex.exec(workingText)) !== null) {
    const delta = parseInt(match[1], 10);
    if (!Number.isNaN(delta) && delta !== 0) {
      applyHpDelta(gameState, delta);
      events.push(`${delta > 0 ? `+${delta}` : delta} HP`);
    }
  }

  const manaRegex = /\[MANA:([+-]?\d+)\]/gi;
  while ((match = manaRegex.exec(workingText)) !== null) {
    const delta = parseInt(match[1], 10);
    if (!Number.isNaN(delta) && delta !== 0) {
      applyManaDelta(gameState, delta);
      events.push(`${delta > 0 ? `+${delta}` : delta} Mana`);
    }
  }

  const goldRegex = /\[GOLD:([+-]?\d+)\]/gi;
  while ((match = goldRegex.exec(workingText)) !== null) {
    const delta = parseInt(match[1], 10);
    if (!Number.isNaN(delta) && delta !== 0) {
      gameState.player.gold = Math.max(0, gameState.player.gold + delta);
      events.push(`${delta > 0 ? `+${delta}` : delta} Gold`);
    }
  }

  const itemRegex = /\[ITEM:\+([^\]]+)\]/gi;
  while ((match = itemRegex.exec(workingText)) !== null) {
    const item = match[1].trim();
    if (item && !gameState.player.inventory.includes(item)) {
      gameState.player.inventory.push(item);
      events.push(`Acquired: ${item}`);
    }
  }

  const locRegex = /\[LOC:([a-z0-9_]+)\]/gi;
  while ((match = locRegex.exec(workingText)) !== null) {
    const locId = match[1].trim().toLowerCase();
    if (EOS_LORE.locations[locId] && gameState.locationId !== locId) {
      gameState.locationId = locId;
      if (!gameState.visitedLocations.includes(locId)) {
        gameState.visitedLocations.push(locId);
      }
      events.push(`Entered: ${EOS_LORE.locations[locId].name}`);
    }
  }

  // Strip state tags from narrative
  workingText = workingText
    .replace(/\[(HP|MANA|GOLD|ITEM|LOC):[^\]]+\]/gi, "")
    .trim();

  // Extract numbered choices from the end of the response
  const lines = workingText.split("\n");
  const narrativeLines = [];
  const extractedChoices = [];
  let inChoicesBlock = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^(choices|options|what do you do|your choices)\s*:?/i.test(trimmed)) {
      inChoicesBlock = true;
      continue;
    }

    const choiceMatch = trimmed.match(/^(?:[1-4][.)]|[-*])\s+(.+)$/);
    if (choiceMatch && (inChoicesBlock || extractedChoices.length > 0 || /^[1-4][.)]/.test(trimmed))) {
      inChoicesBlock = true;
      const choiceText = choiceMatch[1].trim();
      if (choiceText.length > 4) {
        extractedChoices.push(choiceText);
      }
    } else if (!inChoicesBlock) {
      narrativeLines.push(line);
    }
  }

  let narrative = narrativeLines.join("\n").trim();
  if (!narrative) {
    narrative = workingText;
  }

  const finalChoices =
    extractedChoices.length >= 2
      ? extractedChoices.slice(0, 4)
      : getFallbackChoices(gameState);

  return {
    narrative,
    choices: finalChoices,
    events,
  };
}

export function applyHpDelta(gameState, delta) {
  const p = gameState.player;
  p.hp = Math.max(0, Math.min(p.maxHp, p.hp + delta));
}

export function applyManaDelta(gameState, delta) {
  const p = gameState.player;
  p.mana = Math.max(0, Math.min(p.maxMana, p.mana + delta));
}

/**
 * Use an inventory item (e.g., Healing Draught, Mana Elixir)
 */
export function useInventoryItem(gameState, itemIndex) {
  const item = gameState.player.inventory[itemIndex];
  if (!item) return null;

  const lower = item.toLowerCase();
  if (lower.includes("healing") || lower.includes("rations")) {
    const heal = lower.includes("healing") ? 10 : 4;
    applyHpDelta(gameState, heal);
    gameState.player.inventory.splice(itemIndex, 1);
    return `Used ${item} (+${heal} HP restored).`;
  }
  if (lower.includes("mana") || lower.includes("elixir")) {
    const restore = 10;
    applyManaDelta(gameState, restore);
    gameState.player.inventory.splice(itemIndex, 1);
    return `Drank ${item} (+${restore} Mana restored).`;
  }
  return null;
}

/**
 * Context-aware fallback choices grounded in the player's current Eos location
 */
export function getFallbackChoices(gameState) {
  const locId = gameState.locationId;
  switch (locId) {
    case "oakhaven_tavern":
      return [
        "Ask Bork One-Ear about the sinkhole into the Whispering Catacombs [CHECK:WIS:10]",
        "Speak with Vaelen the Whisper in the corner booth [CHECK:INT:11]",
        "Step outside into Oakhaven Market & Blacksmith",
        "Descend through the cellar trapdoor into the Whispering Catacombs [CHECK:DEX:11]",
      ];
    case "oakhaven_square":
      return [
        "Visit Kaelen the One-Eyed Smith to inspect weapons and gear",
        "Read Magistrate Vane's Bounty Board in the town square [CHECK:INT:10]",
        "Take the stone stairs down into the Whispering Catacombs",
        "March south along the sunken causeway into the Mire of Sighs",
      ];
    case "whispering_catacombs":
      return [
        "Search the limestone sarcophagi and Hall of Three Urns [CHECK:INT:12]",
        "Strike down the prowling undead guardian in the corridor [CHECK:STR:12]",
        "Creep silently past the Ashen Hand cultists toward the lower vault [CHECK:DEX:13]",
        "Follow the subterranean rift down to the Sunken Citadel Gate",
      ];
    case "mire_of_sighs":
      return [
        "Seek out Morwen the Bog-Witch in her reed hut [CHECK:WIS:11]",
        "Ambush the Mire-Goblin patrol along the sunken causeway [CHECK:DEX:12]",
        "Press onward through the volcanic mist to the Sunken Citadel Gate",
        "Climb the northern crags toward Wyrmtooth Pass [CHECK:STR:13]",
      ];
    case "sunken_citadel_gate":
      return [
        "Speak the ancient command word or focus astral energy on the Iron Golem [CHECK:INT:14]",
        "Charge the Ashen Hand sentries guarding the obsidian portal [CHECK:STR:14]",
        "Slip through the shattered aqueduct into the Sanctum of the Ember Shard [CHECK:DEX:14]",
        "Retreat back toward the Whispering Catacombs to regroup",
      ];
    case "sanctum_of_the_ember_shard":
      return [
        "Confront Dread-Captain Vargos in single combat for the Ember Shard [CHECK:STR:15]",
        "Shatter the necrotic chains binding the Third Ember Shard [CHECK:WIS:15]",
        "Channel the raw astral power of the Sun-Heart prism [CHECK:INT:15]",
        "Strike from the shadows at the cultist ritualists [CHECK:DEX:14]",
      ];
    default:
      return [
        "Search the area for hidden relics or passages [CHECK:INT:12]",
        "Ready your weapon and advance cautiously [CHECK:STR:12]",
        "Scout ahead from the shadows [CHECK:DEX:12]",
        "Return toward Oakhaven to resupply",
      ];
  }
}

/**
 * Update location automatically if the player's action clearly travels to a connected area
 */
export function updateLocationAndRewardsOnTurn(
  gameState,
  actionText,
  diceCheck
) {
  const events = [];
  const targetLoc = resolveLocationFromText(gameState.locationId, actionText);
  if (targetLoc && targetLoc.id !== gameState.locationId) {
    gameState.locationId = targetLoc.id;
    if (!gameState.visitedLocations.includes(targetLoc.id)) {
      gameState.visitedLocations.push(targetLoc.id);
    }
    events.push(`Traveled to ${targetLoc.name}`);
  }

  if (diceCheck) {
    if (diceCheck.success) {
      const xpGain = diceCheck.isCrit ? 25 : 15;
      gameState.player.xp += xpGain;
      if (diceCheck.isCrit) {
        const bonusGold = 10;
        gameState.player.gold += bonusGold;
        events.push(`Critical Success! +${xpGain} XP, +${bonusGold} GP`);
      } else {
        events.push(`Check Passed (+${xpGain} XP)`);
      }

      // Level up every 60 XP
      const nextLevelThreshold = gameState.player.level * 60;
      if (gameState.player.xp >= nextLevelThreshold) {
        gameState.player.level += 1;
        gameState.player.maxHp += 5;
        gameState.player.hp = gameState.player.maxHp;
        gameState.player.maxMana += 3;
        gameState.player.mana = gameState.player.maxMana;
        const primary =
          EOS_LORE.classes[gameState.player.classId]?.primaryStat || "STR";
        gameState.player.stats[primary] += 1;
        events.push(
          `LEVEL UP! Reached Level ${gameState.player.level} (+5 Max HP, +1 ${primary})`
        );
      }
    } else {
      const dmg = diceCheck.isFumble ? 5 : 3;
      applyHpDelta(gameState, -dmg);
      events.push(`Check Failed (-${dmg} HP)`);
    }
  }

  return events;
}

/**
 * LOCALSTORAGE & SAVE FILE (.eos.json) PERSISTENCE
 */
export function loadAllSaveSlots() {
  try {
    const raw = localStorage.getItem(STORAGE_SLOTS_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch (_e) {
    return {};
  }
}

export function saveToSlot(slotId, gameState) {
  try {
    const slots = loadAllSaveSlots();
    gameState.updatedAt = new Date().toISOString();
    slots[slotId] = gameState;
    localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
    localStorage.setItem(STORAGE_ACTIVE_SLOT_KEY, slotId);
    return true;
  } catch (err) {
    console.error("Failed to save to localStorage:", err);
    return false;
  }
}

export function getActiveSlotId() {
  return localStorage.getItem(STORAGE_ACTIVE_SLOT_KEY) || "slot_1";
}

export function loadFromSlot(slotId) {
  const slots = loadAllSaveSlots();
  return slots[slotId] || null;
}

export function deleteSlot(slotId) {
  const slots = loadAllSaveSlots();
  delete slots[slotId];
  localStorage.setItem(STORAGE_SLOTS_KEY, JSON.stringify(slots));
}

/**
 * Export the current gameState as a downloadable `.eos.json` Player Save File
 */
export function exportSaveFile(gameState) {
  const payload = JSON.stringify(gameState, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const safeName = (gameState.player?.name || "hero")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "_");
  const filename = `${safeName}_lv${gameState.player?.level || 1}_turn${
    gameState.turn || 1
  }.eos.json`;

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  return filename;
}

/**
 * Validate and parse an uploaded `.eos.json` Player Save File
 */
export function validateImportedSave(jsonString) {
  const data = JSON.parse(jsonString);
  if (
    !data ||
    typeof data !== "object" ||
    !data.player ||
    !data.player.name ||
    !data.player.stats ||
    !Array.isArray(data.storyLog)
  ) {
    throw new Error("Invalid Eos Save File format: missing player or storyLog.");
  }
  return data;
}
