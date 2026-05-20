import { runFeedSyncJobAsResponse } from "@/lib/feed-sync-response";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const expectedToken = process.env.BATCH_FETCH_TOKEN;
  if (!expectedToken) {
    return Response.json({ error: "BATCH_FETCH_TOKEN is not configured." }, { status: 500 });
  }

  const authorization = request.headers.get("authorization");
  if (!authorization) {
    return Response.json({ error: "Authorization header is required." }, { status: 401 });
  }

  const token = getBearerToken(authorization);
  if (!token) {
    return Response.json({ error: "Authorization header must be Bearer token." }, { status: 401 });
  }

  if (token !== expectedToken) {
    return Response.json({ error: "Forbidden." }, { status: 403 });
  }

  return runFeedSyncJobAsResponse("internal-api");
}

function getBearerToken(authorization: string) {
  const [scheme, token, ...rest] = authorization.trim().split(/\s+/);
  if (scheme.toLowerCase() !== "bearer" || !token || rest.length > 0) {
    return null;
  }

  return token;
}
