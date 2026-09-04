import { ELO_DEFAULT } from './elo'
import type { ImageItem, SortDir, SortField } from './types'

export function sortImages(
  images: ImageItem[],
  field: SortField,
  direction: SortDir,
  eloScores?: Map<string, number>
): ImageItem[] {
  if (field === 'custom') return images

  return [...images].sort((a, b) => {
    let comparison = 0

    if (field === 'name') comparison = a.name.localeCompare(b.name, undefined, { numeric: true })
    else if (field === 'mtime') comparison = a.mtime - b.mtime
    else if (field === 'birthtime') comparison = a.birthtime - b.birthtime
    else if (field === 'elo') {
      comparison = (eloScores?.get(a.id) ?? ELO_DEFAULT) - (eloScores?.get(b.id) ?? ELO_DEFAULT)
    }

    return direction === 'asc' ? comparison : -comparison
  })
}
