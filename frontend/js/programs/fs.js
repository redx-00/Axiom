export function installFsProgram(eventBus, terminal, gssManager) {
  eventBus.on("command", async ({ cmd, args }) => {
    if (cmd === "ls") {
      const path = args[0] || "/";
      const files = await gssManager.listFiles(path);
      files.forEach(f => terminal.print(`${f.name}  ${f.size}`));
      return true;
    }
    if (cmd === "cat") {
      const path = args[0];
      if (!path) { terminal.print("usage: cat <path>", { color: "#f55" }); return true; }
      const content = await gssManager.readFile(path);
      if (content == null) terminal.print("not found", { color: "#f55" });
      else terminal.print(content);
      return true;
    }
    if (cmd === "write") {
      const path = args[0];
      const text = args.slice(1).join(" ");
      if (!path) { terminal.print("usage: write <path> <text>", { color: "#f55" }); return true; }
      await gssManager.writeFile(path, text);
      terminal.print(`wrote ${path}`, { color: "#5f5" });
      return true;
    }
  });

  eventBus.on("help:fs", () => {
    terminal.print("Filesystem commands:");
    terminal.print("  ls [path]");
    terminal.print("  cat <path>");
    terminal.print("  write <path> <text>");
  });
}
