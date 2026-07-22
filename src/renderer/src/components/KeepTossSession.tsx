import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { ImageItem, KeepTossDecision } from '../types'
import styles from './KeepTossSession.module.css'

interface Props {
  isOpen: boolean
  images: ImageItem[]
  decisions: Map<string, KeepTossDecision>
  isWorking: boolean
  onDecide: (id: string, decision: KeepTossDecision) => void
  onUndo: (id: string) => void
  onClose: () => void
  onDeleteTossed: () => Promise<void>
  onMoveKept: (destFolder: string) => Promise<void>
  onReset: () => void
}

function toLocalFileUrl(filePath: string): string {
  return 'localfile:///' + encodeURI(filePath.replace(/\\/g, '/'))
}

export default function KeepTossSession({
  isOpen,
  images,
  decisions,
  isWorking,
  onDecide,
  onUndo,
  onClose,
  onDeleteTossed,
  onMoveKept,
  onReset
}: Props) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [anim, setAnim] = useState<'idle' | 'keep' | 'toss'>('idle')
  const [destFolder, setDestFolder] = useState('keep')

  // On open, resume at the first undecided image
  useEffect(() => {
    if (!isOpen) return
    const idx = images.findIndex((img) => !decisions.has(img.id))
    setCurrentIndex(idx === -1 ? images.length : idx)
    setAnim('idle')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Mid-session delete/move mutates the images array (items are removed) while
  // the session stays open — realign the index to the images list whenever its
  // length changes so we don't end up pointing at the wrong picture.
  const prevImagesLenRef = useRef(images.length)
  useEffect(() => {
    if (!isOpen) return
    if (images.length !== prevImagesLenRef.current) {
      const idx = images.findIndex((img) => !decisions.has(img.id))
      setCurrentIndex(idx === -1 ? images.length : idx)
      setAnim('idle')
    }
    prevImagesLenRef.current = images.length
  }, [isOpen, images, decisions])

  const done = currentIndex >= images.length
  const current = !done ? images[currentIndex] : undefined

  const decide = useCallback(
    (decision: KeepTossDecision) => {
      if (!current || anim !== 'idle') return
      onDecide(current.id, decision)
      setAnim(decision)
      setTimeout(() => {
        setCurrentIndex((i) => i + 1)
        setAnim('idle')
      }, 220)
    },
    [current, anim, onDecide]
  )

  const goBack = useCallback(() => {
    if (anim !== 'idle' || currentIndex === 0) return
    const prevImg = images[currentIndex - 1]
    if (prevImg) onUndo(prevImg.id)
    setCurrentIndex((i) => i - 1)
  }, [anim, currentIndex, images, onUndo])

  const handleClear = useCallback(() => {
    onReset()
    setCurrentIndex(0)
    setAnim('idle')
  }, [onReset])

  useEffect(() => {
    if (!isOpen) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') { e.preventDefault(); goBack(); return }
      if (e.key === 'Backspace') { e.preventDefault(); goBack(); return }
      if (done) return
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') { e.preventDefault(); decide('toss') }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') { e.preventDefault(); decide('keep') }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [isOpen, done, decide, goBack, onClose])

  const { keptCount, tossedCount } = useMemo(() => {
    let kept = 0
    let tossed = 0
    for (const d of decisions.values()) {
      if (d === 'keep') kept++
      else if (d === 'toss') tossed++
    }
    return { keptCount: kept, tossedCount: tossed }
  }, [decisions])

  if (!isOpen || images.length === 0) return null

  const pct = Math.min(100, Math.round((currentIndex / images.length) * 100))

  const pickFolder = async () => {
    const folder = await window.api.selectFolder()
    if (folder) setDestFolder(folder)
  }

  const hasDecisions = keptCount > 0 || tossedCount > 0

  const actionsPanel = (
    <div className={styles.doneActions}>
      <button
        className={`${styles.actionBtn} ${styles.deleteBtn}`}
        onClick={onDeleteTossed}
        disabled={tossedCount === 0 || isWorking}
      >
        {isWorking ? 'Working…' : `Delete ${tossedCount} tossed`}
      </button>

      <div className={styles.moveRow}>
        <input
          className={styles.folderInput}
          type="text"
          value={destFolder}
          onChange={(e) => setDestFolder(e.target.value)}
          placeholder="./keep or full path"
          spellCheck={false}
          disabled={isWorking}
        />
        <button className={styles.browseBtn} onClick={pickFolder} disabled={isWorking}>
          Browse…
        </button>
        <button
          className={`${styles.actionBtn} ${styles.moveBtn}`}
          onClick={() => onMoveKept(destFolder)}
          disabled={keptCount === 0 || !destFolder.trim() || isWorking}
        >
          {isWorking ? 'Working…' : `Move ${keptCount} kept`}
        </button>
      </div>
    </div>
  )

  return createPortal(
    <div className={styles.backdrop}>
      <div className={styles.session}>
        <div className={styles.topBar}>
          <span className={styles.topTitle}>Keep / Toss</span>
          <div className={styles.progressWrap}>
            <div className={styles.progressBar} style={{ width: `${pct}%` }} />
          </div>
          <span className={styles.progressLabel}>
            {Math.min(currentIndex, images.length)} / {images.length}
          </span>
          <div className={styles.topSep} />
          {tossedCount > 0 && (
            <span className={`${styles.countBadge} ${styles.tossBadge}`}>{tossedCount} toss</span>
          )}
          {keptCount > 0 && (
            <span className={`${styles.countBadge} ${styles.keepBadge}`}>{keptCount} keep</span>
          )}
          <button
            className={styles.exitBtn}
            onClick={handleClear}
            disabled={!hasDecisions || isWorking}
            title="Clear all keep/toss marks and start over"
          >
            Clear marks
          </button>
          <button className={styles.exitBtn} onClick={onClose}>
            Exit
          </button>
        </div>

        <div className={styles.body}>
          {done ? (
            <div className={styles.doneArea}>
              <div className={styles.doneIcon}>
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </div>
              <p className={styles.doneTitle}>All images sorted</p>
              <p className={styles.doneSub}>
                {keptCount} to keep &middot; {tossedCount} to toss
              </p>

              {actionsPanel}

              <button className={styles.exitBtn} style={{ marginTop: 18 }} onClick={onClose}>
                Exit session
              </button>
            </div>
          ) : (
            <div className={styles.stage}>
              <div className={styles.cardWrap}>
                {current && (
                  <div key={current.id} className={`${styles.card} ${anim === 'keep' ? styles.cardKeep : ''} ${anim === 'toss' ? styles.cardToss : ''}`}>
                    <img src={toLocalFileUrl(current.path)} alt={current.name} draggable={false} />
                    {anim === 'keep' && <div className={`${styles.stamp} ${styles.stampKeep}`}>KEEP</div>}
                    {anim === 'toss' && <div className={`${styles.stamp} ${styles.stampToss}`}>TOSS</div>}
                  </div>
                )}
              </div>
              <div className={styles.imgName}>{current?.name}</div>

              <div className={styles.controls}>
                <button
                  className={`${styles.bigBtn} ${styles.tossBtn}`}
                  onClick={() => decide('toss')}
                  title="Toss (← or A)"
                >
                  <span className={styles.keyHint}>←</span>
                  Toss
                </button>
                <button
                  className={styles.backBtn}
                  onClick={goBack}
                  disabled={currentIndex === 0}
                  title="Previous image (↑, W, or Backspace)"
                >
                  ↺
                </button>
                <button
                  className={`${styles.bigBtn} ${styles.keepBtn}`}
                  onClick={() => decide('keep')}
                  title="Keep (→ or D)"
                >
                  Keep
                  <span className={styles.keyHint}>→</span>
                </button>
              </div>

              {hasDecisions && (
                <div className={styles.partialPanel}>
                  <div className={styles.partialTitle}>Apply to what&apos;s decided so far</div>
                  {actionsPanel}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}
