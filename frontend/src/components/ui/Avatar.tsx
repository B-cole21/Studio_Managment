import { initials } from '../../lib/format'

const palette = [
  'bg-[#5b8def]',
  'bg-[#8f6df0]',
  'bg-[#e26d9e]',
  'bg-[#e08a4e]',
  'bg-[#4caf8a]',
  'bg-[#4da3c7]',
]

function colorFor(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0
  }
  return palette[Math.abs(hash) % palette.length]
}

export interface AvatarProps {
  name: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-12 w-12 text-base',
}

export function Avatar({ name, size = 'md', className = '' }: AvatarProps) {
  const [first, ...rest] = name.split(' ')
  return (
    <span
      aria-hidden="true"
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white/95 ${sizes[size]} ${colorFor(name)} ${className}`}
    >
      {initials(first ?? '', rest.join(' ')) || '?'}
    </span>
  )
}
