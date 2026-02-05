export function createTerminal(screen, eventBus, gssManager, programLoader) {
  let inputLine, promptSpan, cmdInput;
  const history = [];
  let historyIndex = -1;

  function print(text = "", options = {}) {
    const div = document.createElement("div");

    if (Array.isArray(text)) {
      text.forEach(seg => {
        const span = document.createElement("span");
        span.textContent = seg.text;
        if (seg.color) span.style.color = seg.color;
        if (seg.bgColor) span.style.backgroundColor = seg.bgColor;
        div.appendChild(span);
      });
    } else {
      const span = document.createElement("span");
      span.textContent = text;
      if (options.color) span.style.color = options.color;
      if (options.bgColor) span.style.backgroundColor = options.bgColor;
      div.appendChild(span);
    }

    screen.appendChild(div);
    screen.scrollTop = screen.scrollHeight;
  }

  function buildPrompt() {
    const meta = gssManager.getMeta();
    if (!meta) return "[?:0.0.0.0] $ ";
    return `[${meta.username}@${meta.fakeIp}] $ `;
  }

  function showPrompt() {
    const wrapper = document.createElement("div");
    wrapper.id = "input-line";
    const prompt = document.createElement("span");
    prompt.id = "prompt";
    prompt.textContent = buildPrompt();
    const input = document.createElement("input");
    input.id = "cmd";
    input.autocomplete = "off";
    wrapper.appendChild(prompt);
    wrapper.appendChild(input);
    screen.appendChild(wrapper);
    screen.scrollTop = screen.scrollHeight;
    input.focus();
    input.addEventListener("keydown", onCommandKey);
    inputLine = wrapper;
    promptSpan = prompt;
    cmdInput = input;
  }

  function resetPrompt() {
    if (inputLine) {
      cmdInput.removeEventListener("keydown", onCommandKey);
      inputLine.removeAttribute("id");
      cmdInput.setAttribute("disabled", "disabled");
    }
    showPrompt();
  }

  function onCommandKey(e) {
    if (e.key === "Enter") {
      const text = cmdInput.value.trim();
      if (!text) {
        resetPrompt();
        return;
      }
      history.push(text);
      historyIndex = history.length;
      cmdInput.removeEventListener("keydown", onCommandKey);
      cmdInput.setAttribute("disabled", "disabled");
      handleCommand(text).then(() => resetPrompt());
    } else if (e.key === "ArrowUp") {
      if (history.length === 0) return;
      historyIndex = Math.max(0, historyIndex - 1);
      cmdInput.value = history[historyIndex] || "";
      e.preventDefault();
    } else if (e.key === "ArrowDown") {
      if (history.length === 0) return;
      historyIndex = Math.min(history.length, historyIndex + 1);
      cmdInput.value = history[historyIndex] || "";
      e.preventDefault();
    }
  }

  async function handleCommand(line) {
    print(buildPrompt() + line);
    const [cmd, ...args] = line.split(/\s+/);
    if (!cmd) return;

    if (cmd === "help") {
      const topic = args[0];
      if (!topic) {
        print("Commands:");
        print("  help [topic]");
        print("  newgss");
        print("  loadgss");
        print("  savegss");
        print("  setuser <name>");
        print("  showmeta");
        print("  programs");
        print("  prog list/new/edit/build/run <name>");
        print("  ls [path]");
        print("  cat <path>");
        print("  write <path> <text>");
        print("  msg <user>-<ip> <text>");
        print("  sendfile <user>-<ip>:/<path> <localpath>");
        print("Use 'help fs', 'help prog', 'help requests' for more.");
        eventBus.emit("help-extra");
        return;
      } else {
        eventBus.emit("help:" + topic);
        return;
      }
    }

    if (cmd === "newgss") {
      await gssManager.createFresh();
      print("Created new .gss. Use 'savegss' to download it.", { color: "#5f5" });
      promptSpan.textContent = buildPrompt();
      return;
    }

    if (cmd === "loadgss") {
      await gssManager.loadFromDisk();
      print("Loaded .gss from disk.", { color: "#5f5" });
      promptSpan.textContent = buildPrompt();
      await programLoader.loadAllPrograms();
      return;
    }

    if (cmd === "savegss") {
      await gssManager.saveToDisk();
      print("Downloaded .gss file.", { color: "#5f5" });
      return;
    }

    if (cmd === "setuser") {
      const name = args[0];
      if (!name) { print("usage: setuser <name>", { color: "#f55" }); return; }
      gssManager.setUsername(name);
      promptSpan.textContent = buildPrompt();
      print(`username set to ${name}`, { color: "#5f5" });
      return;
    }

    if (cmd === "showmeta") {
      const meta = gssManager.getMeta();
      print(JSON.stringify(meta, null, 2));
      return;
    }

    const handled = await eventBus.emitAsync("command", { cmd, args, line });
    if (!handled) {
      print(`Unknown command: ${cmd}`, { color: "#f55" });
      print("Type 'help' for a list of commands.");
    }
  }

  return {
    print,
    showPrompt,
    getPrompt: buildPrompt
  };
}
