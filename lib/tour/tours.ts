/**
 * Guided demo tours — data only, no React, so they stay testable under node.
 *
 * A tour step can carry an `action`, which the host component performs before
 * the callout is shown. That is what makes the fog-of-war tour work as a demo:
 * it switches the COP view itself, so the audience watches the picture change
 * rather than being told it would.
 */

export type CopTourMode = 'orbat' | 'blue_picture' | 'red_fow'

export type TourAction = { type: 'cop-mode'; value: CopTourMode }

export type TourPlacement = 'top' | 'bottom' | 'left' | 'right' | 'center'

export interface TourStep {
  id: string
  /**
   * Value of the `data-tour` attribute to anchor against. Null centres the
   * callout — used for opening and closing remarks.
   */
  target: string | null
  title: string
  body: string
  /** The line to actually say out loud. Shown in a quoted block. */
  say?: string
  placement?: TourPlacement
  action?: TourAction
  /**
   * Pause after the action before revealing the callout. Cesium streams
   * terrain and imagery per view, so switching COP mode needs a beat.
   */
  settleMs?: number
}

export interface Tour {
  id: string
  label: string
  description: string
  steps: TourStep[]
}

export const ARENA_FOG_OF_WAR_TOUR: Tour = {
  id: 'arena-fog-of-war',
  label: 'Fog of war walkthrough',
  description: 'Three views of one battlespace — and why they disagree.',
  steps: [
    {
      id: 'intro',
      target: null,
      placement: 'center',
      title: 'Fog of war, in three views',
      body:
        'This scenario holds four units — one red, three blue. You are about to see the same battlespace through three different sets of eyes. The point is that they do not agree.',
      say: 'Every intelligence product you have ever been handed was somebody’s partial picture. This shows you the gap.',
    },
    {
      id: 'scenario',
      target: 'scenario-list',
      placement: 'right',
      title: 'The running scenario',
      body:
        'A live scenario with its clock running. The ORBAT line shows what actually exists in the world — ground truth, before anyone observes it.',
      say: 'This one is at T+45 minutes. One red unit, three blue.',
    },
    {
      id: 'orbat',
      target: 'cop-tabs',
      placement: 'bottom',
      action: { type: 'cop-mode', value: 'orbat' },
      settleMs: 1200,
      title: 'ORBAT — ground truth',
      body:
        'All four units, red and blue together. This is the God’s-eye view: what is really there, regardless of who can see it.',
      say: 'No commander in a real operation ever has this view. It is the answer sheet.',
    },
    {
      id: 'blue',
      target: 'cop-canvas',
      placement: 'left',
      action: { type: 'cop-mode', value: 'blue_picture' },
      settleMs: 2500,
      title: 'Blue picture — what Blue can see',
      body:
        'Blue’s three units and their sensor envelopes. Notice what is missing: the red unit. It is still out there, unchanged — but it sits outside every Blue sensor, so it does not exist on this picture.',
      say: 'Blue is about to make decisions on this. Not on the previous view. On this one.',
    },
    {
      id: 'red',
      target: 'cop-canvas',
      placement: 'left',
      action: { type: 'cop-mode', value: 'red_fow' },
      settleMs: 2500,
      title: 'Red FoW — what Red can see',
      body:
        'Now the mirror image. Red’s single unit, and no trace of Blue’s three. Red is just as blind, and just as confident.',
      say: 'Two commanders. Two incompatible realities. One battlespace.',
    },
    {
      id: 'compare',
      target: 'cop-tabs',
      placement: 'bottom',
      action: { type: 'cop-mode', value: 'orbat' },
      settleMs: 1200,
      title: 'Toggle between them',
      body:
        'Switch ORBAT against Blue picture a few times. The difference between those two views is the intelligence gap — the thing counter-UAS work exists to close.',
      say: 'That gap is what we sell against. Everything else in Spectral is about shrinking it.',
    },
    {
      id: 'outro',
      target: null,
      placement: 'center',
      title: 'That is the model',
      body:
        'Detection drives the picture, the picture drives the decision, and the decision is only ever as good as the sensor that fed it. Spectrum View, the Defeat Matrix and Map Intel all feed the same engine.',
      say: 'Now let us look at what actually generates those detections.',
    },
  ],
}

export const TOURS: readonly Tour[] = [ARENA_FOG_OF_WAR_TOUR] as const

export function getTour(id: string): Tour | undefined {
  return TOURS.find((t) => t.id === id)
}

/** localStorage key recording that a tour has been completed or dismissed. */
export function tourSeenKey(tourId: string): string {
  return `spectral-tour-seen:${tourId}`
}
