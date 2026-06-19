import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import type { UpdaterStatus } from '../../../shared/types/updater'

const UPDATE_TOAST_ID = 'app-update-status'

function updateDescription(status: UpdaterStatus): string {
  switch (status.type) {
    case 'checking':
      return 'Looking for a newer release.'
    case 'available':
      return `Version ${status.version} is available. Downloading now.`
    case 'downloading':
      return `Downloading update... ${status.percent}%`
    case 'downloaded':
      return `Version ${status.version} is ready to install.`
    case 'installing':
      return 'The app will close and relaunch in a moment.'
    case 'error':
      return status.message
    case 'not-available':
      return 'You are already on the latest version.'
  }
}

export function UpdateToasts(): null {
  const hasSeenUpdateRef = useRef(false)

  useEffect(() => {
    return window.api.updater.onStatus((status) => {
      if (status.type === 'not-available' && !hasSeenUpdateRef.current) {
        return
      }

      if (status.type === 'available' || status.type === 'downloaded') {
        hasSeenUpdateRef.current = true
      }

      if (status.type === 'error') {
        toast.error('Update failed', {
          id: UPDATE_TOAST_ID,
          description: updateDescription(status),
          duration: 8000
        })
        return
      }

      if (status.type === 'installing') {
        toast.loading('Installing update', {
          id: UPDATE_TOAST_ID,
          description: updateDescription(status),
          duration: Infinity
        })
        return
      }

      if (status.type === 'downloaded') {
        toast.success('Update ready', {
          id: UPDATE_TOAST_ID,
          description: updateDescription(status),
          duration: Infinity,
          action: {
            label: 'Install now',
            onClick: () => {
              toast.loading('Installing update', {
                id: UPDATE_TOAST_ID,
                description: 'The app will close and relaunch in a moment.',
                duration: Infinity
              })
              void window.api.updater.installNow()
            }
          },
          cancel: {
            label: 'Later',
            onClick: () => toast.dismiss(UPDATE_TOAST_ID)
          }
        })
        return
      }

      const title =
        status.type === 'checking'
          ? 'Checking for updates'
          : status.type === 'available'
            ? 'Update found'
            : status.type === 'downloading'
              ? 'Downloading update'
              : 'Update status'

      toast.info(title, {
        id: UPDATE_TOAST_ID,
        description: updateDescription(status),
        duration: status.type === 'downloading' ? Infinity : 5000
      })
    })
  }, [])

  return null
}
