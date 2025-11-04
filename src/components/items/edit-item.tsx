'use client';

import {  Item } from '@/lib/definitions';
import ItemForm from './item-form';
import { updateItem, State } from '@/lib/actions';
import { useActionState } from 'react';

export default function EditItemForm({
  item,
}: {
  item: Item;
}) {
  const initialState: State = { message: null, errors: {} };
  const updateItemWithId = updateItem.bind(null, item.id);
  const [state, formAction] = useActionState(updateItemWithId, initialState);
  return (
    <ItemForm item={item} onSubmit={formAction} state={state} />
  );
}
