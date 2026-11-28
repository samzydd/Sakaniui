import owner from '../../assets/avatars/share-owner.jpg';
import chloe from '../../assets/avatars/share-chloe-wu.jpg';
import marco from '../../assets/avatars/share-marco-diaz.jpg';
import type { SharePerson } from './types';

/** The person whose avatar sits in the header (the document's owner). */
export const SAMPLE_OWNER = { name: 'Amara Okafor', avatarSrc: owner };

/** Everyone the demo can resolve an e-mail address to: typing one of these gives a name and a photo, anything else
 * is shown as the bare address with an initial. */
export const SAMPLE_DIRECTORY: SharePerson[] = [
  { email: 'chloe.wu@acme.com', name: 'Chloe Wu', avatarSrc: chloe },
  { email: 'marco.diaz@acme.com', name: 'Marco Diaz', avatarSrc: marco },
];
