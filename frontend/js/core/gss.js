export function createGssManager(JSZip, fileInput) {
  let zip = null;
  let meta = null;

  function getMeta() {
    return meta;
  }

  function randomFakeIp() {
    const a = 10;
    const b = Math.floor(Math.random() * 256);
    const c = Math.floor(Math.random() * 256);
    const d = Math.floor(Math.random() * 256);
    return `${a}.${b}.${c}.${d}`;
  }

  async function createFresh() {
    zip = new JSZip();
    meta = {
      username: prompt("Enter username:", "user") || "user",
      fakeIp: randomFakeIp(),
      createdAt: Date.now(),
      oobeDone: false
    };
    zip.file("meta.json", JSON.stringify(meta, null, 2));
    zip.folder("files").file("readme.txt", `Welcome, ${meta.username}.\n`);
    zip.folder("programs");
    zip.folder("program-src");
    zip.folder("trusted_keys");
  }

  async function loadFromDisk() {
    return new Promise((resolve) => {
      fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return resolve();
        const arrayBuffer = await file.arrayBuffer();
        if (arrayBuffer.byteLength === 0) {
          await createFresh();
          await saveToDisk();
          return resolve();
        }
        zip = await JSZip.loadAsync(arrayBuffer);
        const metaFile = zip.file("meta.json");
        if (!metaFile) {
          await createFresh();
          await saveToDisk();
          return resolve();
        }
        const metaText = await metaFile.async("string");
        meta = JSON.parse(metaText);
        resolve();
      };
      fileInput.click();
    });
  }

  async function saveToDisk() {
    if (!zip || !meta) await createFresh();
    zip.file("meta.json", JSON.stringify(meta, null, 2));
    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const name = meta.username || "world";
    a.href = url;
    a.download = name + ".gss";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function setUsername(name) {
    if (!meta) return;
    meta.username = name;
  }

  async function readFile(path) {
    if (!zip) return null;
    const clean = path.replace(/^\//, "");
    const file = zip.file("files/" + clean);
    if (!file) return null;
    return await file.async("string");
  }

  async function writeFile(path, content) {
    if (!zip) await createFresh();
    const clean = path.replace(/^\//, "");
    zip.folder("files").file(clean, content);
  }

  async function listFiles(prefix = "/") {
    if (!zip) return [];
    const clean = prefix.replace(/^\//, "");
    const folder = "files/" + clean;
    const files = [];
    zip.forEach((relPath, file) => {
      if (relPath.startsWith(folder)) {
        files.push({ name: "/" + relPath.substring("files/".length), size: file._data.uncompressedSize || 0 });
      }
    });
    return files;
  }

  async function getProgramNames() {
    if (!zip) return [];
    const names = [];
    zip.forEach((relPath, file) => {
      if (relPath.startsWith("programs/") && relPath.endsWith(".gpkg")) {
        const name = relPath.substring("programs/".length, relPath.length - ".gpkg".length);
        names.push(name);
      }
    });
    return names;
  }

  async function getProgramBytes(name) {
    if (!zip) return null;
    const file = zip.file(`programs/${name}.gpkg`);
    if (!file) return null;
    return await file.async("arraybuffer");
  }

  async function installProgramFromBytes(name, arrayBuffer) {
    if (!zip) await createFresh();
    zip.folder("programs").file(`${name}.gpkg`, arrayBuffer);
  }

  async function readProgramSource(name, fileName) {
    if (!zip) return null;
    const file = zip.file(`program-src/${name}/${fileName}`);
    if (!file) return null;
    return await file.async("string");
  }

  async function writeProgramSource(name, fileName, content) {
    if (!zip) await createFresh();
    zip.folder(`program-src/${name}`).file(fileName, content);
  }

  async function listProgramSourceNames() {
    if (!zip) return [];
    const names = new Set();
    zip.forEach((relPath, file) => {
      if (relPath.startsWith("program-src/") && relPath.endsWith("/")) {
        const rest = relPath.substring("program-src/".length);
        const name = rest.replace(/\/$/, "");
        if (name) names.add(name);
      }
    });
    return Array.from(names);
  }

  return {
    getMeta,
    createFresh,
    loadFromDisk,
    saveToDisk,
    setUsername,
    readFile,
    writeFile,
    listFiles,
    getProgramNames,
    getProgramBytes,
    installProgramFromBytes,
    readProgramSource,
    writeProgramSource,
    listProgramSourceNames
  };
}
