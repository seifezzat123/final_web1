const { db } = require('../db.js');

const addToCart = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Only buyers can add to cart
  if (user.role !== 'buyer') {
    return res.status(403).json({ error: 'Access denied: only buyers can add to cart' });
  }

  const { medicine_id, quantity } = req.body;

  if (!medicine_id || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'medicine_id and quantity (>0) are required' });
  }

  // Check if medicine exists
  db.get('SELECT ID, STOCK FROM MEDICINE WHERE ID = ?', [medicine_id], (err, medicine) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!medicine) {
      return res.status(404).json({ error: 'Medicine not found' });
    }

    // Check if quantity is available
    if (quantity > medicine.STOCK) {
      return res.status(400).json({ error: `Only ${medicine.STOCK} items available in stock` });
    }

    // Insert into cart
    const query = `INSERT INTO CART (USER_ID, MEDICINE_ID, QUANTITY) VALUES (?, ?, ?)`;
    const params = [user.id, medicine_id, quantity];

    db.run(query, params, function(err) {
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Item added to cart',
        cartId: this.lastID,
      });
    });
  });
};

const getAllCarts = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Admin only
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: admins only' });
  }

  const query = `
    SELECT C.ID, C.USER_ID, C.MEDICINE_ID, C.QUANTITY, C.CREATED_AT, 
           U.EMAIL as BUYER_EMAIL, M.NAME as MEDICINE_NAME, M.PRICE
    FROM CART C
    LEFT JOIN USER U ON C.USER_ID = U.ID
    LEFT JOIN MEDICINE M ON C.MEDICINE_ID = M.ID
    ORDER BY C.CREATED_AT DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ data: rows });
  });
};

const getMyCart = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const query = `
    SELECT C.ID, C.MEDICINE_ID, C.QUANTITY, C.CREATED_AT,
           M.NAME as MEDICINE_NAME, M.PRICE, M.DESCRIPTION
    FROM CART C
    LEFT JOIN MEDICINE M ON C.MEDICINE_ID = M.ID
    WHERE C.USER_ID = ?
    ORDER BY C.CREATED_AT DESC
  `;

  db.all(query, [user.id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ data: rows });
  });
};

const updateCartItem = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { quantity } = req.body;

  if (!quantity || quantity <= 0) {
    return res.status(400).json({ error: 'quantity (>0) is required' });
  }

  // Check if cart item belongs to user
  db.get('SELECT MEDICINE_ID FROM CART WHERE ID = ? AND USER_ID = ?', [id, user.id], (err, cartItem) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!cartItem) {
      return res.status(404).json({ error: 'Cart item not found' });
    }

    // Check stock availability
    db.get('SELECT STOCK FROM MEDICINE WHERE ID = ?', [cartItem.MEDICINE_ID], (err, medicine) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (quantity > medicine.STOCK) {
        return res.status(400).json({ error: `Only ${medicine.STOCK} items available in stock` });
      }

      db.run('UPDATE CART SET QUANTITY = ? WHERE ID = ?', [quantity, id], function(err) {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }
        return res.json({ message: 'Cart item updated successfully' });
      });
    });
  });
};

const removeFromCart = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  db.run('DELETE FROM CART WHERE ID = ? AND USER_ID = ?', [id, user.id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Cart item not found' });
    }
    return res.json({ message: 'Item removed from cart' });
  });
};

module.exports = { addToCart, getAllCarts, getMyCart, updateCartItem, removeFromCart };
