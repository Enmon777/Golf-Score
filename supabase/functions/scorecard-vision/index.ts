import { createClient } from "npm:@supabase/supabase-js@2.119.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, apikey, x-client-info, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const respond = (payload: unknown, status = 200) =>
  Response.json(payload, {
    status,
    headers: { ...cors, "Cache-Control": "no-store" },
  });
function object(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function word(value: unknown) {
  return (
    object(value) &&
    typeof value.text === "string" &&
    value.text.length <= 200 &&
    ["confidence", "left", "right", "top", "bottom"].every(
      (key) => typeof value[key] === "number" && Number.isFinite(value[key]),
    )
  );
}
Deno.serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response(null, { status: 204, headers: cors });
  if (request.method !== "POST")
    return respond({ error: "Method unavailable" }, 405);
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("GOLF_SUPABASE_PUBLISHABLE_KEY");
  const provider = Deno.env.get("GOLF_VISION_PROVIDER_URL");
  const providerKey = Deno.env.get("GOLF_VISION_PROVIDER_TOKEN");
  if (!url || !key || !provider?.startsWith("https://") || !providerKey)
    return respond({ error: "Advanced vision is unavailable." }, 503);
  const authorization = request.headers.get("Authorization");
  if (!authorization?.startsWith("Bearer "))
    return respond({ error: "Sign in first." }, 401);
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(authorization.slice(7));
  if (error || !user) return respond({ error: "Sign in first." }, 401);
  if (Number(request.headers.get("Content-Length") ?? 0) > 11_000_000)
    return respond({ error: "Image exceeds the size limit." }, 413);
  try {
    const form = await request.formData();
    const tournament = form.get("tournament");
    const image = form.get("image");
    if (
      typeof tournament !== "string" ||
      !/^[0-9a-f-]{36}$/i.test(tournament) ||
      !(image instanceof File) ||
      image.type !== "image/png" ||
      image.size > 10_485_760
    )
      return respond(
        { error: "Submit a PNG from the scorecard scanner." },
        400,
      );
    const signature = new Uint8Array(await image.slice(0, 8).arrayBuffer());
    if (
      ![137, 80, 78, 71, 13, 10, 26, 10].every(
        (byte, i) => signature[i] === byte,
      )
    )
      return respond({ error: "Image does not match PNG format." }, 400);
    const { data: owned } = await supabase
      .from("tournaments")
      .select("id")
      .eq("id", tournament)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!owned) return respond({ error: "Tournament unavailable." }, 403);
    const response = await fetch(provider, {
      method: "POST",
      redirect: "error",
      headers: {
        Authorization: "Bearer " + providerKey,
        "Content-Type": "image/png",
      },
      body: image,
      signal: AbortSignal.timeout(25000),
    });
    if (!response.ok)
      return respond(
        { error: "Advanced vision could not process this image." },
        502,
      );
    const payload: unknown = await response.json();
    if (
      !object(payload) ||
      typeof payload.text !== "string" ||
      payload.text.length > 60000 ||
      !Array.isArray(payload.words) ||
      payload.words.length > 4000 ||
      !payload.words.every(word)
    )
      return respond(
        { error: "Advanced vision returned an invalid response." },
        502,
      );
    return respond({
      text: payload.text,
      words: payload.words.map((value) => ({
        text: value.text,
        confidence: value.confidence,
        left: value.left,
        right: value.right,
        top: value.top,
        bottom: value.bottom,
      })),
    });
  } catch {
    return respond(
      { error: "Advanced vision could not process this image." },
      502,
    );
  }
});
