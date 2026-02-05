export function createEventBus() {
  const handlers = {};

  function on(event, fn) {
    if (!handlers[event]) handlers[event] = [];
    handlers[event].push(fn);
  }

  async function emitAsync(event, payload) {
    const list = handlers[event] || [];
    let handled = false;
    for (const fn of list) {
      const res = await fn(payload);
      if (res === true) handled = true;
    }
    return handled;
  }

  function emit(event, payload) {
    const list = handlers[event] || [];
    for (const fn of list) fn(payload);
  }

  return { on, emit, emitAsync };
}
