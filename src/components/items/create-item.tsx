'use client';

import { createItem, State } from '@/lib/actions';
import ItemForm from '@/components/items/item-form';
import { useActionState } from 'react';

export default function Forms() {
    const initialState: State = { message: null, errors: {} };
    const [state, formAction] = useActionState(createItem, initialState);

  return (
    <ItemForm onSubmit={formAction} state={state} />
  );
}
