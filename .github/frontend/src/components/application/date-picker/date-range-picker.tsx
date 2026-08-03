'use client'

import { Button, type ButtonProps } from '@/components/base/buttons/button'
import { InputDateBase } from '@/components/base/input/input-date'
import { cx } from '@/utils/cx'
import { getLocalTimeZone, today } from '@internationalized/date'
import { useControlledState } from '@react-stately/utils'
import { Calendar as CalendarIcon } from '@untitledui/icons'
import { useState } from 'react'
import { useDateFormatter } from 'react-aria'
import type { DateRangePickerProps as AriaDateRangePickerProps, DateValue } from 'react-aria-components'
import {
  DateRangePicker as AriaDateRangePicker,
  Dialog as AriaDialog,
  Group as AriaGroup,
  Popover as AriaPopover,
} from 'react-aria-components'
import { RangeCalendar } from './range-calendar'

const highlightedDates = [today(getLocalTimeZone())]

interface DateRangePickerProps extends AriaDateRangePickerProps<DateValue> {
  size?: ButtonProps['size']
  /** The function to call when the apply button is clicked. */
  onApply?: () => void
  /** The function to call when the cancel button is clicked. */
  onCancel?: () => void
}

export const DateRangePicker = ({
  value: valueProp,
  defaultValue,
  onChange,
  onApply,
  onCancel,
  size = 'sm',
  ...props
}: DateRangePickerProps) => {
  const formatter = useDateFormatter({
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const [value, setValue] = useControlledState(valueProp, defaultValue || null, onChange)
  const [focusedValue, setFocusedValue] = useState<DateValue | null>(null)
  const [valueOnOpen, setValueOnOpen] = useState(value)

  const formattedStartDate = value?.start ? formatter.format(value.start.toDate(getLocalTimeZone())) : 'Selecteer datum'
  const formattedEndDate = value?.end ? formatter.format(value.end.toDate(getLocalTimeZone())) : 'Selecteer datum'

  return (
    <AriaDateRangePicker
      aria-label="Datumbereik kiezen"
      shouldCloseOnSelect={false}
      {...props}
      value={value}
      onChange={setValue}
      onOpenChange={(isOpen) => {
        if (isOpen) setValueOnOpen(value)
      }}
    >
      <AriaGroup>
        <Button size={size} color="secondary" iconLeading={CalendarIcon} className="w-64 justify-start">
          {!value ? (
            <span className="text-placeholder">Selecteer periode</span>
          ) : (
            `${formattedStartDate} – ${formattedEndDate}`
          )}
        </Button>
      </AriaGroup>
      <AriaPopover
        placement="bottom right"
        offset={8}
        className={({ isEntering, isExiting }) =>
          cx(
            'origin-(--trigger-anchor-point) will-change-transform',
            isEntering &&
              'animate-in fade-in placement-right:slide-in-from-left-0.5 placement-top:slide-in-from-bottom-0.5 placement-bottom:slide-in-from-top-0.5 duration-150 ease-out',
            isExiting &&
              'animate-out fade-out placement-right:slide-out-to-left-0.5 placement-top:slide-out-to-bottom-0.5 placement-bottom:slide-out-to-top-0.5 duration-100 ease-in'
          )
        }
      >
        <AriaDialog
          aria-label="Date range picker"
          className="bg-primary ring-secondary_alt flex rounded-2xl shadow-xl ring focus:outline-hidden"
        >
          {({ close }) => (
            <>
              <div className="flex flex-col">
                <RangeCalendar
                  focusedValue={focusedValue}
                  onFocusChange={setFocusedValue}
                  highlightedDates={highlightedDates}
                />
                <div className="border-secondary flex justify-between gap-3 border-t p-4">
                  <div className="hidden items-center gap-2 md:flex">
                    <InputDateBase slot="start" size="sm" />
                    <div className="text-md text-quaternary">–</div>
                    <InputDateBase slot="end" size="sm" />
                  </div>
                  <div className="grid w-full grid-cols-2 gap-3 md:flex md:w-auto">
                    <Button
                      size="sm"
                      color="secondary"
                      onClick={() => {
                        setValue(valueOnOpen)
                        setFocusedValue(null)
                        onCancel?.()
                        close()
                      }}
                    >
                      Annuleren
                    </Button>
                    <Button
                      size="sm"
                      color="primary"
                      onClick={() => {
                        onApply?.()
                        close()
                      }}
                    >
                      Toepassen
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </AriaDialog>
      </AriaPopover>
    </AriaDateRangePicker>
  )
}
