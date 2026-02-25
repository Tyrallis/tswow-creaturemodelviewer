/**
 * Creature Model Viewer (CMV) — map generator for TSWoW.
 *
 * Writes Lua tables used by the CMV addon:
 *   CreatureDisplayIdMap[entry]         = displayId
 *   CreatureModelPathMap[displayId]     = "path/to/model.m2"
 *   CreatureVariantsMap[entry]         = { displayId1, ... }
 *   CreatureDisplayTexturesMap[displayId] = { "Texture1", "Texture2", "Texture3" }
 *
 * Install: put this file in your module's datascripts folder.
 * Output: writes the four .lua files into ../../addon (your module's addon folder).
 * Build: call main() from a std.Events.patch, or use the write* exports from your creature datascripts.
 */

import { std } from "wow/wotlk";
import { DBC } from "wow/wotlk/DBCFiles";
import * as fs from "fs";
import * as path from "path";

/** Writes to <module>/addon/ when this file lives in <module>/datascripts/. */
const OUT_DIR = path.join(__dirname, "../../addon");

function normalizePath(p: string): string {
    return p.replace(/\\/g, "/").replace(/^\/+/, "").toLowerCase();
}

export type BuiltMaps = {
    displayIdLines: string[];
    pathLines: string[];
    variantLines: string[];
    textureLines: string[];
    modelPathToTextures: Record<string, string[]>;
};
let cached: BuiltMaps | null = null;

function buildMaps(): BuiltMaps {
    if (cached) return cached;

    const modelDataPaths: Record<number, string> = {};
    for (const row of DBC.CreatureModelData.queryAll({})) {
        const id      = row.ID.get();
        const rawPath = row.ModelName.get() as string;
        if (rawPath && rawPath !== "") {
            modelDataPaths[id] = normalizePath(rawPath);
        }
    }

    const displayPaths: Record<number, string> = {};
    const displayTextures: Record<number, string[]> = {};
    const modelPathToTextures: Record<string, string[]> = {};
    for (const row of DBC.CreatureDisplayInfo.queryAll({})) {
        const dispId      = row.ID.get();
        const modelDataId = row.ModelID.get();
        const p           = modelDataPaths[modelDataId];
        if (p && p !== "") displayPaths[dispId] = p;
        const tex0 = (row.TextureVariation.getIndex(0) || "").trim();
        const tex1 = (row.TextureVariation.getIndex(1) || "").trim();
        const tex2 = (row.TextureVariation.getIndex(2) || "").trim();
        const texArr = [tex0, tex1, tex2].filter((t) => t !== "");
        if (texArr.length > 0) {
            displayTextures[dispId] = texArr;
            if (!modelPathToTextures[p]) modelPathToTextures[p] = texArr;
        }
    }

    const displayIdLines: string[] = [
        "-- Auto-generated from creature_template (modelid1). Run `tswow datascripts build` to refresh.",
        "CreatureDisplayIdMap = {",
    ];
    const pathLines: string[] = [
        "-- Auto-generated from CreatureDisplayInfo.dbc + CreatureModelData.dbc.",
        "CreatureModelPathMap = {",
    ];
    const variantLines: string[] = [
        "-- Auto-generated. Entries with multiple modelids (texture variants) only.",
        "CreatureVariantsMap = {",
    ];
    const textureLines: string[] = [
        "-- Auto-generated from CreatureDisplayInfo.dbc Texture1/Texture2/Texture3. Run `tswow datascripts build` to refresh.",
        "CreatureDisplayTexturesMap = {",
    ];

    const emittedDisplayIds = new Set<number>();
    const emittedTextureDisplayIds = new Set<number>();

    const allTemplates = std.CreatureTemplates.filter(() => true);
    for (const tpl of allTemplates) {
        const entry = tpl.ID;
        const ids: number[] = [];
        for (let i = 0; i < 4; i++) {
            if (i >= tpl.Models.length) break;
            const id = tpl.Models.get(i).get();
            if (id && id > 0) ids.push(id);
        }

        if (ids.length === 0) continue;

        displayIdLines.push(`  [${entry}] = ${ids[0]},`);

        for (const id of ids) {
            if (!emittedDisplayIds.has(id)) {
                emittedDisplayIds.add(id);
                const p = displayPaths[id];
                if (p) {
                    pathLines.push(`  [${id}] = "${p.replace(/\\/g, "\\\\")}",`);
                }
            }
        }

        if (ids.length > 1) {
            variantLines.push(`  [${entry}] = {${ids.join(", ")}},`);
        }
        for (const id of ids) {
            if (!emittedTextureDisplayIds.has(id) && displayTextures[id]) {
                emittedTextureDisplayIds.add(id);
                const arr = displayTextures[id].map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(", ");
                textureLines.push(`  [${id}] = {${arr}},`);
            }
        }
    }
    for (const [dispIdStr, p] of Object.entries(displayPaths)) {
        const id = parseInt(dispIdStr, 10);
        if (!emittedDisplayIds.has(id)) {
            emittedDisplayIds.add(id);
            pathLines.push(`  [${id}] = "${p.replace(/\\/g, "\\\\")}",`);
        }
    }
    for (const [dispIdStr, texArr] of Object.entries(displayTextures)) {
        const id = parseInt(dispIdStr, 10);
        if (!emittedTextureDisplayIds.has(id)) {
            emittedTextureDisplayIds.add(id);
            const arr = texArr.map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(", ");
            textureLines.push(`  [${id}] = {${arr}},`);
        }
    }

    displayIdLines.push("}");
    pathLines.push("}");
    variantLines.push("}");
    textureLines.push("}");

    cached = { displayIdLines, pathLines, variantLines, textureLines, modelPathToTextures };
    return cached;
}

function mergeExtraDisplayIdMap(displayIdLines: string[], extra: Record<number, number>): string[] {
    const existingEntries = new Set<number>();
    for (const line of displayIdLines) {
        const m = line.match(/^\s*\[(\d+)\]\s*=/);
        if (m) existingEntries.add(parseInt(m[1], 10));
    }
    if (Object.keys(extra).length === 0) return displayIdLines;
    const out = displayIdLines.slice(0, -1);
    for (const [entryStr, displayId] of Object.entries(extra)) {
        const entry = parseInt(entryStr, 10);
        if (existingEntries.has(entry)) continue;
        existingEntries.add(entry);
        out.push(`  [${entry}] = ${displayId},`);
    }
    out.push("}");
    return out;
}

function mergeExtraPathMap(pathLines: string[], extra: Record<number, string>): string[] {
    const existingIds = new Set<number>();
    for (const line of pathLines) {
        const m = line.match(/^\s*\[(\d+)\]\s*=/);
        if (m) existingIds.add(parseInt(m[1], 10));
    }
    if (Object.keys(extra).length === 0) return pathLines;
    const out = pathLines.slice(0, -1);
    for (const [idStr, p] of Object.entries(extra)) {
        const id = parseInt(idStr, 10);
        if (existingIds.has(id)) continue;
        existingIds.add(id);
        out.push(`  [${id}] = "${p.replace(/\\/g, "\\\\")}",`);
    }
    out.push("}");
    return out;
}

function mergeExtraTextureMap(textureLines: string[], extra: Record<number, string[]>): string[] {
    const existingIds = new Set<number>();
    for (const line of textureLines) {
        const m = line.match(/^\s*\[(\d+)\]\s*=/);
        if (m) existingIds.add(parseInt(m[1], 10));
    }
    if (Object.keys(extra).length === 0) return textureLines;
    const out = textureLines.slice(0, -1);
    for (const [idStr, texArr] of Object.entries(extra)) {
        const id = parseInt(idStr, 10);
        if (existingIds.has(id) || !texArr || texArr.length === 0) continue;
        existingIds.add(id);
        const arr = texArr.map((t) => `"${t.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`).join(", ");
        out.push(`  [${id}] = {${arr}},`);
    }
    out.push("}");
    return out;
}

export function writeCreatureDisplayIdMap(extraEntryToDisplayId?: Record<number, number>): void {
    let { displayIdLines } = buildMaps();
    if (extraEntryToDisplayId) displayIdLines = mergeExtraDisplayIdMap(displayIdLines, extraEntryToDisplayId);
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "CreatureDisplayIdMap.lua"), displayIdLines.join("\n"), "utf8");
    console.log("Written: CreatureDisplayIdMap.lua (" + (displayIdLines.length - 2) + " entries)");
}

export function writeCreatureModelPathMap(extraDisplayIdToPath?: Record<number, string>): void {
    let { pathLines } = buildMaps();
    if (extraDisplayIdToPath) pathLines = mergeExtraPathMap(pathLines, extraDisplayIdToPath);
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "CreatureModelPathMap.lua"), pathLines.join("\n"), "utf8");
    console.log("Written: CreatureModelPathMap.lua (" + (pathLines.length - 2) + " entries)");
}

export function writeCreatureModelVariations(): void {
    const { variantLines } = buildMaps();
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "CreatureVariantsMap.lua"), variantLines.join("\n"), "utf8");
    console.log("Written: CreatureVariantsMap.lua (" + (variantLines.length - 2) + " multi-skin entries)");
}

export function writeCreatureDisplayTexturesMap(extraDisplayIdToTextures?: Record<number, string[]>): void {
    let { textureLines } = buildMaps();
    if (extraDisplayIdToTextures) textureLines = mergeExtraTextureMap(textureLines, extraDisplayIdToTextures);
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(OUT_DIR, "CreatureDisplayTexturesMap.lua"), textureLines.join("\n"), "utf8");
    console.log("Written: CreatureDisplayTexturesMap.lua (" + (textureLines.length - 2) + " entries)");
}

export function getTexturesForModelPath(modelPath: string): string[] | undefined {
    const { modelPathToTextures } = buildMaps();
    const key = normalizePath(modelPath);
    return modelPathToTextures[key];
}

export function main(): void {
    buildMaps();
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    const { displayIdLines, pathLines, variantLines, textureLines } = cached!;
    fs.writeFileSync(path.join(OUT_DIR, "CreatureDisplayIdMap.lua"), displayIdLines.join("\n"), "utf8");
    fs.writeFileSync(path.join(OUT_DIR, "CreatureModelPathMap.lua"), pathLines.join("\n"), "utf8");
    fs.writeFileSync(path.join(OUT_DIR, "CreatureVariantsMap.lua"), variantLines.join("\n"), "utf8");
    fs.writeFileSync(path.join(OUT_DIR, "CreatureDisplayTexturesMap.lua"), textureLines.join("\n"), "utf8");
    console.log("Written: CreatureDisplayIdMap.lua, CreatureModelPathMap.lua, CreatureVariantsMap.lua, CreatureDisplayTexturesMap.lua");
}
