import React, { useEffect, useCallback } from 'react'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import { SortableContext, rectSortingStrategy } from '@dnd-kit/sortable'
import ImageCard from './ImageCard'
import type { ImageItem, SortField } from '../model/types'
import styles from './ImageGrid.module.css'

interface Props {
  images: ImageItem[]
  selectedIds: Set<string>
  culledIds: Set<string>
  sortField: SortField
  onImageClick: (id: string, ctrlKey: boolean, shiftKey: boolean) => void
  onImageDoubleClick: (id: string) => void
  onReorder: (activeId: string, overId: string) => void
  onCullSelected: () => void
  onSelectNone: () => void
}

export default function ImageGrid({
  images,
  selectedIds,
  culledIds,
  sortField,
  onImageClick,
  onImageDoubleClick,
  onReorder,
  onCullSelected,
  onSelectNone
}: Props) {
  const isDragEnabled = sortField === 'custom'

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 }
    })
  )

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      if (over && active.id !== over.id) {
        onReorder(active.id as string, over.id as string)
      }
    },
    [onReorder]
  )

  // Delete key culls selected images
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Delete' && selectedIds.size > 0) {
        onCullSelected()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [selectedIds.size, onCullSelected])

  const handleGridClick = useCallback(() => {
    onSelectNone()
  }, [onSelectNone])

  if (images.length === 0) return null

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className={styles.grid} onClick={handleGridClick}>
          {images.map((item) => (
            <ImageCard
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              isCulled={culledIds.has(item.id)}
              isDragEnabled={isDragEnabled}
              onClick={onImageClick}
              onDoubleClick={onImageDoubleClick}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
