export type CartItem = {
  id: string;
  name: string;
  price: number;
  quantity?: number;
};

const KEY = 'inbrentory_cart_v1';

function safeParse(raw: string | null) {
  if (!raw) return [] as CartItem[];
  try {
    return JSON.parse(raw) as CartItem[];
  } catch (e) {
    console.error('Failed to parse cart from localStorage', e);
    return [] as CartItem[];
  }
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  const raw = localStorage.getItem(KEY);
  return safeParse(raw);
}

function save(cart: CartItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(cart));
}

function emitUpdate() {
  if (typeof window === 'undefined') return;
  try {
    window.dispatchEvent(new CustomEvent('inbrentory:cart-updated'));
  } catch (e) {
    // ignore
  }
}

export function addToCart(item: CartItem) {
  if (typeof window === 'undefined') return;
  const cart = getCart();
  const existing = cart.find((c) => c.id === item.id);
  if (existing) {
    // Instead of incrementing quantity, notify the UI that the item is already in the cart
    try {
      window.dispatchEvent(new CustomEvent('inbrentory:cart-message', { detail: { message: `${item.name} is already in cart`, variant: 'error' } }));
    } catch (e) {
      // ignore
    }
    return;
  } else {
    cart.push({ ...item, quantity: item.quantity ?? 1 });
  }
  save(cart);
  emitUpdate();
}

export function removeFromCart(id: string) {
  if (typeof window === 'undefined') return;
  const cart = getCart().filter((c) => c.id !== id);
  save(cart);
  emitUpdate();
}

export function clearCart() {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(KEY);
  emitUpdate();
}

export default {
  getCart,
  addToCart,
  removeFromCart,
  clearCart,
};
