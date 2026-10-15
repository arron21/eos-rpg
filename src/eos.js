/**
 * CENTRALIZED LORE MODULE: THE REALM OF EOS (eos.js)
 *
 * This module serves as the authoritative, behind-the-scenes world bible and lore index
 * for the in-browser LLM Dungeon Master. Because in-browser LLMs operate with compact
 * context windows, `getLoreContextForState()` dynamically retrieves and assembles only
 * the relevant regional lore, active location details, local NPCs, bestiary threats,
 * and quest hooks for the player's current state and action.
 */

export const EOS_LORE = {
  worldName: "Eos",
  tagline: "The Shattered Crown of the Sun-Forged",
  era: "The Fourth Age of Ash (Year 842 after the Sundering of Sol-Vane)",
  toneAndStyle:
    "Classic 1980s Sword & Sorcery Dungeon Crawler (inspired by B/X D&D, Zork, Fighting Fantasy, and Conan). Gritty, atmospheric, concise second-person narration ('You stand...', 'Torchlight flickers...'). Rich sensory details: smell of ozone and damp flagstone, clinking mail, cold iron, and ancient sorcery.",

  cosmology: {
    overview:
      "Centuries ago, the God-Emperors of the Dawn ruled Eos from the floating citadel of Sol-Vane, drawing power from the Sun-Heart—a massive prism of living astral fire. When the Lich-Archon Malakor struck the prism with the Obsidian Spear, the Sun-Heart shattered into seven Ember Shards. Sol-Vane plunged into the Caldera of Cinders, and a perpetual twilight settled over the northern marches.",
    magicSystem:
      "Arcane magic (Weave-craft) draws upon residual ley-lines radiating from buried Ember Shards. Divine miracles flow from the Triad of the Old Covenant: Valen (God of the Dawnblade), Nyxara (Lady of Shadows & Luck), and Thalos (The Stone-Father).",
    currency: "Gold Crowns (GP), stamped with the broken sunburst of old Oakhaven.",
  },

  classes: {
    warrior: {
      id: "warrior",
      name: "Mercenary Warrior",
      title: "Ironblade of the Red Company",
      description:
        "Hardened by border wars and subterranean delves. Masters of steel, shield-wall tactics, and sheer physical endurance.",
      primaryStat: "STR",
      baseStats: { STR: 16, DEX: 12, INT: 9, WIS: 11 },
      maxHp: 28,
      maxMana: 6,
      startingGold: 35,
      equipment: {
        weapon: "Broadsword of Oakhaven (+2 DMG)",
        armor: "Hauberk of Ringmail (+3 DEF)",
        relic: "Iron Signet of the Red Company",
      },
      inventory: ["Healing Draught", "Healing Draught", "Pitch Torch", "Iron Rations"],
      abilities: ["Power Cleave (STR)", "Shield Bash (STR)", "Intimidating Roar (STR)"],
    },
    rogue: {
      id: "rogue",
      name: "Shadowblade Rogue",
      title: "Cutpurse of the Whispering Alley",
      description:
        "Quick-fingered, sharp-eyed, and deadly from the shadows. Trained by the Velvet Mask syndicate in lockpicking, trap-disarming, and vital strikes.",
      primaryStat: "DEX",
      baseStats: { STR: 11, DEX: 16, INT: 13, WIS: 10 },
      maxHp: 22,
      maxMana: 10,
      startingGold: 50,
      equipment: {
        weapon: "Twin Stilettos of Black Glass (+2 DMG)",
        armor: "Boiled Shadow-Leather (+2 DEF)",
        relic: "Masterwork Thieves' Picks",
      },
      inventory: ["Healing Draught", "Smoke Bomb", "Vial of Wyvern Venom", "Grappling Hook"],
      abilities: ["Backstab (DEX)", "Disarm Trap / Pick Lock (DEX)", "Shadow Veil (DEX)"],
    },
    mage: {
      id: "mage",
      name: "Arcane Seeker",
      title: "Acolyte of the Astral Spire",
      description:
        "Wielder of eldritch geometry and volatile Ember-magic. Frail in body, but capable of incanting devastating bolts of astral fire and deciphering pre-Sundering runes.",
      primaryStat: "INT",
      baseStats: { STR: 8, DEX: 12, INT: 17, WIS: 13 },
      maxHp: 18,
      maxMana: 24,
      startingGold: 30,
      equipment: {
        weapon: "Ashwood Runestaff (+1 DMG, +3 Spell)",
        armor: "Robes of the Star-Weaver (+1 DEF)",
        relic: "Cracked Astral Lens",
      },
      inventory: ["Healing Draught", "Mana Elixir", "Mana Elixir", "Scroll of Firebolt"],
      abilities: ["Astral Bolt (INT)", "Decipher Elder Runes (INT)", "Arcane Ward (INT)"],
    },
    cleric: {
      id: "cleric",
      name: "Templar Cleric",
      title: "Knight-Confessor of Valen",
      description:
        "Sworn to the Order of the Dawnblade. Armed with a blessed warhammer and litanies of solar radiance that mend wounds and sear the undead.",
      primaryStat: "WIS",
      baseStats: { STR: 13, DEX: 10, INT: 11, WIS: 16 },
      maxHp: 25,
      maxMana: 18,
      startingGold: 30,
      equipment: {
        weapon: "Sun-Blessed Warhammer (+2 DMG)",
        armor: "Scale Corselet & Sun Tabard (+3 DEF)",
        relic: "Silver Sunburst Reliquary",
      },
      inventory: ["Healing Draught", "Mana Elixir", "Holy Water Vial", "Pitch Torch"],
      abilities: ["Turn Undead / Solar Smite (WIS)", "Lay on Hands (WIS)", "Sense Malice (WIS)"],
    },
  },

  factions: [
    {
      id: "dawnblade_order",
      name: "Order of the Dawnblade",
      alignment: "Lawful",
      summary:
        "zealous knights and clerics seeking to recover the lost Ember Shards and relight the beacon of Oakhaven.",
    },
    {
      id: "velvet_mask",
      name: "The Velvet Mask Guild",
      alignment: "Neutral / Opportunistic",
      summary:
        "A subterranean syndicate of smugglers, tomb-robbers, and spies operating beneath the Rusty Flagon Inn.",
    },
    {
      id: "ashen_covenant",
      name: "Cult of the Ashen Hand",
      alignment: "Chaotic Evil",
      summary:
        "Necromancers, goblinoid warbands, and dread knights serving the undying echo of Lich-Archon Malakor in the Sunken Citadel.",
    },
  ],

  locations: {
    oakhaven_tavern: {
      id: "oakhaven_tavern",
      name: "The Rusty Flagon Inn (Oakhaven)",
      region: "Frontier Town of Oakhaven",
      dangerLevel: "Safe Haven",
      atmosphere:
        "Hearth-smoke hangs low beneath blackened oak rafters. Rain lashes the leaded glass windows outside, while mud-spattered mercenaries and hooded tomb-robbers huddle over pewter tankards of spiced ale.",
      loreSummary:
        "Oakhaven is the last fortified bastion before the Mire of Sighs and the Sunken Citadel of Sol-Vane. Recently, grave-tremors have opened a sinkhole beneath the town's old catacombs, and patrols sent down have not returned.",
      connectedLocations: ["oakhaven_square", "whispering_catacombs", "mire_of_sighs"],
      npcs: ["bork_innkeeper", "seraphina_scout", "hooded_stranger"],
      encounters: ["tavern_brawler", "velvet_cutpurse"],
      secrets:
        "A loose flagstone behind Bork's ale casks leads directly into a smuggler's tunnel connected to the Whispering Catacombs (DC 12 WIS or INT check to spot).",
    },

    oakhaven_square: {
      id: "oakhaven_square",
      name: "Oakhaven Market & Blacksmith",
      region: "Frontier Town of Oakhaven",
      dangerLevel: "Low",
      atmosphere:
        "Cobblestones slick with cold mist surround a cracked fountain of the Stone-Father. The clang of Magistrate Vane's guards and the rhythmic hammer of Kaelen the One-Eyed Smith echo off timbered walls.",
      loreSummary:
        "The town square hosts the Bounty Board of Magistrate Vane, offering 200 Gold Crowns to any adventurer who brings back proof of what stirs beneath the Whispering Catacombs or recovers the stolen Sun-Chalice.",
      connectedLocations: ["oakhaven_tavern", "whispering_catacombs", "mire_of_sighs"],
      npcs: ["kaelen_smith", "magistrate_vane"],
      encounters: ["corrupt_watchman", "rabid_dire_rat"],
      secrets:
        "Kaelen the Smith will temper a warrior's blade or trade a Runed Silver Dagger if shown the Iron Signet or paid 25 Gold.",
    },

    whispering_catacombs: {
      id: "whispering_catacombs",
      name: "The Whispering Catacombs",
      region: "Under-Oakhaven Labyrinth",
      dangerLevel: "Moderate (Dungeon Level 1)",
      atmosphere:
        "Cold drafts carry the scent of dry bone, myrrh, and centuries-old dust. Carvings of First-Age kings line the sunken limestone corridors, their eyes scratched out by cultists.",
      loreSummary:
        "Built atop an ancient pre-Sundering crypt, these catacombs house the bones of Oakhaven's founders. Recently, acolytes of the Ashen Hand broke through the lower ossuary wall to unearth the Vault of the Pale King.",
      connectedLocations: ["oakhaven_tavern", "oakhaven_square", "sunken_citadel_gate"],
      npcs: ["brother_cedric_ghost"],
      encounters: ["skeletal_legionnaire", "crypt_ghoul", "ashen_acolyte", "carrion_crawler"],
      secrets:
        "In the Hall of Three Urns, speaking the name 'Valen' or turning the middle bronze brazier (DC 13 INT/DEX) opens the sealed vault containing the Sun-Chalice and a passage to the Sunken Citadel.",
    },

    mire_of_sighs: {
      id: "mire_of_sighs",
      name: "The Mire of Sighs",
      region: "Blighted Fenlands",
      dangerLevel: "Moderate-High (Wilderness)",
      atmosphere:
        "Gnarled cypress trees draped in pale corpse-moss rise from black, bubbling peat water. Will-o'-wisps drift in the fog like drowned lanterns, and broken marble pillars jut from the bog.",
      loreSummary:
        "When Sol-Vane fell, the shockwave flooded the royal causeway, turning fertile valleys into a haunted fen. Bog-goblins and scale-hags now pick through the sunken ruins along the Pilgrim's Causeway.",
      connectedLocations: ["oakhaven_tavern", "oakhaven_square", "sunken_citadel_gate", "wyrmtooth_pass"],
      npcs: ["morwen_bog_witch"],
      encounters: ["bog_goblin_ambusher", "will_o_wisp", "mire_troll", "venomous_fen_wyvern"],
      secrets:
        "Morwen the Bog-Witch trades ancient potions for shiny relics, and knows the secret word ('SOLARIS') that bypasses the Stone Golem guardian at the Sunken Citadel Gate.",
    },

    sunken_citadel_gate: {
      id: "sunken_citadel_gate",
      name: "Gates of the Sunken Citadel (Sol-Vane)",
      region: "Caldera of Cinders",
      dangerLevel: "High (Dungeon Level 2)",
      atmosphere:
        "Cyclopean gates of fused black glass and tarnished gold loom at the bottom of a smoking volcanic rift. Veins of pale blue astral fire pulse beneath the crackedobsidian courtyard.",
      loreSummary:
        "The outer sanctum of fallen Sol-Vane. Here, Dread-Captain Vargos of the Ashen Hand marshals undead thralls to excavate the Third Ember Shard from the Inner Sanctum.",
      connectedLocations: ["whispering_catacombs", "mire_of_sighs", "sanctum_of_the_ember_shard"],
      npcs: ["bound_automaton_ix"],
      encounters: ["obsidian_gargoyle", "runed_iron_golem", "ashen_dread_knight"],
      secrets:
        "The Runed Iron Golem at the portal stands down if spoken the command word 'SOLARIS' or if an Arcane Seeker focuses their Cracked Astral Lens (DC 14 INT/WIS).",
    },

    sanctum_of_the_ember_shard: {
      id: "sanctum_of_the_ember_shard",
      name: "Sanctum of the Ember Shard",
      region: "Heart of Sol-Vane",
      dangerLevel: "Deadly (Boss Sanctum)",
      atmosphere:
        "A vast dome of shattered star-glass suspended over an abyss of golden fire. At the center of a floating dais hovers a jagged fragment of the Sun-Heart—the Third Ember Shard—encircled by chains of necrotic shadow.",
      loreSummary:
        "The climax of the delve. Dread-Captain Vargos and the bound Wraith of Malakor guard the Ember Shard. Claiming or purifying the Shard can restore light to Oakhaven—or grant the bearer terrible arcane dominion.",
      connectedLocations: ["sunken_citadel_gate", "wyrmtooth_pass"],
      npcs: ["dread_captain_vargos"],
      encounters: ["dread_captain_vargos", "malakor_echo_wraith", "cinder_drake"],
      secrets:
        "Shattering the necrotic chains with a blessed relic or DC 15 check weakens Vargos before the final clash.",
    },

    wyrmtooth_pass: {
      id: "wyrmtooth_pass",
      name: "Wyrmtooth Crags & Dragon's Roost",
      region: "Northern Frost-Peaks",
      dangerLevel: "High (Highland Lair)",
      atmosphere:
        "Jagged granite spires claw at a bruised purple sky. Sulfur vents hiss through snowdrifts littered with the charred shields of ancient knights.",
      loreSummary:
        "Lair of Ignis-Vane, an ancient red-bronze wyrm who swallowed a splinter of the Sun-Heart during the Sundering and slumbers atop a hoard of First-Age artifacts.",
      connectedLocations: ["mire_of_sighs", "sanctum_of_the_ember_shard"],
      npcs: ["ignis_vane_wyrm"],
      encounters: ["crag_harpy", "cinder_drake", "ignis_vane_wyrm"],
      secrets:
        "Ignis-Vane respects bold parley or riddles (DC 15 INT/WIS) as much as raw steel.",
    },
  },

  npcs: {
    bork_innkeeper: {
      name: "Bork One-Ear",
      role: "Proprietor of the Rusty Flagon",
      disposition: "Gruff but helpful",
      trait: "Polishes mugs with a stained rag; former sergeant of the Red Company.",
      knowledge:
        "Knows that cellar rats the size of hounds chewed through the old crypt wall downstairs, and that a hooded emissary offered 100 gold for anyone brave enough to enter the Whispering Catacombs.",
    },
    seraphina_scout: {
      name: "Seraphina of the Silver Bow",
      role: "Ranger of the Dawnblade",
      disposition: "Vigilant & earnest",
      trait: "Wears a cloak of marsh-raven feathers; nursing a poisoned arrow wound.",
      knowledge:
        "Survived an ambush in the Mire of Sighs. Warns that the Cult of the Ashen Hand is marching toward the Sunken Citadel Gate.",
    },
    hooded_stranger: {
      name: "Vaelen the Whisper",
      role: "Factor of the Velvet Mask Guild",
      disposition: "Calculating & secretive",
      trait: "Flips an ancient square gold coin between gloved knuckles.",
      knowledge:
        "Will pay 150 Gold Crowns for the Sun-Chalice hidden inside the Whispering Catacombs—no questions asked.",
    },
    kaelen_smith: {
      name: "Kaelen the One-Eyed",
      role: "Master Armorer of Oakhaven",
      disposition: "Blunt & honorable",
      trait: "Wears an eyepatch etched with the rune of Thalos.",
      knowledge:
        "Forged weapons for the last expedition into Sol-Vane; sells healing draughts, torches, and silvered blades.",
    },
    brother_cedric_ghost: {
      name: "Ghost of Brother Cedric",
      role: "Spectral Custodian of the Catacombs",
      disposition: "Mournful",
      trait: "Glows with pale candle-light; cannot leave the Hall of Three Urns.",
      knowledge:
        "Reveals the riddle of the Three Braziers to those who show respect to the Dawnblade.",
    },
    morwen_bog_witch: {
      name: "Morwen of the Hollow Reed",
      role: "Oracle of the Mire",
      disposition: "Eccentric & cryptic",
      trait: "Speaks in rhymes while stirring a cauldron of luminescent bog-lotus.",
      knowledge:
        "Knows the ancient golem command word 'SOLARIS' and brews elixirs of vitality.",
    },
    dread_captain_vargos: {
      name: "Dread-Captain Vargos",
      role: "Warlord of the Ashen Hand",
      disposition: "Ruthless & fanatical",
      trait: "Clad in scorched black plate armor pulsing with stolen Ember-light.",
      knowledge:
        "Seeks to bind the Third Ember Shard to resurrect Lich-Archon Malakor.",
    },
  },

  bestiary: {
    skeletal_legionnaire: {
      name: "Skeletal Legionnaire",
      difficulty: 11,
      damage: "1d6 (4)",
      lore: "Reanimated First-Age soldier carrying a notched bronze gladius and decaying tower shield.",
    },
    crypt_ghoul: {
      name: "Crypt Ghoul",
      difficulty: 12,
      damage: "1d6+1 (5)",
      lore: "Hunched carrion-eater with paralyzing claws that lurks behind stone sarcophagi.",
    },
    ashen_acolyte: {
      name: "Ashen Hand Cultist",
      difficulty: 12,
      damage: "1d6+2 (5)",
      lore: "Robed necromancer chanting guttural hexes and hurling bolts of grave-frost.",
    },
    bog_goblin_ambusher: {
      name: "Mire-Goblin Skirmisher",
      difficulty: 11,
      damage: "1d6 (4)",
      lore: "Mud-camouflaged raider armed with barbed blowdarts and a rusted spear.",
    },
    runed_iron_golem: {
      name: "Sol-Vane Sentinel Golem",
      difficulty: 15,
      damage: "2d4+2 (7)",
      lore: "Nine-foot construct of brass and meteoric iron sworn to incinerate trespassers who lack the Pass-Word.",
    },
    dread_captain_vargos: {
      name: "Dread-Captain Vargos",
      difficulty: 16,
      damage: "2d6 (8)",
      lore: "Champion of the Ashen Hand wielding a greatsword of cursed obsidian.",
    },
  },

  quests: [
    {
      id: "secrets_under_oakhaven",
      title: "Shadows Beneath the Flagon",
      summary:
        "Investigate the sinkhole and crypt breach beneath Oakhaven leading into the Whispering Catacombs.",
    },
    {
      id: "relic_of_the_sun_chalice",
      title: "The Lost Sun-Chalice",
      summary:
        "Recover the golden Sun-Chalice from the Hall of Three Urns in the Whispering Catacombs for either the Dawnblade Order or the Velvet Mask.",
    },
    {
      id: "the_third_ember_shard",
      title: "The Ember Shard of Sol-Vane",
      summary:
        "Journey through the Catacombs or the Mire of Sighs to the Sunken Citadel of Sol-Vane and stop Dread-Captain Vargos from corrupting the Third Ember Shard.",
    },
  ],
};

/**
 * Resolves the most relevant location object based on current state or text keywords
 */
export function resolveLocationFromText(currentLocationId, text = "") {
  const lower = text.toLowerCase();
  if (
    lower.includes("catacomb") ||
    lower.includes("crypt") ||
    lower.includes("tomb") ||
    lower.includes("cellar") ||
    lower.includes("sinkhole")
  ) {
    return EOS_LORE.locations.whispering_catacombs;
  }
  if (
    lower.includes("mire") ||
    lower.includes("swamp") ||
    lower.includes("bog") ||
    lower.includes("fen") ||
    lower.includes("marsh")
  ) {
    return EOS_LORE.locations.mire_of_sighs;
  }
  if (
    lower.includes("sanctum") ||
    lower.includes("shard") ||
    lower.includes("inner") ||
    lower.includes("vargos")
  ) {
    return EOS_LORE.locations.sanctum_of_the_ember_shard;
  }
  if (
    lower.includes("citadel") ||
    lower.includes("sol-vane") ||
    lower.includes("gate") ||
    lower.includes("caldera")
  ) {
    return EOS_LORE.locations.sunken_citadel_gate;
  }
  if (
    lower.includes("wyrm") ||
    lower.includes("dragon") ||
    lower.includes("crag") ||
    lower.includes("mountain")
  ) {
    return EOS_LORE.locations.wyrmtooth_pass;
  }
  if (
    lower.includes("market") ||
    lower.includes("square") ||
    lower.includes("smith") ||
    lower.includes("kaelen") ||
    lower.includes("bounty")
  ) {
    return EOS_LORE.locations.oakhaven_square;
  }
  if (
    lower.includes("tavern") ||
    lower.includes("flagon") ||
    lower.includes("inn") ||
    lower.includes("bork")
  ) {
    return EOS_LORE.locations.oakhaven_tavern;
  }

  return (
    EOS_LORE.locations[currentLocationId] || EOS_LORE.locations.oakhaven_tavern
  );
}

/**
 * Builds a concise, token-efficient Eos Lore Context block for the LLM Dungeon Master.
 * Keeps prompt token footprint small (~350 tokens) so browser LLMs respond rapidly
 * while staying deeply grounded in the world of Eos.
 */
export function buildEosPromptContext(gameState, playerAction = "") {
  const loc =
    EOS_LORE.locations[gameState.locationId] ||
    EOS_LORE.locations.oakhaven_tavern;

  const npcDetails = (loc.npcs || [])
    .map((npcId) => {
      const n = EOS_LORE.npcs[npcId];
      return n ? `${n.name} (${n.role}): ${n.knowledge}` : null;
    })
    .filter(Boolean)
    .join(" | ");

  const encounterDetails = (loc.encounters || [])
    .map((encId) => {
      const e = EOS_LORE.bestiary[encId];
      return e ? `${e.name} (DC ${e.difficulty}, DMG ${e.damage})` : encId;
    })
    .join(", ");

  const connectedNames = (loc.connectedLocations || [])
    .map((id) => EOS_LORE.locations[id]?.name || id)
    .join(", ");

  const p = gameState.player;
  const invList =
    p.inventory && p.inventory.length > 0 ? p.inventory.join(", ") : "None";

  return [
    `WORLD LORE (EOS): ${EOS_LORE.cosmology.overview}`,
    `CURRENT LOCATION: ${loc.name} [${loc.region} - Danger: ${loc.dangerLevel}]`,
    `ATMOSPHERE: ${loc.atmosphere}`,
    `LOCAL LORE & SECRETS: ${loc.loreSummary} Secret: ${loc.secrets}`,
    `NEARBY NPCS: ${npcDetails || "None"}`,
    `LOCAL THREATS: ${encounterDetails || "None"}`,
    `CONNECTED PATHS: ${connectedNames}`,
    `PLAYER HERO: ${p.name}, Level ${p.level} ${p.className} | HP: ${p.hp}/${p.maxHp} | Mana: ${p.mana}/${p.maxMana} | Gold: ${p.gold} GP`,
    `STATS: STR ${p.stats.STR}, DEX ${p.stats.DEX}, INT ${p.stats.INT}, WIS ${p.stats.WIS} | Equipped: ${p.equipment.weapon}, ${p.equipment.armor}`,
    `INVENTORY: ${invList}`,
  ].join("\n");
}
