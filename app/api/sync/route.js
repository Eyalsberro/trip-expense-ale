const CF_BASE = `https://api.cloudflare.com/client/v4/accounts/${process.env.CF_ACCOUNT_ID}/storage/kv/namespaces/${process.env.CF_KV_NAMESPACE_ID}/values`;

const headers = () => ({
  Authorization: `Bearer ${process.env.CF_API_TOKEN}`,
});

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const syncId = searchParams.get("syncId");

  if (!syncId) {
    return Response.json({ error: "Missing syncId" }, { status: 400 });
  }

  const res = await fetch(`${CF_BASE}/${encodeURIComponent(syncId)}`, {
    headers: headers(),
  });

  if (res.status === 404) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (!res.ok) {
    return Response.json({ error: "Failed to fetch" }, { status: res.status });
  }

  const data = await res.json();
  return Response.json(data);
}

export async function POST(request) {
  const body = await request.json();
  const { syncId, expenses } = body;

  const key = syncId || crypto.randomUUID();

  const res = await fetch(`${CF_BASE}/${encodeURIComponent(key)}`, {
    method: "PUT",
    headers: {
      ...headers(),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ expenses }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("KV PUT error:", res.status, errText);
    return Response.json({ error: "Failed to save", detail: errText }, { status: res.status });
  }

  return Response.json({ syncId: key });
}
