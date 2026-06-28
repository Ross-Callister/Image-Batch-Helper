import React, { useState } from 'react'
import type { ImageItem } from '../types'
import styles from './TagPanel.module.css'

interface Props {
  images: ImageItem[]
  selectedIds: Set<string>
  draftTags: Map<string, string[]>
  hasPendingTags: boolean
  isWorking: boolean
  onAddTag: (tag: string) => void
  onRemoveTag: (tag: string) => void
  onSaveTags: () => void
}

function effectiveTags(img: ImageItem, drafts: Map<string, string[]>): string[] {
  return drafts.get(img.id) ?? img.tags
}

export default function TagPanel({
  images,
  selectedIds,
  draftTags,
  hasPendingTags,
  isWorking,
  onAddTag,
  onRemoveTag,
  onSaveTags
}: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const [newTag, setNewTag] = useState('')

  const selected = images.filter((img) => selectedIds.has(img.id))

  // Single: show that image's tags. Multi: show intersection (tags all share).
  let displayTags: string[] = []
  if (selected.length === 1) {
    displayTags = effectiveTags(selected[0], draftTags)
  } else if (selected.length > 1) {
    const first = effectiveTags(selected[0], draftTags)
    displayTags = first.filter((tag) =>
      selected.every((img) => effectiveTags(img, draftTags).includes(tag))
    )
  }

  const handleAdd = () => {
    const tag = newTag.trim().replace(/,/g, '')
    if (!tag) return
    onAddTag(tag)
    setNewTag('')
  }

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
          {selected.length === 0 ? (
            <p className={styles.hint}>Select images to view tags</p>
          ) : (
            <>
              <p className={styles.context} title={selected.length === 1 ? selected[0].name : undefined}>
                {selected.length === 1 ? selected[0].name : `${selected.length} images selected`}
              </p>

              {selected.length > 1 && displayTags.length > 0 && (
                <p className={styles.hint}>Common tags</p>
              )}

              <div className={styles.chips}>
                {displayTags.map((tag) => (
                  <span key={tag} className={styles.chip}>
                    <span className={styles.chipLabel}>{tag}</span>
                    <button
                      className={styles.chipDel}
                      onClick={() => onRemoveTag(tag)}
                      disabled={isWorking}
                      title={`Remove "${tag}"`}
                    >
                      ×
                    </button>
                  </span>
                ))}
                {displayTags.length === 0 && (
                  <span className={styles.hint}>
                    {selected.length > 1 ? 'No common tags' : 'No tags yet'}
                  </span>
                )}
              </div>

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
            </>
          )}
        </div>
      )}
    </div>
  )
}
