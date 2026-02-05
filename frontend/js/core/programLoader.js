export function createProgramLoader(JSZip, gssManager, eventBus, backend) {
  async function loadAllPrograms() {
    const names = await gssManager.getProgramNames();
    for (const name of names) {
      await loadProgram(name);
    }
  }

  async function loadProgram(name) {
    const bytes = await gssManager.getProgramBytes(name);
    if (!bytes) return;
    const zip = await JSZip.loadAsync(bytes);
    const manifestText = await zip.file("manifest.json").async("string");
    const manifest = JSON.parse(manifestText);
    const codeText = await zip.file("code.js").async("string");
    // TODO: verify signature.sig

    const module = await importFromString(codeText);
    if (typeof module.init === "function") {
      const api = {
        on: eventBus.on,
        emit: eventBus.emit,
        backend,
        gss: gssManager
      };
      module.init(api);
    }
  }

  async function importFromString(code) {
    const blob = new Blob([code], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const mod = await import(url);
    URL.revokeObjectURL(url);
    return mod;
  }

  return {
    loadAllPrograms,
    loadProgram
  };
}
