import Form from '@/components/items/create-item';
import Breadcrumbs from '@/components/breadcrumbs';
 
export default async function Page() {
 
  return (
    <main>
      <Breadcrumbs
        breadcrumbs={[
          { label: 'Items', href: '/dashboard/items' },
          {
            label: 'Create Item',
            href: '/dashboard/items/create',
            active: true,
          },
        ]}
      />
      <Form />
    </main>
  );
}