'use client'

import { Avatar } from '@/components/base/avatar/avatar'
import type { BadgeColors } from '@/components/base/badges/badge-types'
import { Badge } from '@/components/base/badges/badges'
import { Button } from '@/components/base/buttons/button'
import { Dot } from '@/components/foundations/dot-icon'
import { cx } from '@/utils/cx'
import { FileIcon } from '@untitledui/file-icons'

export type FeedItemType = {
  id: string | number
  unseen?: boolean
  comment?: string
  message?: string
  date?: string
  user: {
    avatarUrl: string
    name: string
    href: string
    username?: string
    status?: 'online' | 'offline'
  }
  attachment?: {
    name: string
    size: string
    type: 'jpg' | 'txt' | 'pdf' | 'mp4'
  }
  labels?: {
    name: string
    // href: "#";
    color: BadgeColors
  }[]
  action?: {
    content: string
    target?: string
    href?: string
  }
}

interface FeedItemProps extends FeedItemType {
  connector?: boolean
  size?: 'sm' | 'md'
}

export const FeedItem = ({
  user,
  date,
  action,
  attachment,
  comment,
  labels,
  message,
  unseen,
  connector,
  size = 'md',
}: FeedItemProps) => {
  return (
    <article className="relative flex gap-3">
      {unseen && <Dot size="md" className="text-fg-success-secondary absolute top-0 right-0" />}
      <div className="flex shrink-0 flex-col">
        <Avatar src={user.avatarUrl} alt={user.name} size={size === 'sm' ? 'sm' : 'md'} status={user.status} />
        {connector && (
          <div className="relative my-1 flex h-full w-full justify-center self-center overflow-hidden">
            <svg className="absolute" width="2.4">
              <line
                x1="1.2"
                y1="1.2"
                x2="1.2"
                y2="100%"
                className="stroke-border-primary"
                stroke="black"
                strokeWidth="2.4"
                strokeDasharray="0,6"
                strokeLinecap="round"
              />
            </svg>
          </div>
        )}
      </div>
      <div className={cx('flex flex-1 flex-col gap-3', connector && 'pb-8')}>
        <header>
          <div className="flex items-center gap-2">
            <a
              href={user.href}
              className="text-secondary outline-focus-ring rounded text-sm font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
            >
              {user.name}
            </a>
            {date && (
              <time className="text-tertiary text-xs" dateTime={date}>
                {date}
              </time>
            )}
          </div>
          {action && (
            <p className="text-tertiary text-sm">
              {action.content}{' '}
              {action.target && (
                <Button
                  href={action.href as string}
                  className="inline text-sm font-medium whitespace-normal"
                  color="link-color"
                  size="sm"
                >
                  {action.target}
                </Button>
              )}
            </p>
          )}
          {user.username && <p className="text-tertiary text-sm">{user.username}</p>}
        </header>

        {attachment && (
          <figure className="flex gap-3">
            <FileIcon type={attachment.type} theme="light" className="size-10 dark:hidden" />
            <FileIcon type={attachment.type} theme="dark" className="size-10 not-dark:hidden" />

            <figcaption>
              <p className="text-secondary text-sm font-medium">{attachment.name}</p>
              <p className="text-tertiary text-sm">{attachment.size}</p>
            </figcaption>
          </figure>
        )}

        {labels && labels.length > 0 && (
          <aside className="flex gap-1" aria-label="Labels">
            {labels.map((label) => (
              <Badge key={label.name} color={label.color} size="sm">
                {label.name}
              </Badge>
            ))}
          </aside>
        )}
        {comment && <q className="text-tertiary text-sm">{comment}</q>}
        {message && (
          <section
            className={cx(
              'ring-secondary gap-2 rounded-lg rounded-tl-none p-3 ring-1 ring-inset',
              connector && 'py-2.5'
            )}
          >
            <p className="text-secondary text-sm">{message}</p>
          </section>
        )}
      </div>
    </article>
  )
}
