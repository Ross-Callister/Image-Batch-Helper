import React, { forwardRef, memo } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { isVideoPath } from '../../../shared/mediaTypes'
import type { ImageItem } from '../model/types'
import MediaView from './MediaView'
import styles from './ImageCard.module.css'

interface Props {
  item: ImageItem
  isSelected: boolean
  isCulled: boolean
  onClick: (id: string, ctrlKey: boolean, shiftKey: boolean) => void
  onDoubleClick: (id: string) => void
}

interface CardBodyProps extends Props, Omit<React.HTMLAttributes<HTMLDivElement>, keyof Props> {
  isDragging?: boolean
}

const CardBody = forwardRef<HTMLDivElement, CardBodyProps>(function CardBody(
  { item, isSelected, isCulled, isDragging = false, onClick, onDoubleClick, ...rest },
  ref
) {
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onClick(item.id, e.ctrlKey || e.metaKey, e.shiftKey)
  }

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    onDoubleClick(item.id)
  }

  return (
    <div
      ref={ref}
      {...rest}
      className={`${styles.card} ${isSelected ? styles.selected : ''} ${isCulled ? styles.culled : ''} ${isDragging ? styles.dragging : ''}`}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      <div className={styles.thumb}>
        <MediaView path={item.path} name={item.name} thumbnail />
        {isVideoPath(item.path) && (
          <div className={styles.videoBadge} title="Video">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5.5v13l11-6.5z" />
            </svg>
          </div>
        )}
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
})

/** Plain grid card. Memoized so selection changes only re-render the cards they affect. */
const ImageCard = memo(function ImageCard(props: Props) {
  return <CardBody {...props} />
})

/** Card that can be dragged to reorder; only used while sorting by custom order. */
export const SortableImageCard = memo(function SortableImageCard(props: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: props.item.id
  })

  return (
    <CardBody
      ref={setNodeRef}
      {...props}
      {...attributes}
      {...listeners}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      isDragging={isDragging}
    />
  )
})

export default ImageCard
