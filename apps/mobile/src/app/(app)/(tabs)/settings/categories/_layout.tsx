import { MasterDetailLayout } from '../../../../../features/settings/master-detail';
import { CategoriesList } from './index';

/** Desktop: the list on the left, the open category on the right (see `MasterDetailLayout`). */
export default function CategoriesLayout() {
  return <MasterDetailLayout list={<CategoriesList />} />;
}
