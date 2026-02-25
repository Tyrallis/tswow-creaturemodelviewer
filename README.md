# Creature Model Viewer (CMV)
Highly WIP, updates by the community is highly welcomed!
Current Bugs are 
- Some Models not loaded properly `specifically models like character//humanmale.mdx etc..` show blank
- Most Models cant be resized or rotated
- Animations are `very` short. only Freeze and Stand work fine.
  
In-game viewer for creature models on any **TSWoW** (TypeScript WoW) 3.3.5 core. View by creature entry, display ID, or raw `.m2` path; toggle between `SetCreature` (textured) and `SetModel(path)`; use the Model Debug panel for path, scale, camera, and animation.

**Ready for GitHub:** clone or download this folder, then copy `addon/` and `datascripts/` into your TSWoW module.

---

## Features

- **View by entry** — `/cmv 69953` uses datascript-built maps (entry → display ID → model path).
- **View by path** — `/cmv path Creature/MyModel/creature.m2` to load any `.m2` directly.
- **View target** — `/cmv unit` to show your current target’s model.
- **Prefer textures** — Checkbox: ON = try `SetCreature` first (BLP from client DBC), then fall back to `SetModel(path)`; OFF = try path first.
- **Model Debug panel** — Entry ID, display ID, full model path (scrollable), scale, facing, camera, animation dropdown, expected BLP list.
- **Creature links** — Clicking creature links in chat can open the viewer when maps are built.

---

## Requirements

- **TSWoW** project (3.3.5 client).
- Without built maps, only `/cmv path <path>` and `/cmv unit` work; `/cmv <entry>` needs the generated map files.
- **UI textures (buttons, checkbox, arrows):**  
  For atlas-based icons to display correctly, install **[iThorgrim's WotLK Atlas System](https://github.com/iThorgrim/WotLK-Atlas-System)** (adds `SetAtlas` / `C_Texture.LoadAtlasData` for 3.3.5).  
  If you don’t install it, the addon falls back to standard WotLK textures (e.g. `UI-CheckBox-Up`, spellbook arrows); the viewer works, but some buttons may look different or use fallback art.

---

## Installation (any TSWoW core)

### 0. (Optional) WotLK Atlas System — for atlas textures

The viewer uses atlas names for the **Prefer textures** checkbox, debug toggle, arrows, and other buttons. To have those resolve correctly:

1. Download **[WotLK Atlas System](https://github.com/iThorgrim/WotLK-Atlas-System)** (Retail-style atlas API for 3.3.5).
2. Copy `AtlasHelper.lua` and `AtlasInfo.lua` into your client’s `Interface/FrameXML/` (or follow the project’s install steps).
3. Add them to the FrameXML `.toc` and reload UI.

Without this, CMV still runs and uses built-in WotLK texture fallbacks for the same controls.

### 1. Copy addon files

Copy everything from **`addon/`** into your module’s addon folder:

`<your-tswow>/install/modules/<your-module>/addon/`

| File | Purpose |
|------|--------|
| `UITemplate2X.xml` | Required: MetalFrame2X and button templates. |
| `CreatureModelViewer.xml` | Viewer window. |
| `CreatureModelViewerDebug.xml` | Debug panel. |
| `CreatureModelViewer.lua` | All CMV logic. |
| `CreatureModelViewer.toc` | Use as reference; copy its contents into your module’s main `.toc` in the same order. |
| `CreatureDisplayIdMap.lua` | Placeholder; overwritten by datascripts build. |
| `CreatureModelPathMap.lua` | Placeholder; overwritten by datascripts build. |
| `CreatureVariantsMap.lua` | Placeholder; overwritten by datascripts build. |
| `CreatureDisplayTexturesMap.lua` | Placeholder; overwritten by datascripts build. |

### 2. TOC load order

In your addon’s `.toc`, include in this order (see `addon/CreatureModelViewer.toc`):

```toc
UITemplate2X.xml
CreatureModelViewer.xml
CreatureModelViewerDebug.xml
CreatureDisplayIdMap.lua
CreatureModelPathMap.lua
CreatureVariantsMap.lua
CreatureDisplayTexturesMap.lua
CreatureModelViewer.lua
```

### 3. Copy datascripts and build maps

Copy the **`datascripts/`** folder into your module so you have:

- `<your-module>/datascripts/GenerateCreatureMaps.ts`
- `<your-module>/datascripts/Creatures/datascripts.ts` (optional, see below)

**Option A — Maps only (no creature creation from assets)**  
Wire `GenerateCreatureMaps` into your build:

```ts
import { main as buildCreatureMaps } from "./GenerateCreatureMaps";

std.Events.patch("your-patch-event-name", () => {
  buildCreatureMaps();
});
```

**Option B — Maps + creature creation from .m2 assets (recommended)**  
Use **`Creatures/datascripts.ts`** as-is. It already imports `GenerateCreatureMaps` and on the `spell-creature-create` patch it:

1. Cleans up invalid creature templates (broken model refs).
2. Scans `modules/<MODULE_NAME>/assets/` for `.m2` files and creates CreatureModelData, CreatureDisplayInfo, and creature_template for each.
3. Writes the four CMV map `.lua` files (including the new entries) into your module’s addon folder.

**Set your module name** in `Creatures/datascripts.ts`: change `MODULE_NAME` to your module (e.g. `"my-module"`). If `modules/<MODULE_NAME>/assets/` does not exist, the script still runs and only builds the maps from existing DBC. Set `ENABLE_SPAWNS = true` there if you want spawns added for each created creature.

Then run:

```bash
build data // build all
```

### 4. Reload UI

In-game, run `/reload` so the addon loads the new map files.

---

## Usage

| Command | Description |
|--------|-------------|
| `/cmv` | Show help. |
| `/cmv <entry>` | Open viewer for creature entry (e.g. `/cmv 69953`). |
| `/cmv path <path>` | Open viewer for model path (e.g. `Creature/MyModel/model.m2`). |
| `/cmv unit` | Load current target’s model (target a creature first). |
| `Click Hyperlink generated by .lookup creature` | Starts up the ModelViewer instantly. |

- **Prefer textures** (checkbox): ON = SetCreature first; OFF = SetModel(path) first.
- **Model Debug** (wrench button): Path, scale, camera, animation, expected BLP.
- **Animation** dropdown in the debug panel: Choose animation by index/name.

---

## Repository structure

```
CreatureModelViewer/
  README.md                 (this file)
  addon/
    UITemplate2X.xml
    CreatureModelViewer.xml
    CreatureModelViewerDebug.xml
    CreatureModelViewer.lua
    CreatureModelViewer.toc
    CreatureDisplayIdMap.lua    (placeholder)
    CreatureModelPathMap.lua    (placeholder)
    CreatureVariantsMap.lua     (placeholder)
    CreatureDisplayTexturesMap.lua (placeholder)
  datascripts/
    GenerateCreatureMaps.ts       (map generator; required for CMV maps)
    Creatures/
      datascripts.ts              (optional: create creatures from .m2 under assets + build maps)
```

---

## License

Use under the same terms as the TSWoW project you integrate with, unless stated otherwise in the repository.
