export function toLocalFileUrl(filePath: string): string {
  return 'localfile:///' + encodeURI(filePath.replace(/\\/g, '/'))
}
