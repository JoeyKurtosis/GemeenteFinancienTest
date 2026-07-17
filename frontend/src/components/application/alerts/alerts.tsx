'use client'

import { Button } from '@/components/base/buttons/button'
import { CloseButton } from '@/components/base/buttons/close-button'
import { FeaturedIcon } from '@/components/foundations/featured-icon/featured-icon'
import { cx } from '@/utils/cx'
import { AlertCircle, CheckCircle, InfoCircle } from '@untitledui/icons'
import type { ReactNode } from 'react'

const iconMap = {
  default: InfoCircle,
  brand: InfoCircle,
  gray: InfoCircle,
  error: AlertCircle,
  warning: AlertCircle,
  success: CheckCircle,
}

interface AlertFloatingProps {
  /**
   * The title of the alert.
   */
  title: string
  /**
   * The description of the alert.
   */
  description: ReactNode
  /**
   * The label for the confirm button.
   */
  confirmLabel: string
  /**
   * The label for the dismiss button.
   * @default "Dismiss"
   */
  dismissLabel?: string
  /**
   * The color of the alert.
   * @default "default"
   */
  color?: 'default' | 'brand' | 'gray' | 'error' | 'warning' | 'success'
  /**
   * The function to call when the dismiss button is clicked.
   */
  onClose?: () => void
  /**
   * The function to call when the confirm button is clicked.
   */
  onConfirm?: () => void
}

export const AlertFloating = ({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  color = 'default',
  dismissLabel = 'Dismiss',
}: AlertFloatingProps) => {
  return (
    <div className="border-primary bg-primary_alt relative flex flex-col gap-4 rounded-xl border p-4 shadow-xs md:flex-row">
      <FeaturedIcon
        icon={iconMap[color]}
        color={color === 'default' ? 'gray' : color}
        theme={color === 'default' ? 'modern' : 'outline'}
        size="md"
      />

      <div className="flex flex-1 flex-col gap-3 md:w-0">
        <div className="flex flex-col gap-1 overflow-auto">
          <p className="text-secondary pr-8 text-sm font-semibold md:truncate md:pr-0">{title}</p>
          <p className="text-tertiary text-sm md:truncate">{description}</p>
        </div>

        {(onConfirm || onClose) && (
          <div className="flex gap-3">
            {onClose && (
              <Button onClick={onClose} size="sm" color="link-gray">
                {dismissLabel}
              </Button>
            )}
            {onConfirm && (
              <Button onClick={onConfirm} size="sm" color="link-color">
                {confirmLabel}
              </Button>
            )}
          </div>
        )}
      </div>

      {onClose && <CloseButton onClick={onClose} size="sm" label={dismissLabel} className="absolute top-2 right-2" />}
    </div>
  )
}

interface AlertFullWidthProps {
  /**
   * The title of the alert.
   */
  title: string
  /**
   * The description of the alert.
   */
  description: ReactNode
  /**
   * The label for the confirm button.
   */
  confirmLabel: string
  /**
   * The label for the dismiss button.
   * @default "Dismiss"
   */
  dismissLabel?: string
  /**
   * The type of the action buttons.
   * @default "button"
   */
  actionType?: 'button' | 'link'
  /**
   * The color of the alert.
   * @default "default"
   */
  color?: 'default' | 'brand' | 'gray' | 'error' | 'warning' | 'success'
  /**
   * The function to call when the dismiss button is clicked.
   */
  onClose?: () => void
  /**
   * The function to call when the confirm button is clicked.
   */
  onConfirm?: () => void
}

export const AlertFullWidth = ({
  title,
  description,
  confirmLabel,
  onClose,
  onConfirm,
  color = 'default',
  actionType = 'button',
  dismissLabel = 'Dismiss',
}: AlertFullWidthProps) => {
  return (
    <div className="border-primary bg-secondary relative border-t md:border-t-0 md:border-b">
      <div className="max-w-container mx-auto flex flex-col gap-4 p-4 md:flex-row md:items-center md:gap-3 md:px-8 md:py-3">
        <div className="flex flex-1 flex-col gap-4 md:w-0 md:flex-row md:items-center">
          <FeaturedIcon
            className="hidden md:flex"
            icon={iconMap[color]}
            color={color === 'default' ? 'gray' : color}
            theme={color === 'default' ? 'modern' : 'outline'}
            size="md"
          />

          <div className="flex flex-col gap-0.5 overflow-hidden lg:flex-row lg:gap-1.5">
            <p className="text-secondary pr-8 text-sm font-semibold md:truncate md:pr-0">{title}</p>
            <p className="text-tertiary text-sm md:truncate">{description}</p>
          </div>
        </div>

        {(onConfirm || onClose) && (
          <div className="flex gap-2">
            <div
              className={cx('flex w-full gap-3', actionType === 'button' ? 'flex-col-reverse md:flex-row' : 'flex-row')}
            >
              {onClose && (
                <Button onClick={onClose} color={actionType === 'button' ? 'secondary' : 'link-gray'} size="sm">
                  {dismissLabel}
                </Button>
              )}
              {onConfirm && (
                <Button onClick={onConfirm} color={actionType === 'button' ? 'primary' : 'link-color'} size="sm">
                  {confirmLabel}
                </Button>
              )}
            </div>

            {onClose && (
              <CloseButton
                onClick={onClose}
                size="sm"
                label={dismissLabel}
                className="absolute top-2 right-2 shrink-0 md:static"
              />
            )}
          </div>
        )}
      </div>
    </div>
  )
}
