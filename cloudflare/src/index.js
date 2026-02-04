export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const { pathname } = url;

    if (pathname.startsWith("/gss/load/") && request.method === "GET")
      return handleGssLoad(request, env);
    if (pathname.startsWith("/gss/save/") && request.method === "POST")
      return handleGssSave(request, env);

    if (pathname === "/msg/send" && request.method === "POST")
      return handleMsgSend(request, env);
    if (pathname === "/msg/poll" && request.method === "POST")
      return handleMsgPoll(request, env);

    return new Response("not found", { status: 404 });
  }
};

async function jsonBody(request) {
  return await request.json();
}

// --- GSS: store whole world as a blob in KV ---

async function handleGssLoad(request, env) {
  const url = new URL(request.url);
  const user = decodeURIComponent(url.pathname.split("/").pop());
  const key = `gss:${user}`;
  const text = await env.GSS_KV.get(key);
  if (!text) {
    // return a minimal new world
    const fresh = {
      files: {
        "/readme.txt": "New GSS world for " + user + "\n"
      },
      config: { user },
      programs: {}
    };
    return jsonResponse(fresh);
  }
  return new Response(text, {
    status: 200,
    headers: { "Content-Type": "application/json" }
  });
}

async function handleGssSave(request, env) {
  const url = new URL(request.url);
  const user = decodeURIComponent(url.pathname.split("/").pop());
  const text = await request.text(); // raw JSON
  const key = `gss:${user}`;
  await env.GSS_KV.put(key, text);
  return jsonResponse({ ok: true });
}

// --- Messaging: text + file-transfer events in KV ---

async function handleMsgSend(request, env) {
  const body = await jsonBody(request);
  const room = body.room || "general";
  const from = body.from || "unknown";
  const type = body.type || "text";
  const ts = Date.now();

  const id = await nextMsgId(env);
  const msg = {
    id,
    room,
    from,
    type,
    text: body.text || "",
    filename: body.filename || null,
    content: body.content || null,
    ts
  };
  await env.MSG_KV.put(`msg:${id}`, JSON.stringify(msg));
  await env.MSG_KV.put("lastId", String(id));
  return jsonResponse({ ok: true, id });
}

async function handleMsgPoll(request, env) {
  const body = await jsonBody(request);
  const since = Number(body.since || 0);
  const lastIdStr = await env.MSG_KV.get("lastId");
  const lastId = Number(lastIdStr || 0);
  const messages = [];
  for (let id = since + 1; id <= lastId; id++) {
    const raw = await env.MSG_KV.get(`msg:${id}`);
    if (!raw) continue;
    messages.push(JSON.parse(raw));
  }
  return jsonResponse({ messages });
}

async function nextMsgId(env) {
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
