import { MasterDetailLayout } from '../../../../../features/settings/master-detail';
import { TagsList } from './index';

/** Desktop: the list on the left, the open tag on the right (see `MasterDetailLayout`). */
export default function TagsLayout() {
  return <MasterDetailLayout list={<TagsList />} />;
}
