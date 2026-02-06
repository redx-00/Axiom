#!/usr/bin/env node
import fs from "fs";
import path from "path";
import JSZip from "jszip";

async function buildAx(inputDir, outputFile) {
  const manifestPath = path.join(inputDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    console.error("manifest.json not found in", inputDir);
    process.exit(1);
  }

  const manifestText = fs.readFileSync(manifestPath, "utf8");
  const manifest = JSON.parse(manifestText);

  const zip = new JSZip();

  function addDir(base, rel = "") {
    const full = path.join(base, rel);
    const entries = fs.readdirSync(full, { withFileTypes: true });
    for (const e of entries) {
      const p = path.join(rel, e.name);
      const fullPath = path.join(base, p);
      if (e.isDirectory()) {
        addDir(base, p);
      } else {
        if (p === "manifest.json") continue; // not inside ZIP payload
        const data = fs.readFileSync(fullPath);
        zip.file(p.replace(/\\/g, "/"), data);
      }
    }
  }

  addDir(inputDir);

  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

  const magic = Buffer.from([0x41,0x58,0x49,0x4F,0x4D,0x00,0x00,0x01]);
  const manifestBuf = Buffer.from(JSON.stringify(manifest), "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(manifestBuf.length, 0);

  const out = Buffer.concat([magic, lenBuf, manifestBuf, zipBuf]);
  fs.writeFileSync(outputFile, out);
  console.log("Built", outputFile);
}

const inputDir = process.argv[2] || ".";
const outputFile = process.argv[3] || "world.ax";

buildAx(inputDir, outputFile).catch(err => {
  console.error(err);
  process.exit(1);
});
