import Form from '@/components/items/edit-item';
import Breadcrumbs from '@/components/breadcrumbs';
import { fetchItemById } from '@/lib/actions';
import { notFound } from 'next/navigation';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const id = params.id;
  const item = await fetchItemById(id);
  
  if (!item) {
    notFound();
  }
  
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Items', href: '/dashboard/items' },
          {
            label: 'Edit Item',
            href: `/dashboard/items/${id}/edit`,
            active: true,
          },
        ]}
      />
      <Form  item={item} />
    </main>
  );
}