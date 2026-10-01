/** Only anonymous assets may enter the service worker's shared disk cache. */
export function isPublicAsset(url: URL, origin: string): boolean {
  if (url.origin !== origin) return false;
  if (url.pathname.startsWith("/_next/static/")) return true;
  const isBrandAsset = (path: string) =>
    /^\/icons\/[\w-]+\.png$/.test(path) || /^\/brasao-(abm|efo)-256\.png$/.test(path);
  if (url.pathname === "/_next/image") {
    return isBrandAsset(url.searchParams.get("url") ?? "");
  }
  return isBrandAsset(url.pathname) && !url.search;
}
