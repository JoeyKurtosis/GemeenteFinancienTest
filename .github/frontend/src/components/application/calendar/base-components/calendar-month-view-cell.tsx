'use client'

import { Button } from '@/components/base/buttons/button'
import { cx } from '@/utils/cx'
import { Plus } from '@untitledui/icons'
import type { HTMLAttributes } from 'react'

interface CalendarMonthViewCellProps extends HTMLAttributes<HTMLDivElement> {
  day: number
  state?: 'default' | 'selected' | 'current'
  isDisabled?: boolean
}

export const CalendarMonthViewCell = ({
  isDisabled,
  children,
  className,
  day,
  state,
  ...props
}: CalendarMonthViewCellProps) => {
  return (
    <div
      {...props}
      className={cx(
        'group bg-primary hover:bg-primary_hover relative flex flex-col gap-1.5 p-1.5 max-md:min-h-22 md:gap-1 md:p-2',
        'before:border-secondary before:pointer-events-none before:absolute before:inset-0 before:border-r before:border-b',
        isDisabled ? 'bg-secondary_alt pointer-events-none' : 'cursor-pointer',
        className
      )}
    >
      {!isDisabled && (
        <div className="absolute right-1.5 bottom-1.5 z-10 hidden group-hover:inline-flex">
          <Button
            aria-label="Add event"
            size="sm"
            iconLeading={Plus}
            color="secondary"
            className="text-fg-quaternary size-7"
          />
        </div>
      )}

      <span
        className={cx(
          'text-secondary flex size-6 items-center justify-center rounded-full text-xs font-semibold',
          state === 'selected' && 'bg-brand-solid text-white',
          state === 'current' && 'bg-secondary',
          isDisabled && 'opacity-50'
        )}
      >
        {day}
      </span>

      {children}
    </div>
  )
}
