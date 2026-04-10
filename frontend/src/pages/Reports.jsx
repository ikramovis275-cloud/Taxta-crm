import { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import api from '../api/axios';
import '../styles/Reports.css';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, ArcElement, Title, Tooltip, Legend, Filler
);

export default function Reports() {
  const [stats, setStats] = useState(null);
  const [sales, setSales] = useState([]);
  const [usdRate, setUsdRate] = useState(12800);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [statsRes, salesRes, settingsRes] = await Promise.all([
        api.get('/stats'),
        api.get('/sales'),
        api.get('/settings'),
      ]);
      setStats(statsRes.data);
      setSales(salesRes.data);
      setUsdRate(settingsRes.data.usd_rate);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Yuklanmoqda...</p></div>;

  const dailySales = stats?.dailySales?.slice().reverse() || [];

  const lineChartData = {
    labels: dailySales.map(d => d.date),
    datasets: [{
      label: "Kunlik daromad (so'm)",
      data: dailySales.map(d => d.total),
      borderColor: '#6c63ff',
      backgroundColor: 'rgba(108, 99, 255, 0.1)',
      fill: true,
      tension: 0.4,
      pointBackgroundColor: '#6c63ff',
      pointRadius: 5,
    }]
  };

  const barChartData = {
    labels: dailySales.map(d => d.date),
    datasets: [{
      label: "Sotuvlar soni",
      data: dailySales.map(d => d.count),
      backgroundColor: 'rgba(16, 185, 129, 0.8)',
      borderRadius: 8,
    }]
  };

  // Product breakdown from sales items
  const productMap = {};
  sales.forEach(sale => {
    (sale.items || []).forEach(item => {
      if (!productMap[item.product_name]) productMap[item.product_name] = 0;
      productMap[item.product_name] += item.total_sum;
    });
  });
  const sortedProducts = Object.entries(productMap).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const doughnutData = {
    labels: sortedProducts.map(([name]) => name),
    datasets: [{
      data: sortedProducts.map(([, sum]) => sum),
      backgroundColor: ['#6c63ff', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#ec4899'],
      borderWidth: 2,
      borderColor: '#1e1e2e',
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: '#a0aec0', font: { size: 12 } }
      },
    },
    scales: {
      x: { ticks: { color: '#718096' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      y: { ticks: { color: '#718096' }, grid: { color: 'rgba(255,255,255,0.05)' } },
    }
  };

  const doughnutOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom',
        labels: { color: '#a0aec0', padding: 15, font: { size: 11 } }
      }
    }
  };

  const totalRevenue = sales.reduce((s, sale) => s + sale.total_sum, 0);
  const avgSale = sales.length ? totalRevenue / sales.length : 0;

  return (
    <div className="reports-page">
      <div className="page-header">
        <div>
          <h1>📈 Hisobotlar va Grafiklar</h1>
          <p>Sotuvlar statistikasi va dinamikasi</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-icon" style={{background: 'rgba(108,99,255,0.15)'}}>💰</div>
          <div className="kpi-info">
            <span className="kpi-label">Jami daromad</span>
            <span className="kpi-value">{Math.round(totalRevenue).toLocaleString()}</span>
            <span className="kpi-unit">so'm</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background: 'rgba(16,185,129,0.15)'}}>🛒</div>
          <div className="kpi-info">
            <span className="kpi-label">Jami sotuvlar</span>
            <span className="kpi-value">{sales.length}</span>
            <span className="kpi-unit">ta</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background: 'rgba(245,158,11,0.15)'}}>📊</div>
          <div className="kpi-info">
            <span className="kpi-label">O'rtacha sotuv</span>
            <span className="kpi-value">{Math.round(avgSale).toLocaleString()}</span>
            <span className="kpi-unit">so'm</span>
          </div>
        </div>
        <div className="kpi-card">
          <div className="kpi-icon" style={{background: 'rgba(59,130,246,0.15)'}}>💵</div>
          <div className="kpi-info">
            <span className="kpi-label">Dollar ekvivalent</span>
            <span className="kpi-value">${(totalRevenue / usdRate).toFixed(0)}</span>
            <span className="kpi-unit">USD</span>
          </div>
        </div>
      </div>

      {/* Charts */}
      {dailySales.length > 0 ? (
        <div className="charts-grid">
          <div className="chart-card wide">
            <h3>📈 Kunlik daromad dinamikasi</h3>
            <Line data={lineChartData} options={chartOptions} />
          </div>
          <div className="chart-card wide">
            <h3>📊 Kunlik sotuvlar soni</h3>
            <Bar data={barChartData} options={chartOptions} />
          </div>
          {sortedProducts.length > 0 && (
            <div className="chart-card">
              <h3>🍩 Mahsulotlar bo'yicha daromad</h3>
              <Doughnut data={doughnutData} options={doughnutOptions} />
            </div>
          )}
          {sortedProducts.length > 0 && (
            <div className="chart-card">
              <h3>🏆 Top mahsulotlar</h3>
              <div className="top-products-list">
                {sortedProducts.map(([name, sum], i) => (
                  <div key={name} className="top-product-item">
                    <span className="rank">#{i + 1}</span>
                    <span className="product-name-report">{name}</span>
                    <div className="progress-bar-wrapper">
                      <div
                        className="progress-bar"
                        style={{ width: `${(sum / sortedProducts[0][1]) * 100}%` }}
                      ></div>
                    </div>
                    <span className="product-sum">{Math.round(sum).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="empty-state">
          <span>📈</span>
          <p>Grafik ko'rsatish uchun sotuvlar ma'lumoti kerak</p>
        </div>
      )}
    </div>
  );
}
