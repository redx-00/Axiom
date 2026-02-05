export function createBackend(baseUrl) {
  async function api(path, body, method = "POST") {
    const url = baseUrl + path;
    const opts = { method, headers: {} };
    if (body && method !== "GET") {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  }

  return {
    sendRequest: (fromUser, fromIp, toUser, toIp, type, payload) =>
      api("/request/send", { fromUser, fromIp, toUser, toIp, type, payload }),
    pollRequests: (since) =>
      api("/request/poll", { since })
  };
}
