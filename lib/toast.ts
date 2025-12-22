import { toast as sonnerToast } from 'sonner'

// Custom toast utility to replace alert() calls
export const toast = {
  success: (message: string) => {
    sonnerToast.success(message, {
      duration: 4000,
      className: 'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-100 border-green-200 dark:border-green-800',
    })
  },
  
  error: (message: string) => {
    sonnerToast.error(message, {
      duration: 5000,
      className: 'bg-red-50 dark:bg-red-900/20 text-red-900 dark:text-red-100 border-red-200 dark:border-red-800',
    })
  },
  
  warning: (message: string) => {
    sonnerToast.warning(message, {
      duration: 4000,
      className: 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-900 dark:text-yellow-100 border-yellow-200 dark:border-yellow-800',
    })
  },
  
  info: (message: string) => {
    sonnerToast.info(message, {
      duration: 4000,
      className: 'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100 border-blue-200 dark:border-blue-800',
    })
  },

  // Generic toast
  message: (message: string) => {
    sonnerToast(message, {
      duration: 3000,
      className: 'bg-card text-foreground border-border',
    })
  }
}

// Async confirm dialog using sonner toast with promise
export const confirm = (message: string): Promise<boolean> => {
  return new Promise((resolve) => {
    let resolved = false

    sonnerToast(message, {
      duration: Infinity,
      className: 'bg-card text-foreground border-border',
      action: {
        label: 'Confirm',
        onClick: () => {
          resolved = true
          resolve(true)
        },
      },
      cancel: {
        label: 'Cancel',
        onClick: () => {
          resolved = true
          resolve(false)
        },
      },
      onDismiss: () => {
        if (!resolved) {
          resolve(false)
        }
      },
    })
  })
}
