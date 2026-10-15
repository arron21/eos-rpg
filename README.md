# ⚔️ EOS — Old-School Sword & Sorcery Text RPG (In-Browser WebGPU LLM)

An old-school 1980s Sword & Sorcery text-based RPG set in the world of **Eos**, guided entirely by a local in-browser Large Language Model via **[@huggingface/transformers](https://www.npmjs.com/package/@huggingface/transformers)** and **WebGPU**.

## ✨ Key Features

- **100% Local In-Browser LLM Dungeon Master**:
  - Runs open-weights LLMs (`SmolLM2-360M-Instruct`, `SmolLM2-135M-Instruct`, `Qwen2.5-0.5B-Instruct`, `Llama-3.2-1B-Instruct`, `SmolLM2-1.7B-Instruct`) inside a dedicated Web Worker (`src/worker.js`) using WebGPU (with automatic WASM fallback).
- **Behind-the-Scenes Centralized Lore Engine (`src/eos.js`)**:
  - Contains the world cosmology of **Eos** (The Shattered Sun-Heart of Sol-Vane), factions, interconnected locations (The Rusty Flagon Inn, Oakhaven Square, The Whispering Catacombs, The Mire of Sighs, Gates of the Sunken Citadel, Sanctum of the Ember Shard, and Wyrmtooth Pass), NPCs, bestiary, and quests.
  - Dynamically injects only the relevant location, NPC, and threat lore into the LLM prompt each turn to keep context compact and fast.
- **Choice-Driven Narrative + Custom Actions**:
  - Every turn generates vivid second-person narration and **4 clickable numbered choices (`1`–`4`)**, plus a freeform prompt input so players can type any custom action.
- **Classic 80s D&D Lite Mechanics (`src/engine.js`)**:
  - 4 Playable Classes (**Mercenary Warrior**, **Shadowblade Rogue**, **Arcane Seeker**, **Templar Cleric**).
  - 4 Core Stats (**STR**, **DEX**, **INT**, **WIS**), HP, Mana, Gold, Equipment, and Inventory items.
  - Automatic and manual `d20 + Stat Modifier` skill and combat checks.
- **Dual Persistence (`localStorage` + `.eos.json` Player Save File)**:
  - Continuous auto-save across 3 browser `localStorage` campaign slots.
  - One-click **Export `.eos.json`** and **Load Save File** to back up or transfer your character sheet, inventory, visited locations, and full adventure log.

## 🚀 Run Locally

```bash
npm install
npm run dev
```
