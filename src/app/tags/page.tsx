
import { fetchItemsByIds } from '@/lib/actions';
import { PrintItemsDisplay } from '@/components/items/print-items-display';

export default async function Page(props: {
  searchParams?: Promise<{
    ids?: string;
  }>;
}) {
  const params = await props.searchParams;
  const ids = params?.ids?.split(',') || [];
  const selectedItems = await fetchItemsByIds(ids);

  return (
    <PrintItemsDisplay items={selectedItems} />
  );
}
