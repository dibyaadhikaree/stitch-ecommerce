import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type CartItem = {
  productId: string
  variantId: string
  name:      string
  sku:       string
  size:      string
  price:     number
  image:     string
  quantity:  number
}

type CartStore = {
  items:      CartItem[]
  isOpen:     boolean
  openCart:   () => void
  closeCart:  () => void
  addItem:    (item: Omit<CartItem, 'quantity'>) => void
  removeItem: (variantId: string) => void
  updateQty:  (variantId: string, qty: number) => void
  clearCart:  () => void
  totalItems: () => number
  totalPrice: () => number
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items:  [],
      isOpen: false,

      openCart:  () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),

      addItem: (newItem) => {
        const existing = get().items.find(i => i.variantId === newItem.variantId)
        if (existing) {
          set({
            items: get().items.map(i =>
              i.variantId === newItem.variantId
                ? { ...i, quantity: i.quantity + 1 }
                : i
            ),
          })
        } else {
          set({ items: [...get().items, { ...newItem, quantity: 1 }] })
        }
        set({ isOpen: true })
      },

      removeItem: (variantId) =>
        set({ items: get().items.filter(i => i.variantId !== variantId) }),

      updateQty: (variantId, qty) => {
        if (qty < 1) {
          get().removeItem(variantId)
          return
        }
        set({
          items: get().items.map(i =>
            i.variantId === variantId ? { ...i, quantity: qty } : i
          ),
        })
      },

      clearCart: () => set({ items: [] }),

      totalItems: () => get().items.reduce((s, i) => s + i.quantity, 0),
      totalPrice: () => get().items.reduce((s, i) => s + i.price * i.quantity, 0),
    }),
    { name: 'rych-cart' }
  )
)
