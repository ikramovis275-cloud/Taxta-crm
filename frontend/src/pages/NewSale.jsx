import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useCart } from '../context/CartContext';
import '../styles/NewSale.css';

export default function NewSale() {
  const { cart, clientName, setClientName, addToCart, removeFromCart, updateCartItem, clearCart, cartTotal } = useCart();
  const [clientPhone, setClientPhone] = useState('');
  const [paidSum, setPaidSum] = useState('');
  const [products, setProducts] = useState([]);
  const [usdRate, setUsdRate] = useState(12800);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(null);
  const receiptRef = useRef();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [prodRes, settingsRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings'),
      ]);
      setProducts(prodRes.data);
      setUsdRate(settingsRes.data.usd_rate);
      localStorage.setItem('usd_rate', String(settingsRes.data.usd_rate));
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(p => {
    const q = search.toLowerCase();
    return p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
  });

  const handleAddToCart = (product) => {
    const alreadyInCart = cart.find(c => c.product_id === product.id);
    if (alreadyInCart) {
      // Savatda allaqachon bor — faqat e'lon qilish
      return;
    } else {
      addToCart(product, '');
    }
  };

  const handleQtyChange = (item, newQty) => {
    // Bo'sh bo'lsa ham ruxsat — foydalanuvchi yozayotgan bo'lishi mumkin
    if (newQty === '' || newQty === null) {
      updateCartItem(item.product_id, '');
      return;
    }
    const qty = parseFloat(newQty);
    if (isNaN(qty) || qty < 0) return;
    const product = products.find(p => p.id === item.product_id);
    if (qty > product.quantity) return alert(`Omborda faqat ${Math.round(product.quantity)} ta bor!`);
    updateCartItem(item.product_id, qty);
  };

  const handlePriceChange = (item, newPrice) => {
    if (newPrice === '' || newPrice === null) {
      updateCartItem(item.product_id, item.qty, '');
      return;
    }
    const price = parseFloat(newPrice);
    if (isNaN(price) || price < 0) return;
    updateCartItem(item.product_id, item.qty, price);
  };

  const handleCompleteSale = async () => {
    if (!clientName.trim()) return alert("Klient ismini kiriting!");
    if (cart.length === 0) return alert("Savat bo'sh!");
    // Barcha miqdorlar kiritilganligini tekshirish
    const emptyQty = cart.find(item => !item.qty || parseFloat(item.qty) <= 0);
    if (emptyQty) return alert(`"${emptyQty.product_name}" uchun miqdor kiriting!`);
    
    const emptyPrice = cart.find(item => item.price_per_unit_sum === '' || parseFloat(item.price_per_unit_sum) < 0);
    if (emptyPrice) return alert(`"${emptyPrice.product_name}" uchun narx kiriting!`);
    setCompleting(true);
    try {
      const items = cart.map(item => ({
        product_id: item.product_id,
        product_code: item.product_code,
        product_name: item.product_name,
        qty: item.qty,
        unit: item.unit,
        volume: item.volume,
        price_per_unit_sum: item.price_per_unit_sum,
        total_sum: item.total_sum,
      }));
      const res = await api.post('/sales', { 
        client_name: clientName, 
        client_phone: clientPhone, 
        items, 
        usd_rate: usdRate, 
        // Agar bo'sh bo'lsa to'liq to'langan (full payment) deb hisoblaymiz
        paid_sum: paidSum === '' ? cartTotal : (parseFloat(paidSum) || 0) 
      });
      setShowReceipt({ ...res.data, items: cart.map(c => ({ ...c })) });
      clearCart();
      setClientPhone('');
      setPaidSum('');
      fetchData();
    } catch (err) {
      alert(err.response?.data?.error || 'Xatolik yuz berdi');
    } finally {
      setCompleting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Yuklanmoqda...</p></div>;

  // Receipt Modal
  if (showReceipt) {
    const receipt = showReceipt;
    const totalSum = receipt.items.reduce((s, i) => s + i.total_sum, 0);
    return (
      <div className="receipt-page">
        <div className="receipt-card" ref={receiptRef}>
          <div className="receipt-header">
            <div className="receipt-logo">🪵 Taxta CRM</div>
            <h2>Sotuv cheki</h2>
            <p className="receipt-date">{new Date().toLocaleString('uz-UZ')}</p>
          </div>
          <div className="receipt-client">
            <span>Klient:</span>
            <strong>{receipt.client_name}</strong>
          </div>
          <div className="receipt-divider"></div>
          <table className="receipt-table">
            <thead>
              <tr>
                <th>Mahsulot</th>
                <th>Miqdor</th>
                <th>Hajm (m³)</th>
                <th>Narx</th>
                <th>Jami</th>
              </tr>
            </thead>
            <tbody>
              {receipt.items.map((item, i) => (
                <tr key={i}>
                  <td>
                    <div className="receipt-product-name">{item.product_name}</div>
                    <div className="receipt-product-code">{item.product_code}</div>
                  </td>
                  <td>{item.qty} {item.unit}</td>
                  <td>{item.volume.toFixed(4)} m³</td>
                  <td>{item.price_per_unit_sum.toLocaleString()}</td>
                  <td><strong>{item.total_sum.toLocaleString()}</strong></td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="receipt-divider"></div>
          <div className="receipt-total">
            <div className="total-row">
              <span>Jami (so'm):</span>
              <strong className="total-sum">{Math.round(totalSum).toLocaleString()} so'm</strong>
            </div>
            {receipt.debt_sum > 0 && (
              <div className="total-row debt" style={{ color: '#ef4444' }}>
                <span>Qarz (so'm):</span>
                <strong>{Math.round(receipt.debt_sum).toLocaleString()} so'm</strong>
              </div>
            )}
            <div className="total-row secondary">
              <span>To'landi:</span>
              <span>{Math.round(receipt.paid_sum).toLocaleString()} so'm</span>
            </div>
            <div className="total-row secondary">
              <span>Jami ($):</span>
              <span>${(totalSum / usdRate).toFixed(2)}</span>
            </div>
            <div className="total-row secondary">
              <span>Dollar kursi:</span>
              <span>{usdRate.toLocaleString()} so'm</span>
            </div>
          </div>
          <div className="receipt-footer">
            <p>Xarid uchun rahmat! 🌟</p>
          </div>
        </div>
        <div className="receipt-actions no-print">
          <button className="btn-secondary" onClick={() => setShowReceipt(null)}>← Yangi sotuv</button>
          <button className="btn-primary" onClick={handlePrint}>🖨️ Chek chiqarish</button>
          <button className="btn-secondary" onClick={() => navigate('/sales')}>📋 Tarixga o'tish</button>
        </div>
      </div>
    );
  }

  return (
    <div className="new-sale-page">
      <div className="page-header">
        <div>
          <h1>🛒 Yangi Sotuv</h1>
          <p>Mahsulot tanlang va klientga chek bering</p>
        </div>
      </div>

      <div className="sale-layout">
        {/* LEFT: Products */}
        <div className="products-panel">
          <div className="panel-header">
            <h3>📦 Mahsulotlar ({filteredProducts.length})</h3>
            <div className="search-wrapper">
              <span>🔍</span>
              <input
                type="text"
                placeholder="Qidirish..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>
          <div className="products-grid">
            {filteredProducts.length === 0 ? (
              <div className="empty-products">Mahsulot topilmadi</div>
            ) : filteredProducts.map(p => {
              const inCart = cart.find(c => c.product_id === p.id);
              return (
                <div key={p.id} className={`product-card ${inCart ? 'in-cart' : ''}`}>
                  <div className="product-card-top">
                    <span className="product-code">{p.code}</span>
                    {inCart && <span className="in-cart-badge">✓ Savatda</span>}
                  </div>
                  <h4 className="product-card-name">{p.name}</h4>
                  <div className="product-card-info">
                    <span>📐 {p.dimensions}</span>
                    <span>📦 {Math.round(p.quantity)} {p.unit}</span>
                  </div>
                  <div className="product-card-price">
                    {(p.sale_price_dollar * usdRate).toLocaleString()} so'm
                    <span className="usd-price-small">${p.sale_price_dollar}</span>
                  </div>
                  <button
                    className="btn-add-cart"
                    onClick={() => handleAddToCart(p)}
                  >
                    {inCart ? '+ Yana qo\'shish' : "🛒 Savatga"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT: Cart */}
        <div className="cart-panel">
          <div className="cart-header">
            <h3>🧾 Savat</h3>
            {cart.length > 0 && (
              <button className="btn-clear-cart" onClick={clearCart}>🗑️ Tozalash</button>
            )}
          </div>

          <div className="client-inputs">
            <div className="client-input-wrapper">
              <label>👤 Klient ismi *</label>
              <input
                type="text"
                placeholder="Ismini kiriting..."
                value={clientName}
                onChange={e => setClientName(e.target.value)}
              />
            </div>
            <div className="client-input-wrapper">
              <label>📞 Telefon raqami</label>
              <input
                type="text"
                placeholder="+998 90 123 45 67"
                value={clientPhone}
                onChange={e => setClientPhone(e.target.value)}
              />
            </div>
          </div>

          {cart.length === 0 ? (
            <div className="cart-empty">
              <span className="cart-empty-icon">🛒</span>
              <p>Savat bo'sh</p>
              <small>Mahsulotni bosing va savatga qo'shing</small>
            </div>
          ) : (
            <>
              <div className="cart-items">
                {cart.map(item => (
                  <div key={item.product_id} className="cart-item">
                    <div className="cart-item-header">
                      <div>
                        <span className="cart-item-code">{item.product_code}</span>
                        <span className="cart-item-name">{item.product_name}</span>
                      </div>
                      <button className="cart-item-remove" onClick={() => removeFromCart(item.product_id)}>✕</button>
                    </div>
                    <div className="cart-item-volume">
                      📐 {item.volume.toFixed(4)} m³
                    </div>
                    <div className="cart-item-controls">
                      <div className="control-group">
                        <label>Miqdor ({item.unit})</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          value={item.qty}
                          placeholder="Son kiriting"
                          onChange={e => handleQtyChange(item, e.target.value)}
                        />
                      </div>
                      <div className="control-group">
                        <label>Narx (so'm)</label>
                        <input
                          type="number"
                          step="any"
                          value={item.price_per_unit_sum}
                          placeholder="Narxni kiriting"
                          onChange={e => handlePriceChange(item, e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="cart-item-total">
                      Jami: <strong>{Math.round(item.total_sum).toLocaleString()} so'm</strong>
                    </div>
                  </div>
                ))}
              </div>

                <div className="cart-summary">
                  <div className="cart-total-row">
                    <span>Jami (so'm):</span>
                    <strong className="cart-total-sum">{Math.round(cartTotal).toLocaleString()} so'm</strong>
                  </div>
                  
                  <div className="payment-input-area" style={{ marginTop: '1rem', borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
                    <label style={{ display: 'block', fontSize: '0.82rem', marginBottom: '0.5rem' }}>💰 To'langan summa (so'm)</label>
                    <input
                      type="number"
                      placeholder={`To'liq to'lansa: ${Math.round(cartTotal).toLocaleString()}`}
                      value={paidSum}
                      onChange={e => setPaidSum(e.target.value)}
                      style={{ 
                        width: '100%', 
                        background: 'var(--bg-primary)', 
                        border: '1px solid var(--border)', 
                        borderRadius: '6px', 
                        padding: '0.6rem',
                        color: 'var(--text-primary)'
                      }}
                    />
                    {paidSum !== '' && parseFloat(paidSum) < cartTotal && (
                      <div className="debt-indicator" style={{ color: '#f87171', fontSize: '0.85rem', marginTop: '0.5rem' }}>
                        🔴 Qarz: <strong>{(cartTotal - (parseFloat(paidSum) || 0)).toLocaleString()} so'm</strong>
                      </div>
                    )}
                  </div>
                  
                  <div className="cart-total-row secondary" style={{ marginTop: '1rem' }}>
                    <span>Jami ($):</span>
                    <span>${(cartTotal / usdRate).toFixed(2)}</span>
                  </div>
                </div>

              <button
                className="btn-complete-sale"
                onClick={handleCompleteSale}
                disabled={completing}
              >
                {completing ? '⏳ Yakunlanmoqda...' : '✅ Sotuvni yakunlash'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
