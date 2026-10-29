import { proxyBackend } from "../../../../lib/backend-proxy";
export const runtime = "nodejs";
export const maxDuration = 45;
async function handler(
  request: Request,
  context: { params: Promise<{ path: string[] }> },
) {
  return proxyBackend(request, "v1", (await context.params).path);
}
export {
  handler as GET,
  handler as POST,
  handler as PATCH,
  handler as PUT,
  handler as DELETE,
};
