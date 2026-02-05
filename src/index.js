export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname === "/request/send" && request.method === "POST")
      return handleRequestSend(request, env);
    if (pathname === "/request/poll" && request.method === "POST")
      return handleRequestPoll(request, env);

    return new Response("not found", { status: 404 });
  }
};

async function jsonBody(request) {
  return await request.json();
}

async function handleRequestSend(request, env) {
  const body = await jsonBody(request);
  const fromUser = body.fromUser || "unknown";
  const fromIp = body.fromIp || "0.0.0.0";
  const toUser = body.toUser || null;
  const toIp = body.toIp || null;
  const type = body.type || "text";
  const payload = body.payload || {};
  const ts = Date.now();

  const id = await nextId(env);
  const msg = {
    id,
    fromUser,
    fromIp,
    toUser,
    toIp,
    type,
    payload,
    ts
  };
  await env.MSG_KV.put(`req:${id}`, JSON.stringify(msg));
  await env.MSG_KV.put("lastId", String(id));
  return jsonResponse({ ok: true, id });
}

async function handleRequestPoll(request, env) {
  const body = await jsonBody(request);
  const since = Number(body.since || 0);
  const lastIdStr = await env.MSG_KV.get("lastId");
  const lastId = Number(lastIdStr || 0);
  const messages = [];
  for (let id = since + 1; id <= lastId; id++) {
    const raw = await env.MSG_KV.get(`req:${id}`);
    if (!raw) continue;
    messages.push(JSON.parse(raw));
  }
  return jsonResponse({ messages });
}

async function nextId(env) {
  const lastIdStr = await env.MSG_KV.get("lastId");
  const lastId = Number(lastIdStr || 0);
  return lastId + 1;
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" }
  });
}

