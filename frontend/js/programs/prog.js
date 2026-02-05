export function installProgProgram(eventBus, terminal, gssManager, programLoader, gpkgInput) {
  eventBus.on("command", async ({ cmd, args }) => {
    if (cmd === "programs") {
      const names = await gssManager.getProgramNames();
      terminal.print("Installed programs:");
      names.forEach(n => terminal.print("  " + n));
      return true;
    }

    if (cmd === "prog") {
      const sub = args[0];
      const name = args[1];

      if (!sub) {
        terminal.print("usage: prog list|new|edit|build|run <name>", { color: "#f55" });
        return true;
      }

      if (sub === "list") {
        const srcNames = await gssManager.listProgramSourceNames();
        terminal.print("Program sources:");
        srcNames.forEach(n => terminal.print("  " + n));
        return true;
      }

      if (sub === "new") {
        if (!name) { terminal.print("usage: prog new <name>", { color: "#f55" }); return true; }
        await gssManager.writeProgramSource(name, "manifest.json", JSON.stringify({
          name,
          version: "1.0.0"
        }, null, 2));
        await gssManager.writeProgramSource(name, "code.js", `export function init(api) {\n  // ${name} program\n}\n`);
        terminal.print(`created program source '${name}'`, { color: "#5f5" });
        return true;
      }

      if (sub === "edit") {
        if (!name) { terminal.print("usage: prog edit <name>", { color: "#f55" }); return true; }
        const code = await gssManager.readProgramSource(name, "code.js") || "";
        terminal.print(`--- current code for ${name} ---`);
        terminal.print(code);
        terminal.print("--- editing: use 'write /program-src/" + name + "/code.js <code>' ---", { color: "#ff5" });
        return true;
      }

      if (sub === "build") {
        if (!name) { terminal.print("usage: prog build <name>", { color: "#f55" }); return true; }
        const manifestText = await gssManager.readProgramSource(name, "manifest.json");
        const codeText = await gssManager.readProgramSource(name, "code.js");
        if (!manifestText || !codeText) {
          terminal.print("missing manifest or code for " + name, { color: "#f55" });
          return true;
        }
        const zip = new JSZip();
        zip.file("manifest.json", manifestText);
        zip.file("code.js", codeText);
        const arrayBuffer = await zip.generateAsync({ type: "arraybuffer" });
        await gssManager.installProgramFromBytes(name, arrayBuffer);
        terminal.print(`built and installed ${name}.gpkg into .gss`, { color: "#5f5" });
        await programLoader.loadProgram(name);
        return true;
      }

      if (sub === "run") {
        if (!name) { terminal.print("usage: prog run <name>", { color: "#f55" }); return true; }
        await programLoader.loadProgram(name);
        terminal.print(`loaded program ${name}`, { color: "#5f5" });
        return true;
      }

      return true;
    }

    if (cmd === "install") {
      const name = args[0];
      if (!name) { terminal.print("usage: install <name>", { color: "#f55" }); return true; }

      const existing = await gssManager.getProgramNames();
      if (existing.includes(name)) {
        terminal.print(`program '${name}' already installed`, { color: "#f55" });
        return true;
      }

      gpkgInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const arrayBuffer = await file.arrayBuffer();
        await gssManager.installProgramFromBytes(name, arrayBuffer);
        terminal.print(`installed program '${name}' into .gss`, { color: "#5f5" });
        await programLoader.loadProgram(name);
      };
      gpkgInput.click();
      return true;
    }
  });

  eventBus.on("help:prog", () => {
    terminal.print("Program authoring commands:");
    terminal.print("  prog list");
    terminal.print("  prog new <name>");
    terminal.print("  prog edit <name>");
    terminal.print("  prog build <name>");
    terminal.print("  prog run <name>");
    terminal.print("  programs (list installed .gpkg)");
    terminal.print("  install <name> (import .gpkg from disk)");
  });
}
