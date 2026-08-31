/**
 * What a territory looks like, and why.
 *
 * The map used to draw two colours: green for yours, amber for everybody
 * else's. On a map with one rival that reads fine. On a map with six it says
 * nothing — a player cannot see who they are losing to, which is most of the
 * reason to look at the map at all.
 *
 * Colour is identity here, so it has to be stable: the same athlete must be the
 * same colour on every device, in every session, without the client being told
 * which colour to use. That means deriving it from the athlete's id rather than
 * from their position in whatever list happened to load.
 */

/**
 * Hues that stay apart from each other on a dark basemap.
 *
 * Chosen to differ in hue rather than only in lightness, so two neighbouring
 * territories remain two territories to a colour-blind player, and to stay
 * clear of the green reserved for the viewer.
 */
const RIVAL_COLORS = [
  '#f97316', // orange
  '#a855f7', // violet
  '#ef4444', // red
  '#eab308', // amber
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#f43f5e', // rose
]

/** The viewer's own ground, always. */
export const OWN_TERRITORY_COLOR = '#059669'

/**
 * A stable colour for an athlete.
 *
 * Derived from the id rather than assigned in load order, so the same athlete
 * is the same colour on every client and after every refresh. An athlete whose
 * colour changed between pans would read as a different athlete.
 */
export function territoryColor(ownerId: number, viewerId: number | null | undefined): string {
  if (viewerId != null && ownerId === viewerId)
    return OWN_TERRITORY_COLOR

  // Plain modulo rather than a hash. Athlete ids are sequential, and the
  // athletes whose colours must differ are the ones running near each other —
  // who signed up near each other. Modulo guarantees eight consecutive ids get
  // eight different colours; a hash scatters them and collides sooner.
  const index = Math.abs(Math.trunc(ownerId || 0)) % RIVAL_COLORS.length
  return RIVAL_COLORS[index]
}

export interface TerritoryAppearance {
  color: string
  fillOpacity: number
  weight: number
  dashArray?: string
}

/**
 * How a territory should be drawn.
 *
 * The viewer's own ground gets a heavier border and a stronger fill, so "mine"
 * and "theirs" separate before any colour is decoded. Fills stay light on
 * purpose: a player needs to see which streets are theirs, which means seeing
 * the streets.
 */
export function territoryAppearance(
  ownerId: number,
  viewerId: number | null | undefined,
  status: string,
): TerritoryAppearance {
  const isOwn = viewerId != null && ownerId === viewerId
  return {
    color: territoryColor(ownerId, viewerId),
    fillOpacity: isOwn ? 0.34 : 0.16,
    weight: isOwn ? 3 : 2,
    // Contested ground is dashed rather than differently coloured, so it stays
    // legible as its owner's while reading as unsettled.
    dashArray: status === 'contested' ? '8 4' : undefined,
  }
}

/** Square metres as something to put on a screen. */
export function formatTerritoryArea(squareMetres: number): string {
  const value = Math.max(0, squareMetres)
  if (value < 10000)
    return `${Math.round(value).toLocaleString()} m²`
  if (value < 1000000)
    return `${(value / 10000).toFixed(value < 100000 ? 2 : 1)} ha`
  return `${(value / 1000000).toFixed(2)} km²`
}

/**
 * What changed between two sets of territories on screen.
 *
 * The map used to remove every layer and rebuild it on each viewport refresh,
 * which happens on every pan. That is hundreds of paths destroyed and recreated
 * to move the map by a block, and it drops the capture animation and any open
 * popup with them. Diffing means an unchanged territory is left alone.
 */
export interface TerritorySnapshot {
  id: number
  userId: number
  status: string
  /** Number of points, as a cheap proxy for "the shape changed". */
  shapeVersion: string
}

export function diffTerritories(
  previous: Map<number, TerritorySnapshot>,
  next: TerritorySnapshot[],
): { added: TerritorySnapshot[], changed: TerritorySnapshot[], removed: number[] } {
  const added: TerritorySnapshot[] = []
  const changed: TerritorySnapshot[] = []
  const seen = new Set<number>()

  for (const territory of next) {
    seen.add(territory.id)
    const before = previous.get(territory.id)
    if (!before) {
      added.push(territory)
      continue
    }
    // Ownership and shape are the two things that change how it is drawn.
    if (before.userId !== territory.userId
      || before.status !== territory.status
      || before.shapeVersion !== territory.shapeVersion) {
      changed.push(territory)
    }
  }

  const removed: number[] = []
  for (const id of previous.keys()) {
    if (!seen.has(id))
      removed.push(id)
  }

  return { added, changed, removed }
}
