"use client"

import { useToast } from "@/components/ui/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertTriangle, Check, Info, X } from "lucide-react"

const getToastIcon = (variant?: string | null) => {
  const wrap = "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
  const iconClass = "h-4 w-4"

  if (variant === "destructive") {
    return (
      <div className={`${wrap} bg-destructive/12 text-destructive`}>
        <X className={iconClass} strokeWidth={2.5} />
      </div>
    )
  }

  if (variant === "warning") {
    return (
      <div className={`${wrap} bg-warning/15 text-warning`}>
        <AlertTriangle className={iconClass} strokeWidth={2.5} />
      </div>
    )
  }

  if (variant === "info") {
    return (
      <div className={`${wrap} bg-chart-2/15 text-chart-2`}>
        <Info className={iconClass} strokeWidth={2.5} />
      </div>
    )
  }

  return (
    <div className={`${wrap} bg-success/15 text-success`}>
      <Check className={iconClass} strokeWidth={2.5} />
    </div>
  )
}

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={3000}>
      {toasts.map(function ({ id, title, description, action, ...props }) {
        return (
          <Toast key={id} {...props}>
            {getToastIcon(props.variant)}
            <div className="grid min-w-0 flex-1 gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && (
                <ToastDescription>{description}</ToastDescription>
              )}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
