// These hosts serve the shared homepage, admin and API. Keep this allowlist explicit.
export function isPlatformHost(hostname) {
  return ["vyu.cc", "667989.xyz", "127.0.0.1", "localhost"].includes(hostname.toLowerCase());
}

export function normalizeDomain(input, local = false) {
  if (typeof input !== "string") return null;
  const name = input.trim().toLowerCase().replace(/\.$/, "");
  const labels = name.split(".");
  if (name.length > 253 || labels.length < 2 || isPlatformHost(name)) return null;
  if (!labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  if (!/^[a-z][a-z0-9-]+$/.test(labels.at(-1)) || (!local && labels.at(-1) === "localhost")) return null;
  return name;
}

export function primaryOrigin(hostname, platformOrigin) {
  if (!hostname) return null;
  if (hostname.endsWith(".localhost") && platformOrigin) {
    const platform = new URL(platformOrigin);
    if (platform.hostname === "127.0.0.1" && platform.protocol === "http:") return "http://" + hostname + ":" + platform.port;
  }
  return "https://" + hostname;
}
