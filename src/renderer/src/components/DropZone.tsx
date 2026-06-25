import React, { useEffect, useState } from 'react'
import styles from './DropZone.module.css'

interface Props {
  hasImages: boolean
  onDrop: (paths: string[]) => void
}

export default function DropZone({ hasImages, onDrop }: Props) {
  const [isDragging, setIsDragging] = useState(false)

  useEffect(() => {
    let dragCounter = 0

    const onDragEnter = (e: DragEvent) => {
      e.preventDefault()
      dragCounter++
      if (e.dataTransfer?.types.includes('Files')) {
        setIsDragging(true)
      }
    }

    const onDragOver = (e: DragEvent) => {
      e.preventDefault()
    }

    const onDragLeave = (e: DragEvent) => {
      e.preventDefault()
      dragCounter--
      if (dragCounter <= 0) {
        dragCounter = 0
        setIsDragging(false)
      }
    }

    const onDropEvent = (e: DragEvent) => {
      e.preventDefault()
      dragCounter = 0
      setIsDragging(false)

      const files = Array.from(e.dataTransfer?.files ?? [])
      if (files.length === 0) return

      const paths = files.map((f) => window.api.getPathForFile(f))
      onDrop(paths)
    }

    document.addEventListener('dragenter', onDragEnter)
    document.addEventListener('dragover', onDragOver)
    document.addEventListener('dragleave', onDragLeave)
    document.addEventListener('drop', onDropEvent)

    return () => {
      document.removeEventListener('dragenter', onDragEnter)
      document.removeEventListener('dragover', onDragOver)
      document.removeEventListener('dragleave', onDragLeave)
      document.removeEventListener('drop', onDropEvent)
    }
  }, [onDrop])

  if (!hasImages) {
    return (
      <div className={`${styles.empty} ${isDragging ? styles.dragging : ''}`}>
        <div className={styles.emptyInner}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="18" rx="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="m21 15-5-5L5 21" />
          </svg>
          <p className={styles.emptyTitle}>Drop images or a folder here</p>
          <p className={styles.emptySubtitle}>Supports JPEG, PNG, and WebP</p>
        </div>
      </div>
    )
  }

  if (isDragging) {
    return <div className={`${styles.overlay} ${styles.dragging}`}>Drop to load images</div>
  }

  return null
}
