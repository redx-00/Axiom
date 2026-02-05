export function installHttpsProgram(eventBus, backend, terminal) {
  eventBus.on("help:https", () => {
    terminal.print("https.js: backend request relay available to programs.");
  });

  eventBus.on("help-extra", () => {
    terminal.print("https.js loaded.");
  });
}
