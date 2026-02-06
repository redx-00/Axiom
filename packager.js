#!/usr/bin/env node
import fs from "fs";
import path from "path";
import JSZip from "jszip";

async function buildAx(inputDir, outputFile) {
  const confPath = path.join(inputDir, "init.axconf");
  if (!fs.existsSync(confPath)) {
    console.error("init.axconf not found in", inputDir);
    process.exit(1);
  }

  const confText = fs.readFileSync(confPath, "utf8");
  let config;
  try {
    config = JSON.parse(confText);
  } catch (err) {
    console.error("init.axconf is not valid JSON:", err.message);
    process.exit(1);
  }

  // Validate required fields
  const required = ["id", "name", "version", "entry", "mode"];
  for (const key of required) {
    if (!config[key]) {
      console.error(`init.axconf missing required field: ${key}`);
      process.exit(1);
    }
  }

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
        if (p === "init.axconf") continue; // not inside ZIP payload
        const data = fs.readFileSync(fullPath);
        zip.file(p.replace(/\\/g, "/"), data);
      }
    }
  }

  addDir(inputDir);

  const zipBuf = await zip.generateAsync({ type: "nodebuffer" });

  // AXIOM header
  const magic = Buffer.from([0x41,0x58,0x49,0x4F,0x4D,0x00,0x00,0x01]);

  const confBuf = Buffer.from(JSON.stringify(config), "utf8");
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(confBuf.length, 0);

  const out = Buffer.concat([magic, lenBuf, confBuf, zipBuf]);
  fs.writeFileSync(outputFile, out);

  console.log("Built", outputFile);
}

const inputDir = process.argv[2] || ".";
const outputFile = process.argv[3] || "world.ax";

buildAx(inputDir, outputFile).catch(err => {
  console.error(err);
  process.exit(1);
});

