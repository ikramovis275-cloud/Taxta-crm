import { useState, useEffect } from 'react';
import api from '../api/axios';
import '../styles/Dashboard.css';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [usdRate, setUsdRate] = useState(12800);
  const [newRate, setNewRate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, settingsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/settings'),
      ]);
      setStats(statsRes.data);
      setUsdRate(settingsRes.data.usd_rate);
      setNewRate(String(settingsRes.data.usd_rate));
      localStorage.setItem('usd_rate', String(settingsRes.data.usd_rate));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateRate = async () => {
    const rate = parseFloat(newRate);
    if (!rate || rate <= 0) return alert("To'g'ri kurs kiriting!");
    try {
      await api.put('/settings/usd-rate', { rate });
      setUsdRate(rate);
      localStorage.setItem('usd_rate', String(rate));
      alert('✅ Dollar kursi yangilandi!');
    } catch {
      alert('Xatolik yuz berdi');
    }
  };

  if (loading) return (
    <div className="page-loading">
      <div className="spinner"></div>
      <p>Ma'lumotlar yuklanmoqda...</p>
    </div>
  );

  const statCards = [
    { label: "Jami mahsulotlar", value: stats?.totalProducts || 0, icon: '📦', color: 'blue', suffix: 'ta' },
    { label: "Jami sotuvlar", value: stats?.totalSales || 0, icon: '🛒', color: 'green', suffix: 'ta' },
    { label: "Ombor hajmi", value: (stats?.totalVolume || 0).toFixed(2), icon: '📐', color: 'purple', suffix: 'm³' },
    { label: "Jami daromad", value: Math.round(stats?.totalRevenue || 0).toLocaleString(), icon: '💰', color: 'orange', suffix: "so'm" },
  ];

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h1>📊 Bismillahi rohmanir rohim</h1>
          <p>Umumiy ko'rsatkichlar va statistika</p>
        </div>
      </div>

      {/* USD Rate Card */}
      <div className="rate-card">
        <div className="rate-info">
          <span className="rate-flag">💵</span>
          <div>
            <span className="rate-label">Joriy dollar kursi</span>
            <span className="rate-value">{usdRate.toLocaleString()} so'm</span>
          </div>
        </div>
        <div className="rate-update">
          <input
            type="number"
            value={newRate}
            onChange={e => setNewRate(e.target.value)}
            placeholder="Yangi kurs"
          />
          <button onClick={updateRate} className="btn-update-rate">Yangilash</button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid">
        {statCards.map((card, i) => (
          <div key={i} className={`stat-card stat-${card.color}`}>
            <div className="stat-icon">{card.icon}</div>
            <div className="stat-info">
              <span className="stat-value">{card.value}</span>
              <span className="stat-suffix">{card.suffix}</span>
              <span className="stat-label">{card.label}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Daily Sales Table */}
      {stats?.dailySales?.length > 0 && (
        <div className="daily-sales-section">
          <h2>📅 Kunlik sotuvlar</h2>
          <div className="table-wrapper">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Sana</th>
                  <th>Sotuvlar soni</th>
                  <th>Daromad (so'm)</th>
                  <th>Daromad ($)</th>
                </tr>
              </thead>
              <tbody>
                {stats.dailySales.map((day, i) => (
                  <tr key={i}>
                    <td><span className="date-badge">{day.date}</span></td>
                    <td>{day.count} ta</td>
                    <td className="amount-cell">{Math.round(day.total).toLocaleString()} so'm</td>
                    <td className="amount-cell">${(day.total / usdRate).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
