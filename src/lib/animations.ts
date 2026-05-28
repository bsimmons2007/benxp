import { animate, createTimeline, stagger } from 'animejs'

// Stagger direct children of a page container on route mount.
// Called from PageWrapper — replaces the CSS pageEnter keyframe.
export function animatePageEnter(container: HTMLElement): void {
  const items = Array.from(container.children) as HTMLElement[]
  if (!items.length) return
  animate(items, {
    opacity:    [0, 1],
    translateY: [18, 0],
    duration:   400,
    delay:      stagger(60),
    ease:       'outQuart',
  })
}

// Stagger streak dots in from the left with a bouncy pop.
export function animateStreakDots(dots: HTMLElement[]): void {
  if (!dots.length) return
  animate(dots, {
    scale:   [0.3, 1],
    opacity: [0, 1],
    duration: 380,
    delay:   stagger(55),
    ease:    'spring(1, 90, 12, 0)',
  })
}

// Stagger the widget/stat grid cards in.
export function animateWidgets(widgets: HTMLElement[]): void {
  if (!widgets.length) return
  animate(widgets, {
    translateY: [22, 0],
    opacity:    [0, 1],
    duration:   420,
    delay:      stagger(55),
    ease:       'outQuart',
  })
}

// Level-up overlay: full sequenced timeline.
export function animateLevelUpOverlay(els: {
  ring:     HTMLElement
  levelNum: HTMLElement
  label:    HTMLElement
  title:    HTMLElement
  hint:     HTMLElement
}): void {
  const { ring, levelNum, label, title, hint } = els

  createTimeline()
    // Ring pops in with rotation spring
    .add(ring, {
      scale:   [0.15, 1],
      opacity: [0, 1],
      rotate:  ['-20deg', '0deg'],
      duration: 700,
      ease:    'spring(1, 65, 12, 0)',
    })
    // Level number scales up with overshoot
    .add(levelNum, {
      scale:   [0.3, 1.2, 1],
      opacity: [0, 1],
      duration: 520,
      ease:    'outBack(2.8)',
    }, '-=500')
    // "LEVEL UP" label slides up
    .add(label, {
      translateY: [14, 0],
      opacity:    [0, 1],
      duration:   340,
      ease:       'outCubic',
    }, '-=100')
    // Title slides up slightly after
    .add(title, {
      translateY: [16, 0],
      opacity:    [0, 1],
      duration:   340,
      ease:       'outCubic',
    }, '-=220')
    // Hint fades in last
    .add(hint, {
      opacity:  [0, 1],
      duration: 280,
    }, '+=80')
}
