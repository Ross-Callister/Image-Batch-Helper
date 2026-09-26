import React, { useEffect, useRef, useState } from 'react'
import { isVideoPath } from '../../../shared/mediaTypes'
import { toLocalFileUrl } from '../utils/localFileUrl'

interface Props {
  path: string
  name: string
  /** Grid thumbnail: images load lazily, videos show a still frame instead of playing. */
  thumbnail?: boolean
}

/**
 * Renders an image or a video file. Outside thumbnails, videos autoplay muted on
 * a loop with the native controls for pausing and seeking.
 */
export default function MediaView({ path, name, thumbnail = false }: Props) {
  const url = toLocalFileUrl(path)

  if (!isVideoPath(path)) {
    return thumbnail ? (
      <img src={url} alt={name} loading="lazy" decoding="async" draggable={false} />
    ) : (
      <img src={url} alt={name} draggable={false} />
    )
  }

  if (thumbnail) return <VideoThumbnail url={url} name={name} />

  return (
    <video
      key={url}
      src={url}
      aria-label={name}
      autoPlay
      loop
      muted
      playsInline
      controls
      disablePictureInPicture
      // Keep clicks on the controls from reaching click handlers behind the video (e.g. ranking picks).
      onClick={(e) => e.stopPropagation()}
      // A focused video would take the arrow and space keys for itself; hand focus back so
      // session shortcuts keep working. Mouse interaction with the controls is unaffected.
      onFocus={(e) => e.currentTarget.blur()}
    />
  )
}

function VideoThumbnail({ url, name }: { url: string; name: string }) {
  const ref = useRef<HTMLVideoElement>(null)
  const [isNearViewport, setIsNearViewport] = useState(false)

  // <video> has no loading="lazy", so defer the source until the card scrolls near view.
  useEffect(() => {
    const element = ref.current
    if (!element || isNearViewport) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setIsNearViewport(true)
      },
      { rootMargin: '300px' }
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [isNearViewport])

  // Show a frame a little way in: many clips open on black or fade in.
  const seekToPreviewFrame = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const video = e.currentTarget
    video.currentTime = Math.min(1, video.duration / 2)
  }

  return (
    <video
      ref={ref}
      src={isNearViewport ? url : undefined}
      aria-label={name}
      preload="metadata"
      onLoadedMetadata={seekToPreviewFrame}
      muted
      playsInline
      disablePictureInPicture
    />
  )
}
