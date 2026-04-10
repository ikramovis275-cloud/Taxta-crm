import { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/Products.css';

function parseDimensions(dimStr) {
  // Har ikkala belgini ham qabul qilish: '*' va 'x'
  const normalized = dimStr.replace(/x/gi, '*');
  const parts = normalized.split('*').map(s => parseFloat(s.trim()));
  if (parts.length !== 3 || parts.some(isNaN)) return null;
  const [l, w, h] = parts;
  return (l * w * h) / 10000; // dm³ → m³
}

const emptyForm = {
  code: '', name: '', dimensions: '',
  quantity: '', unit: 'dona',
  cost_price_dollar: '', sale_price_dollar: '',
};

export default function Products() {
  const [products, setProducts] = useState([]);
  const [usdRate, setUsdRate] = useState(12800);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [unitFilter, setUnitFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [prodRes, settingsRes] = await Promise.all([
        api.get('/products'),
        api.get('/settings'),
      ]);
      setProducts(prodRes.data);
      setUsdRate(settingsRes.data.usd_rate);
      localStorage.setItem('usd_rate', String(settingsRes.data.usd_rate));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInput = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const pieceVolume = parseDimensions(form.dimensions);
    if (!pieceVolume) return alert("Hajmni to'g'ri kiriting: masalan 300*15*3");
    const qty = parseFloat(form.quantity);
    const payload = {
      code: form.code, name: form.name, dimensions: form.dimensions,
      piece_volume: pieceVolume,
      volume: pieceVolume * qty,
      quantity: qty,
      unit: form.unit,
      cost_price_dollar: parseFloat(form.cost_price_dollar),
      sale_price_dollar: parseFloat(form.sale_price_dollar),
    };
    try {
      if (editingId) {
        await api.put(`/products/${editingId}`, payload);
      } else {
        await api.post('/products', payload);
      }
      setForm(emptyForm);
      setEditingId(null);
      setShowModal(false);
      fetchAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Xatolik yuz berdi');
    }
  };

  const handleEdit = (p) => {
    setForm({
      code: p.code, name: p.name, dimensions: p.dimensions,
      quantity: p.quantity, unit: p.unit,
      cost_price_dollar: p.cost_price_dollar,
      sale_price_dollar: p.sale_price_dollar,
    });
    setEditingId(p.id);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Mahsulotni o'chirishga ishonchingiz komilmi?")) return;
    await api.delete(`/products/${id}`);
    fetchAll();
  };

  const filtered = products.filter(p => {
    const q = search.toLowerCase();
    const matchSearch = p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q);
    const matchUnit = unitFilter === 'all' || p.unit === unitFilter;
    return matchSearch && matchUnit;
  });

  const totalVolume = products.reduce((s, p) => s + (p.volume || 0), 0);
  const totalQty = products.reduce((s, p) => s + (p.quantity || 0), 0);

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Yuklanmoqda...</p></div>;

  return (
    <div className="products-page">
      <div className="page-header">
        <div>
          <h1>📦 Mahsulotlar</h1>
          <p>Ombordagi barcha yog'och mahsulotlar</p>
        </div>
        <button className="btn-primary" onClick={() => { setForm(emptyForm); setEditingId(null); setShowModal(true); }}>
          + Yangi mahsulot
        </button>
      </div>

      {/* Summary */}
      <div className="products-summary">
        <div className="summary-chip">📦 Jami: <strong>{products.length} xil</strong></div>
        <div className="summary-chip">🔢 Miqdor: <strong>{Math.round(totalQty)} dona</strong></div>
        <div className="summary-chip">📐 Hajm: <strong>{totalVolume.toFixed(3)} m³</strong></div>
      </div>

      {/* Filters */}
      <div className="filters-bar">
        <div className="search-wrapper">
          <span>🔍</span>
          <input
            type="text"
            placeholder="Kod yoki nomi bo'yicha qidirish..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="filter-tabs">
          {['all', 'dona', 'pachka'].map(u => (
            <button
              key={u}
              className={`filter-tab ${unitFilter === u ? 'active' : ''}`}
              onClick={() => setUnitFilter(u)}
            >
              {u === 'all' ? 'Barchasi' : u === 'dona' ? 'Dona' : 'Pachka'}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Kod</th>
              <th>Nomi</th>
              <th>O'lchami</th>
              <th>Birlik hajm</th>
              <th>Jami hajm (m³)</th>
              <th>Miqdor</th>
              <th>Tannarxi</th>
              <th>Sotuv narxi</th>
              <th>Amallar</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="9" className="empty-row">Mahsulot topilmadi</td></tr>
            ) : filtered.map(p => (
              <tr key={p.id}>
                <td><span className="code-badge">{p.code}</span></td>
                <td><strong>{p.name}</strong></td>
                <td>{p.dimensions}</td>
                <td>{p.piece_volume?.toFixed(4)} m³</td>
                <td><span className="volume-badge">{(p.volume || 0).toFixed(3)}</span></td>
                <td>{Math.round(p.quantity)} {p.unit}</td>
                <td>
                  <div className="price-cell">
                    <span>{(p.cost_price_dollar * usdRate).toLocaleString()} so'm</span>
                    <span className="usd-price">${p.cost_price_dollar}</span>
                  </div>
                </td>
                <td>
                  <div className="price-cell">
                    <span className="sale-price">{(p.sale_price_dollar * usdRate).toLocaleString()} so'm</span>
                    <span className="usd-price">${p.sale_price_dollar}</span>
                  </div>
                </td>
                <td>
                  <div className="action-btns">
                    <button className="btn-edit" onClick={() => handleEdit(p)}>✏️</button>
                    <button className="btn-delete" onClick={() => handleDelete(p.id)}>🗑️</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingId ? "✏️ Mahsulotni tahrirlash" : "➕ Yangi mahsulot"}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Kod *</label>
                  <input name="code" value={form.code} onChange={handleInput} placeholder="Masalan: P001" required disabled={!!editingId} />
                </div>
                <div className="form-group">
                  <label>Turi</label>
                  <select name="unit" value={form.unit} onChange={handleInput}>
                    <option value="dona">Dona</option>
                    <option value="pachka">Pachka</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Nomi *</label>
                <input name="name" value={form.name} onChange={handleInput} placeholder="Masalan: Pol taxta" required />
              </div>
              <div className="form-group">
                <label>O'lchami (uzunlik * kenglik * qalinlik) *</label>
                <input name="dimensions" value={form.dimensions} onChange={handleInput} placeholder="Masalan: 300*15*3" required />
                <small>Santimetrda kiriting (masalan: 300*15*3)</small>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Miqdor *</label>
                  <input name="quantity" type="number" step="any" value={form.quantity} onChange={handleInput} placeholder="0" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Tannarxi (dollar) *</label>
                  <input name="cost_price_dollar" type="number" step="any" value={form.cost_price_dollar} onChange={handleInput} placeholder="0.00" required />
                </div>
                <div className="form-group">
                  <label>Sotuv narxi (dollar) *</label>
                  <input name="sale_price_dollar" type="number" step="any" value={form.sale_price_dollar} onChange={handleInput} placeholder="0.00" required />
                </div>
              </div>
              <div className="form-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Bekor qilish</button>
                <button type="submit" className="btn-primary">{editingId ? 'Saqlash' : "Qo'shish"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
