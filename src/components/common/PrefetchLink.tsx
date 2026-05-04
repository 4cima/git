'use client'

import Link from 'next/link'
import React from 'react'

interface PrefetchLinkProps {
  to?: string
  href?: string
  children: React.ReactNode
  className?: string
  target?: string
  rel?: string
  title?: string
  'aria-label'?: string
  draggable?: boolean
  onMouseEnter?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  onMouseLeave?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
  onDragStart?: (e: React.DragEvent<HTMLAnchorElement>) => void
}

/** Link that prefetches route chunk on hover for instant navigation */
export const PrefetchLink = ({ to, href, children, className, target, rel, title, onMouseEnter, onMouseLeave, onClick, draggable, onDragStart, ...props }: PrefetchLinkProps) => {
  const linkHref = href || to || '/'
  return (
    <Link 
      href={linkHref} 
      className={className}
      target={target || '_self'}
      rel={rel}
      title={title}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      draggable={draggable}
      onDragStart={onDragStart as any}
      prefetch={true}
      {...props}
    >
      {children}
    </Link>
  )
}
