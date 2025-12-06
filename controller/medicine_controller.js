const { db } = require('../db.js');

const addMedicine = (req, res) => {
  // req.user is set by verifyToken middleware
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Only seller or admin allowed
  if (!(user.role === 'seller' || user.role === 'admin')) {
    return res.status(403).json({ error: 'Access denied: only sellers or admins can add medicines' });
  }

  const { name, price, stock, expiry_date, description } = req.body;

  if (!name || price == null || stock == null) {
    return res.status(400).json({ error: 'name, price and stock are required' });
  }

  const query = `
    INSERT INTO MEDICINE (USER_ID, NAME, PRICE, STOCK, EXPIRY_DATE, DESCRIPTION)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  const params = [user.id, name, price, stock, expiry_date || null, description || null];

  db.run(query, params, function(err) {
    if (err) {
      console.error('DB insert error:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    return res.status(201).json({ status: 'success', message: 'Medicine added', medicineId: this.lastID });
  });
};

const listMedicines = (req, res) => {
  const query = `SELECT M.ID, M.USER_ID, M.NAME, M.PRICE, M.STOCK, M.EXPIRY_DATE, M.DESCRIPTION, U.EMAIL as ADDED_BY FROM MEDICINE M LEFT JOIN USER U ON M.USER_ID = U.ID`;
  db.all(query, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.status(200).json({ data: rows });
  });
};

const getMedicineById = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Only seller or admin allowed
  if (!(user.role === 'seller' || user.role === 'admin')) {
    return res.status(403).json({ error: 'Access denied: only sellers or admins can view medicines' });
  }

  const { id } = req.params;
  if (!id) {
    return res.status(400).json({ error: 'Medicine ID is required' });
  }

  const query = `SELECT M.ID, M.USER_ID, M.NAME, M.PRICE, M.STOCK, M.EXPIRY_DATE, M.DESCRIPTION, U.EMAIL as ADDED_BY FROM MEDICINE M LEFT JOIN USER U ON M.USER_ID = U.ID WHERE M.ID = ?`;
  
  db.get(query, [id], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Medicine not found' });
    }
    return res.status(200).json({ data: row });
  });
};

const updateMedicine = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (!(user.role === 'seller' || user.role === 'admin')) {
    return res.status(403).json({ error: 'Access denied: only sellers or admins can update medicines' });
  }

  const { id } = req.params;
  const { name, price, stock, expiry_date, description } = req.body;

  if (!name && price == null && stock == null && !expiry_date && !description) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  // Check if medicine exists and belongs to user (or user is admin)
  const checkQuery = `SELECT USER_ID FROM MEDICINE WHERE ID = ?`;
  db.get(checkQuery, [id], (err, medicine) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Check ownership (seller must own it, admin can update any)
    if (user.role === 'seller' && medicine.USER_ID !== user.id) {
      return res.status(403).json({ error: 'Access denied: you can only update your own medicines' });
    }

    // Build dynamic update query
    const updates = [];
    const values = [];
    if (name) {
      updates.push('NAME = ?');
      values.push(name);
    }
    if (price != null) {
      updates.push('PRICE = ?');
      values.push(price);
    }
    if (stock != null) {
      updates.push('STOCK = ?');
      values.push(stock);
    }
    if (expiry_date) {
      updates.push('EXPIRY_DATE = ?');
      values.push(expiry_date);
    }
    if (description) {
      updates.push('DESCRIPTION = ?');
      values.push(description);
    }
    values.push(id);

    const updateQuery = `UPDATE MEDICINE SET ${updates.join(', ')} WHERE ID = ?`;

    db.run(updateQuery, values, function(err) {
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.json({ message: 'Medicine updated successfully' });
    });
  });
};

const deleteMedicine = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (!(user.role === 'seller' || user.role === 'admin')) {
    return res.status(403).json({ error: 'Access denied: only sellers or admins can delete medicines' });
  }

  const { id } = req.params;

  // Check if medicine exists and belongs to user (or user is admin)
  const checkQuery = `SELECT USER_ID FROM MEDICINE WHERE ID = ?`;
  db.get(checkQuery, [id], (err, medicine) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Check ownership (seller must own it, admin can delete any)
    if (user.role === 'seller' && medicine.USER_ID !== user.id) {
      return res.status(403).json({ error: 'Access denied: you can only delete your own medicines' });
    }

    db.run(`DELETE FROM MEDICINE WHERE ID = ?`, [id], function(err) {
      if (err) {
        console.error('DB delete error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.json({ message: 'Medicine deleted successfully' });
    });
  });
};

module.exports = { addMedicine, listMedicines, getMedicineById, updateMedicine, deleteMedicine };
