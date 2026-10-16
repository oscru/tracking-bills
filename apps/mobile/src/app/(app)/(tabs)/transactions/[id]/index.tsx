import { useLocalSearchParams } from 'expo-router';

import { TransactionDetailView } from '../../../../../features/transactions/transaction-detail-view';

export default function TransactionDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <TransactionDetailView id={id} />;
}
