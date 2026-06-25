import React from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { ImageItem } from '../types'
import styles from './ImageCard.module.css'

interface Props {
  item: ImageItem
  isSelected: boolean
  isCulled: boolean
  isDragEnabled: boolean
  onClick: (id: string, ctrlKey: boolean, shiftKey: boolean) => void
  onDoubleClick: (id: string) => void
}

export default function ImageCard({
  item,
  isSelected,
  isCulled,
  isDragEnabled,
  onClick,
  onDoubleClick
}: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    disabled: !isDragEnabled
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition
  }

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(item.id, e.ctrlKey || e.metaKey, e.shiftKey)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDoubleClick(item.id)
  }

  const localFileUrl = 'localfile:///' + encodeURI(item.path.replace(/\\/g, '/'))

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${isCulled ? styles.culled : ''} ${isDragging ? styles.dragging : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      {...(isDragEnabled ? { ...attributes, ...listeners } : {})}
    >
      <div className={styles.thumb}>
        <img src={localFileUrl} alt={item.name} loading="lazy" decoding="async" draggable={false} />
        {isCulled && (
          <div className={styles.cullOverlay}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </div>
        )}
      </div>
      <div className={styles.name} title={item.name}>
        {item.name}
      </div>
    </div>
  )
}
