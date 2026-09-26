// The scheme is registered as standard, so Chromium treats the first URL segment as a
// (lowercased) host. Use a fixed host and keep the whole path in the pathname.
export function toLocalFileUrl(filePath: string): string {
  const segments = filePath.replace(/\\/g, '/').replace(/^\/+/, '').split('/')
  return 'localfile://file/' + segments.map(encodeURIComponent).join('/')
}
