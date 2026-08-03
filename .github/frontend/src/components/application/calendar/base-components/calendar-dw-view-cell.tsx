'use client'

import { Button } from '@/components/base/buttons/button'
import { cx } from '@/utils/cx'
import { Plus } from '@untitledui/icons'
import type { HTMLAttributes } from 'react'

export const CalendarDwViewCell = (props: HTMLAttributes<HTMLDivElement>) => {
  return (
    <div
      {...props}
      className={cx(
        'group bg-primary hover:bg-primary_hover relative flex h-12 flex-col p-1.5',
        'before:border-secondary before:pointer-events-none before:absolute before:inset-0 before:border-r before:border-b',
        props.className
      )}
    >
      <div className="absolute right-1.5 bottom-1.5 hidden group-hover:inline-flex">
        <Button
          aria-label="Add event"
          size="sm"
          iconLeading={Plus}
          color="secondary"
          className="text-fg-quaternary size-7"
        />
      </div>
    </div>
  )
}
