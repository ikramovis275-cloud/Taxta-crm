import { createContext, useContext, useState } from 'react';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const [cart, setCart] = useState([]);
  const [clientName, setClientName] = useState('');

  const addToCart = (product, qty) => {
    const existing = cart.find(item => item.product_id === product.id);
    const rate = parseFloat(localStorage.getItem('usd_rate') || 12800);
    const pricePerUnit = product.sale_price_dollar * rate;
    const numQty = parseFloat(qty) || 0;
    
    if (existing) {
      // Agar allaqachon savatda bo'lsa — almashtirmaymiz
      return;
    } else {
      setCart([...cart, {
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        unit: product.unit,
        piece_volume: product.piece_volume,
        qty: qty,  // bo'sh string yoki son
        volume: numQty * product.piece_volume,
        price_per_unit_sum: '', // Boshlang'ich narx bo'sh bo'lsin
        total_sum: 0,
        sale_price_dollar: product.sale_price_dollar,
        max_qty: product.quantity,
      }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  const updateCartItem = (productId, qty, customPriceSom) => {
    setCart(cart.map(item => {
      if (item.product_id === productId) {
        const rawPrice = customPriceSom !== undefined ? customPriceSom : item.price_per_unit_sum;
        const numPrice = parseFloat(rawPrice) || 0;
        const numQty = parseFloat(qty) || 0;
        return {
          ...item,
          qty: qty,  // saqlash — bo'sh string bo'lishi mumkin
          volume: numQty * item.piece_volume,
          price_per_unit_sum: rawPrice,
          total_sum: numQty * numPrice,
        };
      }
      return item;
    }));
  };

  const clearCart = () => {
    setCart([]);
    setClientName('');
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.total_sum, 0);

  return (
    <CartContext.Provider value={{
      cart, clientName, setClientName,
      addToCart, removeFromCart, updateCartItem,
      clearCart, cartTotal
    }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
