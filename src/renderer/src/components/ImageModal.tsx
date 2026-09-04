import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import type { ImageItem } from '../model/types'
import { toLocalFileUrl } from '../utils/localFileUrl'
import styles from './ImageModal.module.css'

interface Props {
  image: ImageItem | null
  hasPrev: boolean
  hasNext: boolean
  onClose: () => void
  onNavigate: (dir: 'prev' | 'next') => void
}

export default function ImageModal({ image, hasPrev, hasNext, onClose, onNavigate }: Props) {
  useEffect(() => {
    if (!image) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate('prev')
      if (e.key === 'ArrowRight' && hasNext) onNavigate('next')
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [image, hasPrev, hasNext, onClose, onNavigate])

  if (!image) return null

  const localFileUrl = toLocalFileUrl(image.path)

  return createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.title}>{image.name}</span>
          <button className={styles.closeBtn} onClick={onClose} title="Close (Esc)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className={styles.imageWrap}>
          {hasPrev && (
            <button className={`${styles.navBtn} ${styles.prev}`} onClick={() => onNavigate('prev')} title="Previous (←)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <img src={localFileUrl} alt={image.name} draggable={false} />
          {hasNext && (
            <button className={`${styles.navBtn} ${styles.next}`} onClick={() => onNavigate('next')} title="Next (→)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
