import { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/Sales.css';

export default function Debtors() {
  const [debtors, setDebtors] = useState([]);
  const [usdRate, setUsdRate] = useState(12800);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSale, setSelectedSale] = useState(null);
  const [paymentAmount, setPaymentAmount] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [salesRes, settingsRes] = await Promise.all([
        api.get('/sales'),
        api.get('/settings'),
      ]);
      const filteredDebtors = salesRes.data.filter(s => s.debt_sum >= 1);
      setDebtors(filteredDebtors);
      setUsdRate(settingsRes.data.usd_rate);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentAmount);
    if (isNaN(amount) || amount <= 0) return alert("To'g'ri summa kiriting!");
    
    try {
      const newPaid = selectedSale.paid_sum + amount;
      if (newPaid > selectedSale.total_sum) {
         if (!confirm("Kiritilgan summa jami qarzdan ko'p. Davom etaymi?")) return;
      }
      
      await api.put(`/sales/${selectedSale.id}`, { paid_sum: newPaid });
      alert("To'lov qabul qilindi!");
      setSelectedSale(null);
      setPaymentAmount('');
      fetchAll();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.error || err.message));
    }
  };

  const filtered = debtors.filter(s => {
    const q = search.toLowerCase();
    return s.client_name.toLowerCase().includes(q) || 
           (s.client_phone && s.client_phone.includes(q));
  });

  const totalDebt = debtors.reduce((s, sale) => s + sale.debt_sum, 0);

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Yuklanmoqda...</p></div>;

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>🔴 Qarzdorlar Ro'yxati</h1>
          <p>Hali to'liq to'lanmagan sotuvlar ro'yxati</p>
        </div>
      </div>

      <div className="sales-summary-bar" style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
        <div className="summary-chip">👤 Qarzdorlar: <strong>{debtors.length} ta</strong></div>
        <div className="summary-chip">💰 Umumiy qarz: <strong style={{ color: '#ef4444' }}>{Math.round(totalDebt).toLocaleString()} so'm</strong></div>
        <div className="summary-chip">💵 Dollar ($): <strong>${(totalDebt / usdRate).toFixed(2)}</strong></div>
      </div>

      <div className="search-wrapper" style={{marginBottom: '1.5rem'}}>
        <span>🔍</span>
        <input
          type="text"
          placeholder="Ism yoki telefon bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Klient</th>
              <th>Telefon</th>
              <th>Sana</th>
              <th>Jami Summa</th>
              <th>To'langan</th>
              <th style={{ color: '#f87171' }}>Qolgan Qarz</th>
              <th>To'lov</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="empty-row">Qarzdorlar topilmadi</td></tr>
            ) : filtered.map(sale => (
              <tr key={sale.id}>
                <td><strong>{sale.client_name}</strong></td>
                <td>{sale.client_phone || '---'}</td>
                <td>{new Date(sale.sold_at).toLocaleDateString()}</td>
                <td>{Math.round(sale.total_sum).toLocaleString()}</td>
                <td>{Math.round(sale.paid_sum).toLocaleString()}</td>
                <td style={{ color: '#f87171', fontWeight: 'bold' }}>{Math.round(sale.debt_sum).toLocaleString()} so'm</td>
                <td>
                  <button className="btn-edit" title="To'lov qo'shish" onClick={() => setSelectedSale(sale)}>💰</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSale && (
        <div className="modal-overlay" onClick={() => setSelectedSale(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>💰 To'lovni yangilash</h2>
              <button className="close-btn" onClick={() => setSelectedSale(null)}>×</button>
            </div>
            <form onSubmit={handleUpdatePayment}>
              <div className="sale-mini-info">
                 <p>👤 Klient: <strong>{selectedSale.client_name}</strong></p>
                 <p>💵 Jami qarz: <strong style={{color: '#f87171'}}>{Math.round(selectedSale.debt_sum).toLocaleString()} so'm</strong></p>
              </div>
              <div className="form-group" style={{marginBottom: '0'}}>
                <label style={{display: 'block', marginBottom: '0.6rem', color: '#94a3b8', fontSize: '0.85rem'}}>Qancha to'laydi? (so'm)</label>
                <input 
                   type="number" 
                   value={paymentAmount} 
                   onChange={e => setPaymentAmount(e.target.value)} 
                   placeholder="Masalan: 50000" 
                   autoFocus 
                   required 
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setSelectedSale(null)}>Bekor qilish</button>
                <button type="submit" className="btn-submit">✅ To'lovni saqlash</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
