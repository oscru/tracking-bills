import { MasterDetailLayout } from '../../../../../features/settings/master-detail';
import { AccountsList } from './index';

/** Desktop: the list on the left, the open account on the right (see `MasterDetailLayout`). */
export default function AccountsLayout() {
  return <MasterDetailLayout list={<AccountsList />} />;
}
