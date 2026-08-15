import { derived, state } from 'stx'
import { haptics } from '~/storage/framework/core/mobile/dist/index.js'
import type { ActivityShareCardPreset, ActivitySharePoint } from 'ts-images/activity-card'
import { activitySharePreview, downloadActivityShareImage, shareActivityImage, type ShareableActivity } from '../functions/activity-share'

export function useActivityShare(getActivity: () => ShareableActivity | null, getRoute: () => ActivitySharePoint[]) {
  const sharePreset = state<ActivityShareCardPreset>('square')
  const shareBusy = state(false)
  const shareMessage = state<string | null>(null)

  const sharePreview = derived(() => {
    const activity = getActivity()
    return activity ? activitySharePreview(activity, getRoute(), sharePreset()) : ''
  })

  function chooseSharePreset(preset: ActivityShareCardPreset): void {
    sharePreset.set(preset)
    shareMessage.set(null)
  }

  async function downloadShareImage(): Promise<void> {
    const activity = getActivity()
    if (!activity || shareBusy())
      return
    shareBusy.set(true)
    shareMessage.set(null)
    try {
      await downloadActivityShareImage(activity, getRoute(), sharePreset())
      shareMessage.set('Image downloaded. It is ready to post anywhere.')
      await haptics.notification('success')
    }
    catch (error) {
      shareMessage.set(error instanceof Error ? error.message : 'Could not create the activity image')
      await haptics.notification('error')
    }
    finally {
      shareBusy.set(false)
    }
  }

  async function shareImage(): Promise<void> {
    const activity = getActivity()
    if (!activity || shareBusy())
      return
    shareBusy.set(true)
    shareMessage.set(null)
    try {
      const outcome = await shareActivityImage(activity, getRoute(), sharePreset())
      if (outcome === 'shared')
        shareMessage.set('Activity image shared.')
      else if (outcome === 'downloaded')
        shareMessage.set('Sharing is not available here, so the image was downloaded instead.')
      if (outcome !== 'cancelled') await haptics.notification('success')
    }
    catch (error) {
      shareMessage.set(error instanceof Error ? error.message : 'Could not share the activity image')
      await haptics.notification('error')
    }
    finally {
      shareBusy.set(false)
    }
  }

  return {
    chooseSharePreset,
    downloadShareImage,
    shareBusy,
    shareImage,
    shareMessage,
    sharePreset,
    sharePreview,
  }
}
