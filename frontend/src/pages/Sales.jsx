import { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/Sales.css';

export default function Sales() {
  const [sales, setSales] = useState([]);
  const [usdRate, setUsdRate] = useState(12800);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [returnItem, setReturnItem] = useState(null);
  const [returnQty, setReturnQty] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [salesRes, settingsRes] = await Promise.all([
        api.get('/sales'),
        api.get('/settings'),
      ]);
      setSales(salesRes.data);
      setUsdRate(settingsRes.data.usd_rate);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnSubmit = async (e) => {
    e.preventDefault();
    if (!returnItem || !returnQty) return;
    try {
      const qty = parseFloat(returnQty);
      const ratio = qty / returnItem.qty;
      const vol = returnItem.volume * ratio;
      await api.post(`/sales/${expandedId}/return`, {
        item_id: returnItem.id,
        return_qty: qty,
        return_volume: vol
      });
      alert("Mahsulot qaytarildi va omborga qo'shildi!");
      setReturnItem(null);
      setReturnQty('');
      fetchAll();
    } catch (err) {
      alert("Xatolik: " + (err.response?.data?.error || err.message));
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Bu sotuvni o'chirishga ishonchingiz komilmi?")) return;
    await api.delete(`/sales/${id}`);
    fetchAll();
  };

  // Logic for filtering and grouping
  const filtered = sales.filter(s => {
    const q = search.toLowerCase();
    return s.client_name.toLowerCase().includes(q) ||
      s.items?.some(i => i.product_name.toLowerCase().includes(q));
  });

  const grouped = filtered.reduce((acc, sale) => {
    const date = new Date(sale.sold_at).toLocaleDateString('uz-UZ', { year: 'numeric', month: 'long', day: 'numeric' });
    if (!acc[date]) acc[date] = { sales: [], total: 0 };
    acc[date].sales.push(sale);
    acc[date].total += sale.total_sum;
    return acc;
  }, {});

  const totalPaid = sales.reduce((s, sale) => s + sale.paid_sum, 0);
  const totalDebtBalance = sales.reduce((s, sale) => s + sale.debt_sum, 0);

  // EXPORT logic (must be after grouped is defined)
  const exportToExcel = () => {
    const groupEntries = Object.entries(grouped);
    if (groupEntries.length === 0) return alert("Hisobot uchun ma'lumot yo'q!");

    let tableHtml = `
      <table border="1">
        <tr style="background-color: #4f46e5; color: #ffffff; font-weight: bold;">
          <th>Sana</th>
          <th>Klient</th>
          <th>Telefon</th>
          <th>Mahsulot</th>
          <th>Miqdor</th>
          <th>Hajm (m3)</th>
          <th>Jami (som)</th>
          <th>Tolanidi</th>
          <th>Qarz</th>
        </tr>
    `;

    // Only export latest day
    groupEntries.slice(0, 1).forEach(([date, group]) => {
      group.sales.forEach(sale => {
        sale.items.forEach((item, index) => {
          tableHtml += `
            <tr>
              <td>${index === 0 ? date : ''}</td>
              <td>${index === 0 ? sale.client_name : ''}</td>
              <td>${index === 0 ? (sale.client_phone || '') : ''}</td>
              <td>${item.product_name}</td>
              <td>${item.qty} ${item.unit}</td>
              <td>${item.volume?.toFixed(4) || ''}</td>
              <td>${index === 0 ? Math.round(sale.total_sum) : ''}</td>
              <td>${index === 0 ? Math.round(sale.paid_sum) : ''}</td>
              <td>${index === 0 ? Math.round(sale.debt_sum) : ''}</td>
            </tr>
          `;
        });
        tableHtml += '<tr style="background-color: #f1f5f9;"><td colspan="9"></td></tr>';
      });

      const dayPaid = group.sales.reduce((acc, s) => acc + s.paid_sum, 0);
      const dayDebt = group.sales.reduce((acc, s) => acc + s.debt_sum, 0);
      
      tableHtml += `
        <tr style="background-color: #e2e8f0; font-weight: bold;">
          <td colspan="6" style="text-align: right;">${date} Kassa (Naqd pul):</td>
          <td>${Math.round(dayPaid)}</td>
          <td colspan="2"></td>
        </tr>
        <tr style="background-color: #fee2e2; color: #ef4444; font-weight: bold;">
          <td colspan="6" style="text-align: right;">${date} Jami Qarz:</td>
          <td colspan="2"></td>
          <td>${Math.round(dayDebt)}</td>
        </tr>
        <tr><td colspan="9" style="height: 20px;"></td></tr>
      `;
    });

    tableHtml += '</table>';

    const blob = new Blob(['\ufeff', tableHtml], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Sotuvlar_Hisoboti_${new Date().toLocaleDateString().replace(/\//g, '.')}.xls`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Yuklanmoqda...</p></div>;

  return (
    <div className="sales-page">
      <div className="page-header">
        <div>
          <h1>📋 Sotuvlar tarixi</h1>
          <p>Barcha savdo operatsiyalarining ro'yxati</p>
        </div>
        <button className="btn-primary" onClick={exportToExcel}>
          📥 Excelga yuklash
        </button>
      </div>

      <div className="sales-summary-bar">
        <div className="summary-chip">🛒 Jami sotuvlar: <strong>{sales.length} ta</strong></div>
        <div className="summary-chip">💰 Kassa (Naqd pul): <strong style={{color: 'var(--accent2)'}}>{Math.round(totalPaid).toLocaleString()} so'm</strong></div>
        <div className="summary-chip">🔴 Jami qarz: <strong style={{color: 'var(--danger)'}}>{Math.round(totalDebtBalance).toLocaleString()} so'm</strong></div>
        <div className="summary-chip">💵 Dollar: <strong>${(totalPaid / usdRate).toFixed(2)}</strong></div>
      </div>

      <div className="search-wrapper" style={{marginBottom: '1.5rem'}}>
        <span>🔍</span>
        <input
          type="text"
          placeholder="Klient ismi yoki mahsulot bo'yicha qidirish..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="empty-state">
          <span>📋</span>
          <p>Hech qanday sotuv topilmadi</p>
        </div>
      ) : (
        Object.entries(grouped).map(([date, group]) => (
          <div key={date} className="day-group">
            <div className="day-header">
              <span className="day-date">📅 {date}</span>
              <span className="day-total">
                {group.sales.length} ta sotuv • 
                {Math.round(group.total).toLocaleString()} so'm
              </span>
            </div>

            {group.sales.map(sale => (
              <div key={sale.id} className={`sale-card ${sale.debt_sum > 0 ? 'debt-card' : ''}`}>
                <div className="sale-card-header" onClick={() => setExpandedId(expandedId === sale.id ? null : sale.id)}>
                  <div className="sale-client-info">
                    <div className="client-avatar" style={{ background: sale.debt_sum > 0 ? '#ef4444' : 'linear-gradient(135deg, var(--accent), #8b5cf6)' }}>
                      {sale.client_name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <strong>{sale.client_name}</strong>
                      {sale.client_phone && <span className="client-mini-phone">📞 {sale.client_phone}</span>}
                      <span className="sale-time">{new Date(sale.sold_at).toLocaleTimeString('uz-UZ')}</span>
                    </div>
                  </div>
                  <div className="sale-payment-status">
                    {sale.debt_sum > 0 ? (
                      <div className="debt-tag">🔴 Qarz: {Math.round(sale.debt_sum).toLocaleString()} so'm</div>
                    ) : (
                      <div className="paid-tag">✅ To'landi</div>
                    )}
                  </div>
                  <div className="sale-amount">
                    <strong>{Math.round(sale.total_sum).toLocaleString()} so'm</strong>
                    <span className="usd-price">${(sale.total_sum / usdRate).toFixed(2)}</span>
                  </div>
                  <div className="sale-actions">
                    <button className="btn-expand">{expandedId === sale.id ? '▲' : '▼'}</button>
                    <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleDelete(sale.id); }}>🗑️</button>
                  </div>
                </div>

                {expandedId === sale.id && sale.items && (
                  <div className="sale-items-list">
                    <table className="receipt-table-mini">
                      <thead>
                        <tr>
                          <th>Mahsulot</th>
                          <th>Miqdor</th>
                          <th>Hajm (m³)</th>
                          <th>Jami (so'm)</th>
                          <th>Amal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sale.items.map(item => (
                          <tr key={item.id}>
                            <td>{item.product_name}</td>
                            <td>{item.qty} {item.unit}</td>
                            <td>{item.volume?.toFixed(4)}</td>
                            <td><strong>{Math.round(item.total_sum).toLocaleString()}</strong></td>
                            <td>
                              <button 
                                className="btn-return" 
                                title="Qaytarish"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReturnItem(item);
                                  setReturnQty(item.qty);
                                }}
                              >
                                🔄 Qaytarish
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        ))
      )}
      {returnItem && (
        <div className="modal-overlay" onClick={() => setReturnItem(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>🔄 Mahsulotni qaytarish</h2>
              <button className="close-btn" onClick={() => setReturnItem(null)}>×</button>
            </div>
            <form onSubmit={handleReturnSubmit}>
              <div className="sale-mini-info">
                <p>📦 Mahsulot: <strong>{returnItem.product_name}</strong></p>
                <p>🔢 Sotilgan: <strong>{returnItem.qty} {returnItem.unit}</strong></p>
              </div>
              <div className="form-group">
                <label>Qancha qaytariladi? ({returnItem.unit})</label>
                <input 
                  type="number" 
                  step="any"
                  max={returnItem.qty}
                  value={returnQty} 
                  onChange={e => setReturnQty(e.target.value)} 
                  autoFocus
                  required 
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-cancel" onClick={() => setReturnItem(null)}>Bekor qilish</button>
                <button type="submit" className="btn-submit" style={{background: 'linear-gradient(135deg, #f59e0b, #d97706)'}}>
                  🔄 Qaytarishni tasdiqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
