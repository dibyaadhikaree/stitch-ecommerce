const apiBase =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:4000";

export function toAssetUrl(url: string) {
  return url.startsWith("http") ? url : `${apiBase}${url}`;
}
