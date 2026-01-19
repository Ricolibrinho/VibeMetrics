import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// =======================
// CORS
// =======================
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// =======================
// Helpers PKCE
// =======================
function base64UrlEncode(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return new Uint8Array(digest);
}

function randomString(len = 64) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return base64UrlEncode(bytes).slice(0, len);
}

// =======================
// Server
// =======================
serve(async (req) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // =======================
    // ENV
    // =======================
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const SITE_URL = Deno.env.get("SITE_URL")!;
    const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
    const REDIRECT_URI = Deno.env.get("YOUTUBE_REDIRECT_URI")!;

    // =======================
    // Authorization
    // =======================
    const authHeader = req.headers.get("Authorization") || "";

    if (!authHeader.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        { status: 401, headers: corsHeaders }
      );
    }

    // Cliente Supabase autenticado (usuário)
    const supabaseAuth = createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    const { data: userData, error: userErr } =
      await supabaseAuth.auth.getUser();

    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ error: "User not authenticated" }),
        { status: 401, headers: corsHeaders }
      );
    }

    const user = userData.user;

    // =======================
    // PKCE
    // =======================
    const codeVerifier = randomString(80);
    const challengeBytes = await sha256(codeVerifier);
    const codeChallenge = base64UrlEncode(challengeBytes);

    // =======================
    // State
    // =======================
    const state = crypto.randomUUID();

    // Cliente service-role (DB)
    const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    const { error: stateErr } = await supabase
      .from("oauth_states")
      .insert({
        id: state,
        user_id: user.id,
        provider: "youtube",
        code_verifier: codeVerifier,
      });

    if (stateErr) {
      return new Response(
        JSON.stringify({ error: stateErr.message }),
        { status: 500, headers: corsHeaders }
      );
    }

    // =======================
    // OAuth URL
    // =======================
    const scope = [
      "https://www.googleapis.com/auth/youtube.readonly",
      "openid",
      "email",
      "profile",
    ].join(" ");

    const authUrl = new URL(
      "https://accounts.google.com/o/oauth2/v2/auth"
    );

    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", scope);
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");
    authUrl.searchParams.set("state", state);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    // Onde voltar depois do callback
    const returnTo = new URL(
      "/Dashboard/connections.html",
      SITE_URL
    );
    authUrl.searchParams.set("redirect_to", returnTo.toString());

    // =======================
    // Response
    // =======================
    return new Response(
      JSON.stringify({ url: authUrl.toString() }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (e) {
    return new Response(
      JSON.stringify({ error: String(e) }),
      { status: 500, headers: corsHeaders }
    );
  }
});
