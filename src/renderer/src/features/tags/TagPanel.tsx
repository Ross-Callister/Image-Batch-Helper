import React, { useState } from 'react'
import { countTags, selectionTags, type TagFilterMode } from './tagSelectors'
import type { ImageItem } from '../../model/types'
import styles from './TagPanel.module.css'

interface Props {
  images: ImageItem[]
  selectedIds: Set<string>
  draftTags: Map<string, string[]>
  hasPendingTags: boolean
  isWorking: boolean
  tagFilters: Map<string, TagFilterMode>
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onSaveTags: () => void
  onCycleFilter: (tag: string) => void
  onClearFilters: () => void
}

interface FilterTagChipProps {
  name: string
  count?: number
  mode?: TagFilterMode
  onCycle: (tag: string) => void
}

function FilterTagChip({ name, count, mode, onCycle }: FilterTagChipProps) {
  const title = mode === 'include'
    ? `Excluding "${name}" — click to remove filter`
    : mode === 'exclude'
      ? `Click to remove "${name}" filter`
      : `Include only images with "${name}"`

  return (
    <button
      className={`${styles.chip} ${styles.chipFilter} ${
        mode === 'include' ? styles.chipInclude :
        mode === 'exclude' ? styles.chipExclude : ''
      }`}
      onClick={() => onCycle(name)}
      title={title}
    >
      <span className={styles.chipLabel}>{name}</span>
      {count !== undefined && <span className={styles.chipCount}>{count}</span>}
    </button>
  )
}

export default function TagPanel({
  images,
  selectedIds,
  draftTags,
  hasPendingTags,
  isWorking,
  tagFilters,
  onAddTag,
  onRemoveTag,
  onSaveTags,
  onCycleFilter,
  onClearFilters
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [newTag, setNewTag] = useState('')

  const selected = images.filter((img) => selectedIds.has(img.id))
  const hasFilters = tagFilters.size > 0

  const handleAdd = () => {
    const tag = newTag.trim().replace(/,/g, '')
    if (!tag) return
    onAddTag(tag)
    setNewTag('')
  }

  // ── "All images" view (nothing selected) ──────────────────────────────────
  if (selected.length === 0) {
    // Collect tag counts across all images using effective (draft-aware) tags
    const sortedTags = countTags(images, draftTags)

    return (
      <div className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
        <div className={styles.header}>
          {!collapsed && (
            <span className={styles.title}>
              Tags
              {hasFilters && <span className={styles.filterBadge}>{tagFilters.size}</span>}
            </span>
          )}
          <button
            className={styles.toggleBtn}
            onClick={() => setCollapsed((c) => !c)}
            title={collapsed ? 'Expand tags panel' : 'Collapse tags panel'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed && (
          <div className={styles.body}>
            {sortedTags.length === 0 ? (
              <p className={styles.hint}>No tags on any image</p>
            ) : (
              <>
                <p className={styles.hint}>Click to filter</p>
                <div className={styles.chips}>
                  {sortedTags.map(([tag, count]) => {
                    const filterMode = tagFilters.get(tag)
                    return (
                      <FilterTagChip
                        key={tag}
                        name={tag}
                        count={count}
                        mode={filterMode}
                        onCycle={onCycleFilter}
                      />
                    )
                  })}
                </div>
                {hasFilters && (
                  <button className={styles.clearFiltersBtn} onClick={onClearFilters}>
                    Clear filters
                  </button>
                )}
              </>
            )}
          </div>
        )}
      </div>
    )
  }

  // ── Selection view ─────────────────────────────────────────────────────────
  const displayTags = selectionTags(selected, draftTags, tagFilters)
  const commonSelectionTags = displayTags.filter((tag) => tag.isCommon)
  const retainedFilterTags = displayTags.filter((tag) => !tag.isCommon)

  return (
    <div className={`${styles.panel} ${collapsed ? styles.collapsed : ''}`}>
      <div className={styles.header}>
        {!collapsed && (
          <span className={styles.title}>
            Tags
            {hasPendingTags && <span className={styles.dirty} title="Unsaved changes" />}
          </span>
        )}
        <button
          className={styles.toggleBtn}
          onClick={() => setCollapsed((c) => !c)}
          title={collapsed ? 'Expand tags panel' : 'Collapse tags panel'}
        >
          {collapsed ? '›' : '‹'}
        </button>
      </div>

      {!collapsed && (
        <div className={styles.body}>
          <p className={styles.context} title={selected.length === 1 ? selected[0].name : undefined}>
            {selected.length === 1 ? selected[0].name : `${selected.length} images selected`}
          </p>

          {selected.length > 1 && commonSelectionTags.length > 0 && (
            <p className={styles.hint}>Common tags</p>
          )}

          <div className={styles.chips}>
            {commonSelectionTags.map(({ name }) => (
              <span key={name} className={styles.chip}>
                <span className={styles.chipLabel}>{name}</span>
                <button
                  className={styles.chipDel}
                  onClick={() => onRemoveTag(name)}
                  disabled={isWorking}
                  title={`Remove "${name}"`}
                >
                  ×
                </button>
              </span>
            ))}
            {commonSelectionTags.length === 0 && (
              <span className={styles.hint}>
                {selected.length > 1 ? 'No common tags' : 'No tags yet'}
              </span>
            )}
          </div>

          {retainedFilterTags.length > 0 && (
            <>
              <p className={styles.hint}>Active filters</p>
              <div className={styles.chips}>
                {retainedFilterTags.map(({ name, filterMode }) => (
                  <FilterTagChip
                    key={name}
                    name={name}
                    mode={filterMode}
                    onCycle={onCycleFilter}
                  />
                ))}
              </div>
            </>
          )}

          {hasFilters && (
            <button className={styles.clearFiltersBtn} onClick={onClearFilters}>
              Clear filters
            </button>
          )}

          <div className={styles.addRow}>
            <input
              className={styles.input}
              type="text"
              placeholder="Add tag…"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleAdd() }}
              disabled={isWorking}
              spellCheck={false}
            />
            <button
              className={styles.addBtn}
              onClick={handleAdd}
              disabled={!newTag.trim() || isWorking}
              title="Add tag (Enter)"
            >
              +
            </button>
          </div>

          {hasPendingTags && (
            <button
              className={styles.saveBtn}
              onClick={onSaveTags}
              disabled={isWorking}
            >
              {isWorking ? 'Saving…' : 'Save Tags'}
            </button>
          )}
        </div>
      )}
    </div>
  )
}
