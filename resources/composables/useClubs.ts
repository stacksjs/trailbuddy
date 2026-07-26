import { onMount, state } from 'stx'
import { createClub, fetchClubs, toggleClubMembership } from '../assets/scripts/game-api'

/**
 * Clubs (#964): hydrate the club list from the API, toggle membership
 * optimistically, and drive the create-club form.
 */

interface ClubStoreLike {
  currentUserId: () => number
  clubs: () => any[]
  hydrateClubs: (list: any[]) => void
  addClub: (club: any) => void
  applyClubMembership: (clubId: number, joined: boolean, memberCount: number) => void
}

const CLUB_TYPES = ['Running', 'Hiking', 'Mixed', 'Territory Game']

let started = false

export function useClubs(tb: ClubStoreLike | null) {
  const createOpen = state(false)
  const submitting = state(false)
  const createError = state<string | null>(null)

  const fName = state('')
  const fType = state('Running')
  const fLocation = state('')
  const fDescription = state('')
  const fPrivate = state(false)

  onMount(async () => {
    if (!tb || started)
      return
    started = true
    const clubs = await fetchClubs()
    if (clubs)
      tb.hydrateClubs(clubs)
  })

  function isMember(club: any): boolean {
    if (!tb)
      return false
    return club.isMember ?? (club.members ?? []).includes(tb.currentUserId())
  }

  async function onToggleMembership(club: any) {
    if (!tb)
      return
    const club2 = tb.clubs().find(c => c.id === club.id) ?? club
    const was = isMember(club2)
    // Capture the ORIGINAL count before the optimistic mutation - applyClub-
    // Membership mutates club2.memberCount in place, so reading it again on
    // failure would roll back to the optimistic value, not the original.
    const prevCount = club2.memberCount ?? 0
    const nextCount = prevCount + (was ? -1 : 1)
    tb.applyClubMembership(club.id, !was, nextCount) // optimistic
    const res = await toggleClubMembership(club.id)
    if (res && res.success)
      tb.applyClubMembership(club.id, !!res.joined, res.memberCount ?? nextCount)
    else
      tb.applyClubMembership(club.id, was, prevCount) // rollback to original
  }

  function openCreate() {
    fName.set('')
    fType.set('Running')
    fLocation.set('')
    fDescription.set('')
    fPrivate.set(false)
    createError.set(null)
    createOpen.set(true)
  }

  function closeCreate() {
    createOpen.set(false)
    createError.set(null)
  }

  async function submitCreate() {
    if (!tb || submitting())
      return
    const name = fName().trim()
    if (name.length < 2) {
      createError.set('Give your club a name (at least 2 characters).')
      return
    }
    if (!CLUB_TYPES.includes(fType())) {
      createError.set('Pick a club type.')
      return
    }
    submitting.set(true)
    createError.set(null)
    const res = await createClub({
      name,
      club_type: fType(),
      location: fLocation().trim() || null,
      description: fDescription().trim() || null,
      is_private: fPrivate(),
    })
    submitting.set(false)
    if (res && res.success && res.club) {
      tb.addClub(res.club)
      createOpen.set(false)
    }
    else {
      createError.set(res?.fields ? Object.values(res.fields)[0] as string : (res?.error ?? 'Could not create the club.'))
    }
  }

  return {
    createOpen,
    submitting,
    createError,
    fName,
    fType,
    fLocation,
    fDescription,
    fPrivate,
    isMember,
    onToggleMembership,
    openCreate,
    closeCreate,
    submitCreate,
  }
}
