/**
 * Creature datascripts: optional creature templates from .m2 assets, and CMV map output.
 * The four write* calls at the end are required for the Creature Model Viewer addon.
 *
 * Set MODULE_NAME to your TSWoW module name (e.g. "my-module"). ASSETS_ROOT should point
 * to your module's assets folder where .m2 files live. If you don't use assets, the maps
 * are still built from existing creature_template + DBC (processAllM2UnderAssets is skipped
 * when ASSETS_ROOT doesn't exist).
 */
import { std } from "wow/wotlk";
import path from "path";
import fs from "fs";
import {
  writeCreatureDisplayIdMap,
  writeCreatureModelPathMap,
  writeCreatureModelVariations,
  writeCreatureDisplayTexturesMap,
  getTexturesForModelPath,
} from "../GenerateCreatureMaps";

/** Your TSWoW module name (e.g. "magic-core" or "my-module"). */
const MODULE_NAME = "magic-core";
const ASSETS_ROOT = path.join("modules", MODULE_NAME, "assets");

/** Set to true to add spawns for each created creature at the base position (for quick in-game viewing). */
const ENABLE_SPAWNS = false;

const base = {
  map: 13,
  x0: -14.550729,
  y0: -6.558920,
  z: -144.708649,
  o: 4.706141,
  dx: -3,
  dy: 10,
  perRow: 10,
};

const seenDisplays  = new Set<string>();
const seenTemplates = new Set<string>();

function walkSync(dir: string): string[] {
  const results: string[] = [];
  let entries: string[];
  try {
    entries = fs.readdirSync(dir);
  } catch {
    return results;
  }
  for (const name of entries) {
    const full = path.join(dir, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(full);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      for (const p of walkSync(full)) results.push(p);
    } else {
      results.push(full);
    }
  }
  return results;
}

function toClientModelPath(absPath: string): string {
  const relFromAssets = path.relative(ASSETS_ROOT, absPath);
  return relFromAssets.replace(/\//g, "\\").replace(/\.m2$/i, ".mdx");
}

function safeNameFromPath(absPath: string): string {
  const rel    = path.relative(ASSETS_ROOT, absPath);
  const noExt  = rel.replace(/\.m2$/i, "");
  return noExt.replace(/[\\/]/g, "_").replace(/[^A-Za-z0-9_]/g, "_");
}

function cleanupInvalidCreatureEntries(): void {
  const validDisplayIds = new Set(
    std.CreatureDisplayInfo.filter(() => true).map((d) => d.ID)
  );

  const invalid = std.CreatureTemplates.filter((tpl) => {
    const m1 = tpl.Models.get(0).get();
    const m2 = tpl.Models.get(1).get();
    const m3 = tpl.Models.get(2).get();
    const m4 = tpl.Models.get(3).get();
    const modelIds = [m1, m2, m3, m4].filter((id) => id > 0);
    if (modelIds.length === 0) return true;
    return modelIds.some((id) => !validDisplayIds.has(id));
  });

  for (const tpl of invalid) {
    const entryId = tpl.ID;
    for (const spawnRow of std.SQL.creature.queryAll({ id: entryId })) {
      spawnRow.delete();
    }
    for (const addonRow of std.SQL.creature_template_addon.queryAll({
      entry: entryId,
    })) {
      addonRow.delete();
    }
    tpl.delete();
    console.log(
      `\x1b[33mDeleted invalid creature template (entry: ${entryId})\x1b[0m`
    );
  }
  if (invalid.length > 0) {
    console.log(
      `\x1b[33mCleaned up ${invalid.length} invalid creature(s) with broken model refs.\x1b[0m`
    );
  }
}

const HOLD_ANIMATION_ID = 158;

let extraDisplayIdToPath: Record<number, string> = {};
let extraEntryToDisplayId: Record<number, number> = {};
let extraDisplayIdToTextures: Record<number, string[]> = {};

function processAllM2UnderAssets(): void {
  extraDisplayIdToPath = {};
  extraEntryToDisplayId = {};
  extraDisplayIdToTextures = {};
  if (!fs.existsSync(ASSETS_ROOT)) {
    console.log(`Assets root ${ASSETS_ROOT} does not exist — skipping creature creation from .m2. Maps will still be built from existing DBC.`);
    return;
  }

  const holdEmoteId = std.IDs.Emotes.id();
  std.DBC.Emotes.add(holdEmoteId, {
    EmoteSlashCommand: "",
    AnimID: HOLD_ANIMATION_ID,
    EmoteFlags: 0,
    EmoteSpecProc: 2,
    EmoteSpecProcParam: 0,
    EventSoundID: 0,
  });

  console.log(`Scanning recursively for .m2 files under ${ASSETS_ROOT} ...`);

  let created = 0;
  let sx = base.x0;
  let sy = base.y0;

  for (const absPath of walkSync(ASSETS_ROOT)) {
    if (!absPath.toLowerCase().endsWith(".m2")) continue;

    const fileBase    = path.basename(absPath, path.extname(absPath));
    const clientPath  = toClientModelPath(absPath);
    const safeBase    = safeNameFromPath(absPath);

    const displayName  = `${safeBase}_CreatureDisplayInfo`;
    const templateName = `${safeBase}_CreatureTemplate`;

    if (seenDisplays.has(displayName) || seenTemplates.has(templateName)) {
      console.log(`Skipping duplicate: ${fileBase}`);
      continue;
    }

    const model = std.CreatureModels.create()
      .ModelName.set(clientPath)
      .SizeClass.set(1)
      .ModelScale.set(1)
      .Blood.set(-1)
      .Flags.set(3)
      .FootprintTexture.set(-1)
      .FootprintTextureLength.set(18)
      .CollisionHeight.set(2.08)
      .CollisionWidth.set(0.458)
      .WorldEffectScale.set(1)
      .AttachedEffectScale.set(1)
      .Sound.set(247);

    const display = std.CreatureDisplayInfo.create(MODULE_NAME, displayName)
      .Model.set(model.ID)
      .BoundingRadius.set(0.375)
      .CombatReach.set(1.25)
      .CreatureModelScale.set(0.5)
      .CreatureModelAlpha.set(255)
      .BloodLevel.set(1);

    const normalizedPath = clientPath.replace(/\\/g, "/").toLowerCase();
    const textures = getTexturesForModelPath(normalizedPath);
    if (textures && textures.length > 0) {
      if (textures[0]) display.TextureVariation.setIndex(0, textures[0]);
      if (textures[1]) display.TextureVariation.setIndex(1, textures[1]);
      if (textures[2]) display.TextureVariation.setIndex(2, textures[2]);
      extraDisplayIdToTextures[display.ID] = textures;
    }

    seenDisplays.add(displayName);
    const pathForAddon = clientPath.replace(/\\/g, "/").toLowerCase();
    extraDisplayIdToPath[display.ID] = pathForAddon;

    const tpl = std.CreatureTemplates.create(MODULE_NAME, templateName)
      .Name.enGB.set(fileBase)
      .Models.clearAll()
      .Models.addIds(display.ID)
      .FactionTemplate.set(35)
      .UnitFlags.set(["IMMUNE_TO_NPC"])
      .DynamicFlags.set(0)
      .Type.MECHANICAL.set()
      .Level.set(1, 1)
      .Stats.HealthMod.set(100)
      .AIName.set("")
      .MovementSpeed.set(1, 1)
      .Scale.set(2)
      .RegenHealth.set(1)
      .UnitClass.WARRIOR.set()
      .Rank.NORMAL.set()
      .Emote.set(holdEmoteId);

    seenTemplates.add(templateName);
    extraEntryToDisplayId[tpl.ID] = display.ID;

    if (ENABLE_SPAWNS) {
      const idx = created;
      if (idx > 0 && idx % base.perRow === 0) {
        sy += base.dy;
        sx = base.x0;
      }
      tpl.Spawns.add(MODULE_NAME, `${templateName}_Spawn`, {
        map: base.map,
        x: sx,
        y: sy,
        z: base.z,
        o: base.o,
      });
      sx += base.dx;
    }

    created++;
  }

  console.log(`Finished: created ${created} creature entries from .m2 files under assets.`);
}

std.Events.patch("spell-creature-create", () => {
  cleanupInvalidCreatureEntries();
  processAllM2UnderAssets();
  writeCreatureDisplayIdMap(extraEntryToDisplayId);
  writeCreatureModelPathMap(extraDisplayIdToPath);
  writeCreatureModelVariations();
  writeCreatureDisplayTexturesMap(extraDisplayIdToTextures);
});
