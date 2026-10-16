import { MasterDetailLayout } from '../../../../../features/settings/master-detail';
import { PeersList } from './index';

/** Desktop: the list on the left, the open person on the right (see `MasterDetailLayout`). */
export default function PeersLayout() {
  return <MasterDetailLayout list={<PeersList />} />;
}
