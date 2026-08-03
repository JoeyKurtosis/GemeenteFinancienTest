'use client'

import { Tooltip, TooltipTrigger } from '@/components/base/tooltip/tooltip'
import { cx } from '@/utils/cx'
import { HelpCircle, SearchLg } from '@untitledui/icons'
import type { ComponentPropsWithRef, ReactNode } from 'react'
import type { InputProps as AriaInputProps } from 'react-aria-components'
import { Group as AriaGroup, Input as AriaInput } from 'react-aria-components'
import { CommandShortcut } from './command-shortcut'

type CommandInputProps = AriaInputProps &
  ComponentPropsWithRef<'input'> & {
    placeholder?: string
    shortcutKeys?: string[]
    tooltip?: ReactNode
    className?: string
  }

export const CommandInput = ({ placeholder, shortcutKeys, tooltip, className, ...props }: CommandInputProps) => {
  return (
    <AriaGroup
      className={({ isFocusWithin }) =>
        cx(
          'bg-primary flex items-center gap-x-2 rounded-xl p-4',
          isFocusWithin && 'outline-focus-ring outline-2',
          className
        )
      }
    >
      <div className="pointer-events-none absolute">
        <SearchLg className="text-fg-quaternary size-5" />
      </div>

      <AriaInput
        placeholder={placeholder}
        className="text-md text-primary placeholder:text-placeholder autofill:text-primary m-0 w-full bg-transparent pl-7 ring-0 outline-hidden autofill:rounded-lg"
        {...props}
      />

      {tooltip && (
        <Tooltip title={tooltip} placement="top">
          <TooltipTrigger className="text-fg-quaternary hover:text-fg-quaternary_hover focus:text-fg-quaternary_hover cursor-pointer transition duration-200">
            <HelpCircle className="size-4 stroke-[2.25px]" />
          </TooltipTrigger>
        </Tooltip>
      )}

      {shortcutKeys && <CommandShortcut keys={shortcutKeys} />}
    </AriaGroup>
  )
}
