/**
 * Animation Utilities for Lit Components
 * Apple-Inspired UI/UX Redesign
 *
 * Provides reusable animation directives and utilities
 * for creating spring-based animations in Lit components.
 */

import { directive, Part, DirectiveParameters } from 'lit/directive.js';

// ===========================================
// Spring Animation Configuration
// ===========================================

/**
 * Spring physics configuration
 * @see https://motion.dev/spring
 */
export interface SpringConfig {
  /** Stiffness (higher = snappier) */
  stiffness?: number;
  /** Damping (lower = more bounce) */
  damping?: number;
  /** Mass (higher = more inertia) */
  mass?: number;
}

/**
 * Preset spring configurations
 */
export const SPRING_PRESETS: Record<string, SpringConfig> = {
  /** Snappy spring - fast, minimal bounce */
  snappy: { stiffness: 500, damping: 30, mass: 1 },
  /** Bouncy spring - more overshoot */
  bouncy: { stiffness: 300, damping: 15, mass: 1.2 },
  /** Smooth spring - gentle, no bounce */
  smooth: { stiffness: 100, damping: 20, mass: 1 },
  /** Quick spring - very fast */
  quick: { stiffness: 600, damping: 25, mass: 0.8 },
};

// ===========================================
// Animation Directives
// ===========================================

/**
 * Creates a stagger delay class for list items
 * @param index - The item's index in the list
 * @param increment - Delay increment in ms (default: 40)
 *
 * @example
 * ```ts
 * html`
 *   ${items.map((item, i) => html`
 *     <div class=${stagger(i)}>${item.name}</div>
 *   `)}
 * `
 * ```
 */
export const stagger = directive((index: number, increment: number = 40) => (part: Part) => {
  const delay = (index % 12) * increment;
  part.setValue(`animation-delay: ${delay}ms;`);
});

/**
 * Applies a spring-in animation class
 * @param variant - The animation variant to use
 *
 * @example
 * ```ts
 * html`<div class=${springIn('snappy')}>Content</div>`
 * ```
 */
export const springIn = directive((
  variant: keyof typeof SPRING_PRESETS = 'snappy'
) => (part: Part) => {
  const classes = {
    snappy: 'animate-spring-in',
    bouncy: 'animate-spring-bouncy',
    smooth: 'animate-spring-smooth',
    quick: 'animate-spring-in',
  };
  part.setValue(classes[variant] || classes.snappy);
});

/**
 * Creates a page transition class
 * @param entering - Whether the page is entering (true) or exiting (false)
 *
 * @example
 * ```ts
 * html`<div class=${pageTransition(this.isEntering)}>Content</div>`
 * ```
 */
export const pageTransition = directive((entering: boolean) => (part: Part) => {
  part.setValue(entering ? 'page-enter' : 'page-exit');
});

/**
 * Creates a hover effect class
 * @param effect - The hover effect to apply
 *
 * @example
 * ```ts
 * html`<div class=${hoverEffect('lift')}>Card</div>`
 * ```
 */
export const hoverEffect = directive((
  effect: 'lift' | 'scale' | 'glow' | 'bounce' = 'lift'
) => (part: Part) => {
  const classes = {
    lift: 'hover-lift',
    scale: 'hover-scale',
    glow: 'hover-glow',
    bounce: 'hover-bounce',
  };
  part.setValue(classes[effect]);
});

// ===========================================
// Animation Utilities
// ===========================================

/**
 * Generates a CSS spring animation string
 * @param config - Spring configuration
 * @returns CSS cubic-bezier string (approximation)
 *
 * Note: True spring physics require JS animation libraries.
 * This provides a CSS approximation.
 */
export function springEasing(config: SpringConfig = {}): string {
  const { stiffness = 500, damping = 30, mass = 1 } = config;

  // Approximate spring physics as cubic-bezier
  // This is a simplified conversion
  if (stiffness >= 500 && damping <= 30) {
    return 'cubic-bezier(0.34, 1.56, 0.64, 1)'; // Bouncy
  } else if (stiffness >= 400 && damping <= 40) {
    return 'cubic-bezier(0.25, 1.25, 0.5, 1)'; // Slight bounce
  } else {
    return 'cubic-bezier(0.16, 1, 0.3, 1)'; // Smooth
  }
}

/**
 * Gets the stagger class name for an index
 * @param index - Item index
 * @returns CSS class name
 *
 * @example
 * ```ts
 * html`<div class=${staggerClass(3)}>Item</div>` // => 'stagger-4'
 * ```
 */
export function staggerClass(index: number): string {
  return `stagger-${(index % 12) + 1}`;
}

/**
 * Creates inline styles for staggered animation
 * @param index - Item index
 * @param increment - Delay per item in ms
 * @returns Style string
 */
export function staggerStyle(index: number, increment: number = 40): string {
  return `animation-delay: ${(index % 12) * increment}ms;`;
}

/**
 * Combines multiple animation classes
 * @param animations - Animation class names to combine
 * @returns Combined class string
 *
 * @example
 * ```ts
 * html`<div class=${combineAnimations('animate-spring-in', 'hover-lift')}>`
 * ```
 */
export function combineAnimations(...animations: string[]): string {
  return animations.filter(Boolean).join(' ');
}

// ===========================================
// TypeScript Types
// ===========================================

/**
 * Animation variant options
 */
export type AnimationVariant = keyof typeof SPRING_PRESETS;

/**
 * Hover effect options
 */
export type HoverEffect = 'lift' | 'scale' | 'glow' | 'bounce';

/**
 * Transition duration presets
 */
export const TRANSITION_DURATION = {
  instant: 0,
  fast: 120,
  normal: 200,
  slow: 350,
  slower: 500,
} as const;

/**
 * Easing function presets
 */
export const EASING = {
  linear: 'linear',
  ease: 'ease',
  easeIn: 'ease-in',
  easeOut: 'ease-out',
  easeInOut: 'ease-in-out',
  spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springSnappy: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  springSmooth: 'cubic-bezier(0.16, 1, 0.3, 1)',
} as const;

// ===========================================
// Lit Directive Base Class
// ===========================================

/**
 * Base class for custom animation directives
 */
export abstract class AnimationDirective {
  /**
   * Apply animation to an element
   */
  protected applyAnimation(
    element: Element,
    animationClass: string,
    options?: { duration?: number; delay?: number }
  ): void {
    element.classList.add(animationClass);

    if (options?.duration) {
      (element as HTMLElement).style.animationDuration = `${options.duration}ms`;
    }
    if (options?.delay) {
      (element as HTMLElement).style.animationDelay = `${options.delay}ms`;
    }
  }

  /**
   * Remove animation from an element
   */
  protected removeAnimation(element: Element, animationClass: string): void {
    element.classList.remove(animationClass);
    (element as HTMLElement).style.animationDuration = '';
    (element as HTMLElement).style.animationDelay = '';
  }
}

// ===========================================
// Re-exports
// ===========================================

export {
  SPRING_PRESETS as SPRING_DEFAULTS,
  type SpringConfig,
  type AnimationVariant as SpringAnimationVariant,
  type HoverEffect,
};
