// Checks the browser makes before sending and the server makes again on
// arrival, written once so a form never accepts what the server refuses.
// Browser-safe.

/** A saved world's name: it is also a file name. */
export const WORLD_NAME = /^[A-Za-z0-9][A-Za-z0-9 _-]{0,39}$/;

/** X's limits on a profile's fields. */
export const PROFILE_LIMITS = { name: 50, bio: 160, location: 30, website: 100 } as const;

/** X accepts a bare domain as well as a full address. */
export function validWebsite(s: string): boolean {
  return /^(https?:\/\/)?[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?([/?#]\S*)?$/i.test(s);
}
