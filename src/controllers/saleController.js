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
  
  try {
    const total_sum = items.reduce((s, i) => s + i.total_sum, 0);
    const debt_sum = total_sum - paid_sum;

    // 1. Sotuvni yaratish
    const saleRes = await db.query(`
      INSERT INTO sales (client_name, client_phone, total_sum, paid_sum, debt_sum, usd_rate)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id
    `, [client_name, client_phone, total_sum, paid_sum, debt_sum, usd_rate]);
    
    const saleId = saleRes.rows[0].id;

    // 2. Mahsulotlarni bog'lash va stokni kamaytirish
    for (let item of items) {
      await db.query(`
        INSERT INTO sale_items (sale_id, product_id, product_code, product_name, qty, unit, volume, price_per_unit_sum, total_sum)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      `, [saleId, item.product_id, item.product_code, item.product_name, item.qty, item.unit, item.volume, item.price_per_unit_sum, item.total_sum]);

      // Stokdan ayirish
      await db.query(`
        UPDATE products 
        SET quantity = quantity - $1, volume = volume - $2 
        WHERE id = $3
      `, [item.qty, item.volume, item.product_id]);
    }

    res.status(201).json({ id: saleId, client_name, total_sum, paid_sum, debt_sum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updateSale = async (req, res) => {
  const { id } = req.params;
  const { paid_sum } = req.body;
  try {
    const { rows } = await db.query('SELECT total_sum FROM sales WHERE id = $1', [id]);
    if (rows.length === 0) return res.status(404).json({ error: "Sotuv topilmadi" });
    
    const debt = rows[0].total_sum - paid_sum;
    await db.query('UPDATE sales SET paid_sum = $1, debt_sum = $2 WHERE id = $3', [paid_sum, debt, id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.returnItem = async (req, res) => {
  const { id: saleId } = req.params;
  const { item_id, return_qty, return_volume } = req.body;

  console.log(`🔄 [Return] Sale: ${saleId}, Item: ${item_id}, Qty To Return: ${return_qty}`);

  try {
    // 1. Element ma'lumotlarini olish
    const { rows: itemRows } = await db.query('SELECT * FROM sale_items WHERE id = $1', [item_id]);
    if (itemRows.length === 0) return res.status(404).json({ error: "Mahsulot topilmadi" });
    const item = itemRows[0];

    const qtyToReturn = parseFloat(return_qty) || 0;
    const volToReturn = parseFloat(return_volume) || 0;
    const price = parseFloat(item.price_per_unit_sum) || 0;
    const refundTotal = qtyToReturn * price;

    // Yangi qiymatlarni hisoblash
    const newQty = Math.max(0, item.qty - qtyToReturn);
    const newVol = Math.max(0, (item.volume || 0) - volToReturn);
    const newTotal = Math.max(0, item.total_sum - refundTotal);
    const newReturnedQty = (item.returned_qty || 0) + qtyToReturn;

    console.log(`📊 [Return] Current: ${item.qty}, Returning: ${qtyToReturn}, New: ${newQty}`);

    // 2. Sale Itemni yangilash
    await db.query(`
      UPDATE sale_items 
      SET qty = $1, 
          volume = $2, 
          total_sum = $3,
          returned_qty = $4
      WHERE id = $5
    `, [newQty, newVol, newTotal, newReturnedQty, item_id]);
    
    // 3. Umumiy sotuvni yangilash
    const { rows: saleRows } = await db.query('SELECT total_sum, debt_sum FROM sales WHERE id = $1', [saleId]);
    if (saleRows.length > 0) {
      const sale = saleRows[0];
      const newSaleTotal = Math.max(0, sale.total_sum - refundTotal);
      const newSaleDebt = Math.max(0, sale.debt_sum - refundTotal);
      
      await db.query(`
        UPDATE sales 
        SET total_sum = $1, 
            debt_sum = $2
        WHERE id = $3
      `, [newSaleTotal, newSaleDebt, saleId]);
    }

    // 4. Stokni oshirish
    await db.query(`
      UPDATE products 
      SET quantity = quantity + $1, 
          volume = volume + $2 
      WHERE id = $3
    `, [qtyToReturn, volToReturn, item.product_id]);

    res.json({ success: true });
  } catch (err) {
    console.error(`❌ [Return Error]:`, err.message);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteSale = async (req, res) => {
  const { id } = req.params;
  try {
    // Mahsulotlarni omborga qaytarish
    const { rows: items } = await db.query('SELECT * FROM sale_items WHERE sale_id = $1', [id]);
    for (let item of items) {
      const netQty = item.qty - item.returned_qty;
      const ratio = item.qty > 0 ? (netQty / item.qty) : 0;
      const netVol = item.volume * ratio;
      await db.query('UPDATE products SET quantity = quantity + $1, volume = volume + $2 WHERE id = $3', [netQty, netVol, item.product_id]);
    }
    
    await db.query('DELETE FROM sale_items WHERE sale_id = $1', [id]);
    await db.query('DELETE FROM sales WHERE id = $1', [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
