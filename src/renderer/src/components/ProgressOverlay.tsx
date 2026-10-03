import React from 'react'
import type { WorkProgress } from '../model/types'
import styles from './ProgressOverlay.module.css'

interface Props {
  progress: WorkProgress | null
}

export default function ProgressOverlay({ progress }: Props) {
  if (!progress) return null

  const percent = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className={styles.backdrop}>
      <div className={styles.panel} role="progressbar" aria-valuemin={0} aria-valuemax={progress.total} aria-valuenow={progress.done}>
        <div className={styles.header}>
          <span>{progress.label}…</span>
          <span className={styles.count}>
            {progress.done} / {progress.total}
          </span>
        </div>
        <div className={styles.track}>
          <div className={styles.fill} style={{ width: `${percent}%` }} />
        </div>
      </div>
    </div>
  )
}
