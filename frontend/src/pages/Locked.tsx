import { Lock } from 'lucide-react'
import { PageHeader } from '../components/ui/PageHeader'
import { EmptyState } from '../components/ui/EmptyState'

export interface LockedPageProps {
  title?: string
  message?: string
}

export function LockedPage({
  title = 'Access restricted',
  message = 'Your account does not have permission to view this page.',
}: LockedPageProps) {
  return (
    <div className="flex flex-col gap-5">
      <PageHeader eyebrow="Restricted" title={title} description={message} />
      <EmptyState
        icon={<Lock size={18} />}
        title="This area is locked"
        message="Only accounts with the right role can access this section. Contact the studio manager if you think this is a mistake."
      />
    </div>
  )
}
