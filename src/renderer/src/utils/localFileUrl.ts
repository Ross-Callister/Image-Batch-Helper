// The scheme is registered as standard, so Chromium treats the first URL segment as a
// (lowercased) host. Use a fixed host and keep the whole path in the pathname.
// UNC paths (\\server\share\..., e.g. \\wsl.localhost\Ubuntu\...) use the "unc" host so the
// main process can restore the leading double backslash.
// Pass thumbnail: true for a small cached copy of an image (ignored for videos).
export function toLocalFileUrl(filePath: string, { thumbnail = false } = {}): string {
  const normalized = filePath.replace(/\\/g, '/')
  const host = normalized.startsWith('//') ? 'unc' : 'file'
  const segments = normalized.replace(/^\/+/, '').split('/')
  return `localfile://${host}/` + segments.map(encodeURIComponent).join('/') + (thumbnail ? '?thumb' : '')
}
