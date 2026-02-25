# 🧿 Creature Model Viewer (CMV)

> In-game creature model viewer for **TSWoW (3.3.5)**
> View creature models by Entry ID, Display ID, raw `.m2` path, or current target.

![Status](https://img.shields.io/badge/status-WIP-orange)
![Client](https://img.shields.io/badge/client-3.3.5-blue)
![Core](https://img.shields.io/badge/core-TSWoW-purple)
![Community](https://img.shields.io/badge/contributions-welcome-brightgreen)

---

🖼 Preview
### Model Viewer + Debug Panel
<p align="center"> <img src="https://raw.githubusercontent.com/Tyrallis/tswow-creaturemodelviewer/main/Screenshots/Screenshot%202026-02-24%20230434.png" width="48%"> <img src="https://raw.githubusercontent.com/Tyrallis/tswow-creaturemodelviewer/main/Screenshots/Screenshot%202026-02-24%20233611.png" width="48%"> </p> <p align="center"> <img src="https://raw.githubusercontent.com/Tyrallis/tswow-creaturemodelviewer/main/Screenshots/Screenshot%202026-02-24%20233620.png" width="48%"> <img src="https://raw.githubusercontent.com/Tyrallis/tswow-creaturemodelviewer/main/Screenshots/Screenshot%202026-02-25%20005942.png" width="48%"> </p>



Example: Entry `69953` loaded with full debug output including animation controls, scale adjustments, camera switching, and expected BLP texture information.

---

## ✨ Features

### 🔎 Multiple Viewing Modes

* **View by Entry**

  ```
  /cmv 69953
  ```

  Uses datascript-generated maps (entry → display ID → model path).

* **View by Path**

  ```
  /cmv path Creature/MyModel/model.m2
  ```

  Directly loads any `.m2` file.

* **View Target**

  ```
  /cmv unit
  ```

  Loads the currently selected creature.

* **Creature Hyperlink Support**
  Clicking `.lookup creature` links can automatically open CMV when maps are available.

---

### 🎨 Texture Handling

**Prefer Textures Toggle**

| Mode  | Behavior                                                                            |
| ----- | ----------------------------------------------------------------------------------- |
| ✅ ON  | Try `SetCreature()` first (uses client DBC textures) → fallback to `SetModel(path)` |
| ❌ OFF | Try `SetModel(path)` first → fallback to `SetCreature()`                            |

Allows switching between fully textured display mode and raw model debugging.

---

### 🛠 Model Debug Panel

The integrated debug panel provides:

* Entry ID
* Display ID
* Full model path (scrollable)
* Scale control
* Facing control
* Camera selection
* Animation dropdown
* Expected BLP texture list
* Load source indicator

Designed for development, asset testing, and troubleshooting custom models.

---

## ⚠️ Known Issues

* Some models (e.g. `character//humanmale.mdx`) may load blank
* Many models cannot currently be resized or rotated reliably
* Most animations are short

  * `Stand` and `Freeze` work correctly

---

## 📦 Requirements

* **TSWoW Core**
* **3.3.5 Client**
* Generated map files required for `/cmv <entry>`

Without generated maps, the following remain functional:

* `/cmv path <path>`
* `/cmv unit`

---

## 🧩 Optional: Atlas UI Support

For Retail-style atlas icons and modern UI textures, install:

**WotLK Atlas System**
[https://github.com/iThorgrim/WotLK-Atlas-System](https://github.com/iThorgrim/WotLK-Atlas-System)

Enables:

* `SetAtlas`
* `C_Texture.LoadAtlasData`

Without it, CMV falls back to standard WotLK textures.

---

# 🚀 Installation

## 1️⃣ Copy Addon Files

Copy everything from:

```
addon/
```

Into:

```
<your-tswow>/install/modules/<your-module>/addon/
```

---

## 📄 TOC Load Order (Important)

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

Load order must remain unchanged.

---

## 2️⃣ Datascripts Setup

Copy the `datascripts/` folder into your module.

---

### Option A — Map Generation Only

```ts
import { main as buildCreatureMaps } from "./GenerateCreatureMaps";

std.Events.patch("your-event", () => {
  buildCreatureMaps();
});
```

Then run:

```
build data
```

---

### Option B — Full Asset Integration (Recommended)

`Creatures/datascripts.ts` will:

1. Clean invalid creature templates
2. Scan `modules/<MODULE_NAME>/assets/` for `.m2` files
3. Auto-create:

   * CreatureModelData
   * CreatureDisplayInfo
   * creature_template
4. Generate and write all CMV map `.lua` files

Set your module name:

```ts
const MODULE_NAME = "your-module";
```

Optional:

```ts
ENABLE_SPAWNS = true;
```

Then run:

```
build data
```

---

## 🔄 Reload

In-game:

```
/reload
```

---

# 🕹 Usage

| Command                  | Description           |
| ------------------------ | --------------------- |
| `/cmv`                   | Show help             |
| `/cmv <entry>`           | Open viewer by entry  |
| `/cmv path <path>`       | Load raw model        |
| `/cmv unit`              | Load current target   |
| Click creature hyperlink | Open viewer instantly |

---

# 📁 Repository Structure

```
CreatureModelViewer/
│
├── README.md
│
├── addon/
│   ├── UITemplate2X.xml
│   ├── CreatureModelViewer.xml
│   ├── CreatureModelViewerDebug.xml
│   ├── CreatureModelViewer.lua
│   ├── CreatureModelViewer.toc
│   ├── CreatureDisplayIdMap.lua
│   ├── CreatureModelPathMap.lua
│   ├── CreatureVariantsMap.lua
│   └── CreatureDisplayTexturesMap.lua
│
└── datascripts/
    ├── GenerateCreatureMaps.ts
    └── Creatures/
        └── datascripts.ts
```

---

# 🤝 Contributing

Contributions are welcome.

Suggested areas:

* Animation improvements
* Model rotation & scaling stability
* Camera refinement
* UI polish
* Performance optimization

---

# 📜 License

Use under the same terms as the TSWoW project you integrate with, unless otherwise specified in this repository.
