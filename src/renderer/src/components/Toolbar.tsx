import React, { useState } from 'react'
import type { SortField, SortDir } from '../types'
import styles from './Toolbar.module.css'

interface Props {
  totalCount: number
  selectedCount: number
  culledCount: number
  sortField: SortField
  sortDir: SortDir
  isWorking: boolean
  error: string | null
  onSort: (field: SortField) => void
  onCull: () => void
  onUncull: () => void
  onConfirmDelete: () => void
  onTouch: () => void
  onSelectAll: () => void
  onSelectNone: () => void
  onClearView: () => void
  onStartRanking: () => void
  onRenameAll: (baseName: string) => void
  eloCount: number
  onDismissError: () => void
}

function SortButton({
  label,
  active,
  dir,
  onClick,
  disabled
}: {
  label: string
  active: boolean
  dir: SortDir
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      className={`${styles.sortBtn} ${active ? styles.sortActive : ''}`}
      onClick={onClick}
      disabled={disabled}
      title={active ? `Sorted by ${label} (${dir === 'asc' ? 'A→Z' : 'Z→A'}) — click to reverse` : `Sort by ${label}`}
    >
      <span>{label}</span>
      {active && (
        <span className={styles.sortArrow}>{dir === 'asc' ? '↑' : '↓'}</span>
      )}
    </button>
  )
}

export default function Toolbar({
  totalCount,
  selectedCount,
  culledCount,
  sortField,
  sortDir,
  isWorking,
  error,
  onSort,
  onCull,
  onUncull,
  onConfirmDelete,
  onTouch,
  onSelectAll,
  onSelectNone,
  onClearView,
  onStartRanking,
  onRenameAll,
  eloCount,
  onDismissError
}: Props) {
  const [baseName, setBaseName] = useState('')

  return (
    <aside className={styles.toolbar}>
      <div className={styles.section}>
        <div className={styles.sectionTitle}>Sort</div>
        <div className={styles.sortBtns}>
          <SortButton label="Name" active={sortField === 'name'} dir={sortDir} onClick={() => onSort('name')} />
          <SortButton label="Modified" active={sortField === 'mtime'} dir={sortDir} onClick={() => onSort('mtime')} />
          <SortButton label="Created" active={sortField === 'birthtime'} dir={sortDir} onClick={() => onSort('birthtime')} />
          <SortButton label="Rating" active={sortField === 'elo'} dir={sortDir} onClick={() => onSort('elo')} disabled={eloCount === 0} />
        </div>
        <button
          className={`${styles.customBtn} ${sortField === 'custom' ? styles.customActive : ''}`}
          onClick={() => onSort('custom')}
          title="Lock current order and enable drag-to-reorder"
        >
          {sortField === 'custom' ? '✦ Custom order (drag to reorder)' : 'Custom order'}
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Selection</div>
        <div className={styles.stat}>
          <span className={styles.statNum}>{totalCount}</span>
          <span className={styles.statLabel}> images</span>
        </div>
        {selectedCount > 0 && (
          <div className={styles.stat}>
            <span className={styles.statNum}>{selectedCount}</span>
            <span className={styles.statLabel}> selected</span>
          </div>
        )}
        {culledCount > 0 && (
          <div className={`${styles.stat} ${styles.statDanger}`}>
            <span className={styles.statNum}>{culledCount}</span>
            <span className={styles.statLabel}> marked for deletion</span>
          </div>
        )}
        <div className={styles.actionRow}>
          <button className={styles.linkBtn} onClick={onSelectAll} disabled={totalCount === 0}>All</button>
          <span className={styles.linkSep}>·</span>
          <button className={styles.linkBtn} onClick={onSelectNone} disabled={selectedCount === 0}>None</button>
        </div>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Actions</div>
        <button
          className={`${styles.actionBtn} ${styles.danger}`}
          onClick={onCull}
          disabled={selectedCount === 0 || isWorking}
          title="Mark selected images for deletion (Delete key)"
        >
          Mark for Deletion
        </button>
        <button
          className={styles.actionBtn}
          onClick={onUncull}
          disabled={selectedCount === 0 || isWorking}
          title="Remove deletion mark from selected images"
        >
          Unmark Selected
        </button>

        <div className={styles.divider} />

        <button
          className={`${styles.actionBtn} ${styles.confirmDelete}`}
          onClick={onConfirmDelete}
          disabled={culledCount === 0 || isWorking}
          title={`Move ${culledCount} marked image(s) to the Recycle Bin`}
        >
          {isWorking ? 'Working…' : `Confirm Delete (${culledCount})`}
        </button>

        <div className={styles.divider} />

        <button
          className={styles.actionBtn}
          onClick={onTouch}
          disabled={totalCount === 0 || isWorking}
          title="Update the last-modified timestamp on all images (in current sort order)"
        >
          Touch All
        </button>

        <div className={styles.divider} />

        <button
          className={styles.actionBtn}
          onClick={onClearView}
          disabled={totalCount === 0 || isWorking}
          title="Remove all images from view without deleting them"
        >
          Clear View
        </button>

        <div className={styles.divider} />

        <button
          className={`${styles.actionBtn} ${styles.rankBtn}`}
          onClick={onStartRanking}
          disabled={totalCount < 2 || isWorking}
          title="Open pairwise comparison session to rank images by quality"
        >
          Start Ranking
        </button>
      </div>

      <div className={styles.divider} />

      <div className={styles.section}>
        <div className={styles.sectionTitle}>Rename</div>
        <input
          className={styles.renameInput}
          type="text"
          placeholder="base-name"
          value={baseName}
          onChange={(e) => setBaseName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && baseName.trim() && totalCount > 0 && !isWorking) {
              onRenameAll(baseName)
            }
          }}
          disabled={isWorking}
          spellCheck={false}
        />
        <button
          className={styles.actionBtn}
          onClick={() => onRenameAll(baseName)}
          disabled={!baseName.trim() || totalCount === 0 || isWorking}
          title={`Rename all ${totalCount} images to ${baseName.trim() || 'base-name'}_001, _002…`}
        >
          Rename All ({totalCount})
        </button>
      </div>

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button className={styles.dismissBtn} onClick={onDismissError}>✕</button>
        </div>
      )}
    </aside>
  )
}
