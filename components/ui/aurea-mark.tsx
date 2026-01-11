import type { CSSProperties } from "react"
import Image from "next/image"
import { cn } from "@/lib/utils"

type AureaMarkProps = {
  className?: string
  title?: string
  width?: number
  height?: number
  priority?: boolean
  sizes?: string
  style?: CSSProperties
  zoom?: number
}

export function AureaMark({
  className,
  title = "Aurea Finanzas",
  width = 512,
  height = 512,
  priority = false,
  sizes = "(max-width: 768px) 40vw, 160px",
  style,
  zoom = 1,
}: AureaMarkProps) {
  const transformParts = [style?.transform, zoom !== 1 ? `scale(${zoom})` : undefined].filter(Boolean)
  const imageStyle: CSSProperties = {
    ...style,
    objectFit: style?.objectFit ?? "contain",
    transform: transformParts.length > 0 ? transformParts.join(" ") : undefined,
  }

  return (
    <Image
      src="/brand/logo.png"
      alt={title}
      width={width}
      height={height}
      priority={priority}
      sizes={sizes}
      className={cn("h-auto w-auto", className)}
      style={imageStyle}
    />
  )
}
