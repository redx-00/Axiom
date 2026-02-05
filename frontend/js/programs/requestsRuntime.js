export function installRequestsRuntime(eventBus, backend, gssManager, terminal) {
  let polling = false;
  let lastId = 0;

  async function pollLoop() {
    polling = true;
    while (polling) {
      try {
        const res = await backend.pollRequests(lastId);
        const meta = gssManager.getMeta();
        if (!meta) continue;
        const meUser = meta.username;
        const meIp = meta.fakeIp;
        (res.messages || []).forEach(m => {
          lastId = Math.max(lastId, m.id || 0);
          if (m.toUser && m.toUser !== meUser) return;
          if (m.toIp && m.toIp !== meIp) return;
          eventBus.emit("request:" + m.type, m);
        });
      } catch {}
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  eventBus.on("command", async ({ cmd, args }) => {
    if (cmd === "msg") {
      const target = args[0];
      const text = args.slice(1).join(" ");
      if (!target || !text) {
        terminal.print("usage: msg <user>-<ip> <text>", { color: "#f55" });
        return true;
      }
      const [user, ip] = target.split("-");
      if (!user || !ip) {
        terminal.print("invalid target", { color: "#f55" });
        return true;
      }
      const meta = gssManager.getMeta();
      await backend.sendRequest(meta.username, meta.fakeIp, user, ip, "text", { text });
      terminal.print(`[text] to ${user}-${ip}: ${text}`, { color: "#5cf" });
      if (!polling) pollLoop();
      return true;
    }

    if (cmd === "sendfile") {
      const target = args[0];
      const localPath = args[1];
      if (!target || !localPath) {
        terminal.print("usage: sendfile <user>-<ip>:/<path> <localpath>", { color: "#f55" });
        return true;
      }
      const [userIp, remotePath] = target.split(":");
      if (!userIp || !remotePath) {
        terminal.print("invalid target", { color: "#f55" });
        return true;
      }
      const [user, ip] = userIp.split("-");
      if (!user || !ip) {
        terminal.print("invalid target", { color: "#f55" });
        return true;
      }
      const content = await gssManager.readFile(localPath);
      if (content == null) {
        terminal.print("local file not found", { color: "#f55" });
        return true;
      }
      const meta = gssManager.getMeta();
      await backend.sendRequest(meta.username, meta.fakeIp, user, ip, "file", {
        filename: remotePath,
        content
      });
      terminal.print(`[file] sent ${localPath} to ${user}-${ip}:${remotePath}`, { color: "#5cf" });
      if (!polling) pollLoop();
      return true;
    }
  });

  // default handlers
  eventBus.on("request:text", (req) => {
    const color = "#ccc";
    terminal.print(`[text] from ${req.fromUser}-${req.fromIp}: ${req.payload.text}`, { color });
  });

  eventBus.on("request:file", async (req) => {
    const path = req.payload.filename || `/inbox/file-${req.id}`;
    await gssManager.writeFile(path, req.payload.content || "");
    terminal.print(`[file] received ${path} from ${req.fromUser}-${req.fromIp}`, { color: "#ff5" });
  });

  eventBus.on("help:requests", () => {
    terminal.print("Request commands:");
    terminal.print("  msg <user>-<ip> <text>");
    terminal.print("  sendfile <user>-<ip>:/<path> <localpath>");
  });

  eventBus.on("help-extra", () => {
    terminal.print("requestsRuntime.js loaded (generic request system).");
  });
}
