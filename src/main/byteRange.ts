export type ByteRange = { start: number; end: number }

/**
 * Parses a single-range HTTP `Range` header ("bytes=start-end", "bytes=start-",
 * or "bytes=-suffixLength") against a file of `size` bytes.
 * Returns null when the header is absent or unusable (serve the whole file),
 * or 'unsatisfiable' when the range lies outside the file.
 */
export function parseByteRange(header: string | null, size: number): ByteRange | 'unsatisfiable' | null {
  if (!header) return null
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!match) return null
  const [, startText, endText] = match
  if (startText === '' && endText === '') return null

  let start: number
  let end: number
  if (startText === '') {
    const suffixLength = Number(endText)
    if (suffixLength === 0) return 'unsatisfiable'
    start = Math.max(0, size - suffixLength)
    end = size - 1
  } else {
    start = Number(startText)
    end = endText === '' ? size - 1 : Math.min(Number(endText), size - 1)
  }

  if (start >= size || start > end) return 'unsatisfiable'
  return { start, end }
}
