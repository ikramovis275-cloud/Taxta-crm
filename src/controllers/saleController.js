const db = require('../config/db');

exports.getSales = async (req, res) => {
  try {
    const { rows: sales } = await db.query('SELECT * FROM sales ORDER BY sold_at DESC');
    for (let sale of sales) {
      const { rows: items } = await db.query('SELECT * FROM sale_items WHERE sale_id = $1', [sale.id]);
      sale.items = items;
    }
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.createSale = async (req, res) => {
  const { client_name, client_phone, items, usd_rate, paid_sum } = req.body;
  
  if (!client_name || !items || items.length === 0) {
    return res.status(400).json({ error: "Klient ismi va mahsulotlar talab qilinadi" });
  }

  let totalSum = 0;
  items.forEach(item => { totalSum += Number(item.total_sum) || 0; });
  
  const numUsdRate = Number(usd_rate) || 12800;
  const numPaid = Number(paid_sum) || 0;
  const numDebtSum = totalSum - numPaid;

  try {
    const { rows: saleRows } = await db.query(`
      INSERT INTO sales (client_name, client_phone, total_sum, paid_sum, debt_sum, total_dollar, usd_rate)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id
    `, [client_name, client_phone, totalSum, numPaid, numDebtSum, totalSum / numUsdRate, numUsdRate]);

    const saleId = saleRows[0].id;

    for (const item of items) {
      await db.query(`
        INSERT INTO sale_items (sale_id, product_id, product_code, product_name, qty, unit, volume, price_per_unit_sum, total_sum)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [saleId, item.product_id, item.product_code, item.product_name, item.qty, item.unit, item.volume, item.price_per_unit_sum, item.total_sum]);

      // Update Inventory
      const { rows: productRows } = await db.query('SELECT * FROM products WHERE id = $1', [item.product_id]);
      const product = productRows[0];
      if (product) {
        const newQty = product.quantity - item.qty;
        const newVol = product.volume - item.volume;
        if (newQty <= 0) {
          await db.query('DELETE FROM products WHERE id = $1', [item.product_id]);
        } else {
          await db.query('UPDATE products SET quantity=$1, volume=$2, updated_at=CURRENT_TIMESTAMP WHERE id=$3', [newQty, newVol, item.product_id]);
        }
      }
    }

    const { rows: sale } = await db.query('SELECT * FROM sales WHERE id = $1', [saleId]);
    const { rows: saleItems } = await db.query('SELECT * FROM sale_items WHERE sale_id = $1', [saleId]);
    res.status(201).json({ ...sale[0], items: saleItems });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSalePayment = async (req, res) => {
  const { id } = req.params;
  const { paid_sum } = req.body;

  try {
    const { rows } = await db.query('SELECT total_sum FROM sales WHERE id = $1', [id]);
    const sale = rows[0];
    if (!sale) return res.status(404).json({ error: "Sotuv topilmadi" });

    const numPaid = Number(paid_sum);
    const debtSum = sale.total_sum - numPaid;

    await db.query('UPDATE sales SET paid_sum = $1, debt_sum = $2 WHERE id = $3', [numPaid, debtSum, id]);
    res.json({ message: "To'lov yangilandi", paid_sum: numPaid, debt_sum: debtSum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.returnItem = async (req, res) => {
  const { id } = req.params; // sale_id
  const { item_id, return_qty, return_volume } = req.body;

  try {
    const { rows: itemRows } = await db.query('SELECT * FROM sale_items WHERE id = $1 AND sale_id = $2', [item_id, id]);
    const item = itemRows[0];
    if (!item) return res.status(404).json({ error: "Mahsulot topilmadi" });

    if (return_qty > item.qty) return res.status(400).json({ error: "Qaytarish miqdori sotilganidan ko'p" });

    // Inventory Update
    await db.query('UPDATE products SET quantity = quantity + $1, volume = volume + $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
      [return_qty, return_volume, item.product_id]);

    const refundAmount = return_qty * item.price_per_unit_sum;

    if (item.qty - return_qty <= 0) {
      await db.query('DELETE FROM sale_items WHERE id = $1', [item_id]);
    } else {
      await db.query('UPDATE sale_items SET qty = qty - $1, volume = volume - $2, total_sum = total_sum - $3 WHERE id = $4',
        [return_qty, return_volume, refundAmount, item_id]);
    }

    const { rows: saleRows } = await db.query('SELECT * FROM sales WHERE id = $1', [id]);
    const sale = saleRows[0];
    const newTotalSum = sale.total_sum - refundAmount;
    let newPaidSum = sale.paid_sum;
    let newDebtSum = sale.debt_sum - refundAmount;

    if (newDebtSum < 0) {
      newPaidSum += newDebtSum;
      newDebtSum = 0;
    }

    await db.query('UPDATE sales SET total_sum = $1, total_dollar = $2, paid_sum = $3, debt_sum = $4 WHERE id = $5',
      [newTotalSum, newTotalSum / sale.usd_rate, newPaidSum, newDebtSum, id]);

    res.json({ message: "Mahsulot qaytarildi", new_total: newTotalSum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSale = async (req, res) => {
  const { id } = req.params;
  try {
    await db.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
    await db.query('DELETE FROM sales WHERE id = $1', [id]);
    res.json({ message: "Sotuv o'chirildi" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
