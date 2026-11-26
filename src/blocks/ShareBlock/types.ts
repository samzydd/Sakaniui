export interface SharePerson {
  /** The address the invitation goes to; also the person's identity (compared without case). */
  email: string;
  /** Shown instead of the address when you know it. */
  name?: string;
  /** A photo; without one the avatar shows an initial. */
  avatarSrc?: string;
}

/** Who can open the document: everyone with the link, or only the people who were invited. */
export type ShareAccess = 'anyone' | 'invited';

export interface ShareOwner {
  name?: string;
  avatarSrc?: string;
}
