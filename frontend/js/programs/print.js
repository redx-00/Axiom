export function installPrintProgram(eventBus, terminal) {
  eventBus.on("print", ({ text, options }) => {
    terminal.print(text, options);
  });

  eventBus.on("help:print", () => {
    terminal.print("print.js: core printing and color support.");
  });

  eventBus.on("help-extra", () => {
    terminal.print("print.js loaded.");
  });
}
