// The weighted draw the world uses wherever it picks who speaks. Pure; safe anywhere.

/** `items` in a random order that favours the heavier ones, so its first n are
 *  a weighted sample without replacement. An item of weight zero sorts last. */
export function weightedOrder<T>(items: readonly T[], weight: (item: T) => number): T[] {
  return items
    .map((item) => ({ item, key: -Math.log(1 - Math.random()) / weight(item) }))
    .sort((a, b) => a.key - b.key)
    .map((x) => x.item);
}
