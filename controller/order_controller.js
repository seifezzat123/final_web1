const { db } = require('../db.js');

const createOrder = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Only buyers can create orders
  if (user.role !== 'buyer') {
    return res.status(403).json({ error: 'Access denied: only buyers can create orders' });
  }

  const { address_id, cart_id } = req.body;

  if (!address_id || !cart_id) {
    return res.status(400).json({ error: 'address_id and cart_id are required' });
  }

  // Check if address belongs to user
  db.get('SELECT ID FROM ADDRESS WHERE ID = ? AND USER_ID = ?', [address_id, user.id], (err, address) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!address) {
      return res.status(404).json({ error: 'Address not found or does not belong to you' });
    }

    // Get cart item(s) and calculate total price
    db.all(
      `SELECT C.ID, C.QUANTITY, M.PRICE FROM CART C 
       LEFT JOIN MEDICINE M ON C.MEDICINE_ID = M.ID 
       WHERE C.USER_ID = ?`,
      [user.id],
      (err, cartItems) => {
        if (err) {
          console.error(err);
          return res.status(500).json({ error: 'Database error' });
        }

        if (!cartItems || cartItems.length === 0) {
          return res.status(400).json({ error: 'Cart is empty' });
        }

        // Calculate total price
        let totalPrice = 0;
        cartItems.forEach(item => {
          totalPrice += item.QUANTITY * item.PRICE;
        });

        // Create order
        const query = `INSERT INTO ORDER_TABLE (USER_ID, ADDRESS_ID, CART_ID, TOTAL_PRICE, STATUS) 
                       VALUES (?, ?, ?, ?, ?)`;
        const params = [user.id, address_id, cart_id, totalPrice, 'pending'];

        db.run(query, params, function(err) {
          if (err) {
            console.error('DB insert error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          return res.status(201).json({
            status: 'success',
            message: 'Order created successfully',
            orderId: this.lastID,
            totalPrice: totalPrice,
          });
        });
      }
    );
  });
};

const getAllOrders = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Admin only
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: admins only' });
  }

  const query = `
    SELECT O.ID, O.USER_ID, O.ADDRESS_ID, O.CART_ID, O.TOTAL_PRICE, O.STATUS, O.CREATED_AT,
           U.EMAIL as BUYER_EMAIL, U.NAME as BUYER_NAME,
           A.STREET, A.BUILDING, A.FLOOR, A.APARTMENT
    FROM ORDER_TABLE O
    LEFT JOIN USER U ON O.USER_ID = U.ID
    LEFT JOIN ADDRESS A ON O.ADDRESS_ID = A.ID
    ORDER BY O.CREATED_AT DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ data: rows });
  });
};

const getMyOrders = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const query = `
    SELECT O.ID, O.ADDRESS_ID, O.TOTAL_PRICE, O.STATUS, O.CREATED_AT,
           A.STREET, A.BUILDING, A.FLOOR, A.APARTMENT
    FROM ORDER_TABLE O
    LEFT JOIN ADDRESS A ON O.ADDRESS_ID = A.ID
    WHERE O.USER_ID = ?
    ORDER BY O.CREATED_AT DESC
  `;

  db.all(query, [user.id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ data: rows });
  });
};

const getOrderById = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  let query = `
    SELECT O.ID, O.USER_ID, O.ADDRESS_ID, O.CART_ID, O.TOTAL_PRICE, O.STATUS, O.CREATED_AT,
           A.STREET, A.BUILDING, A.FLOOR, A.APARTMENT,
           C.QUANTITY, M.NAME as MEDICINE_NAME, M.PRICE
    FROM ORDER_TABLE O
    LEFT JOIN ADDRESS A ON O.ADDRESS_ID = A.ID
    LEFT JOIN CART C ON O.CART_ID = C.ID
    LEFT JOIN MEDICINE M ON C.MEDICINE_ID = M.ID
    WHERE O.ID = ?
  `;

  const params = [id];

  // If not admin, only allow viewing own orders
  if (user.role !== 'admin') {
    query += ` AND O.USER_ID = ?`;
    params.push(user.id);
  }

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({ data: rows });
  });
};

const updateOrderStatus = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Admin only
  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: admins only' });
  }

  const { id } = req.params;
  const { status } = req.body;

  const validStatuses = ['pending', 'confirmed', 'shipped', 'delivered', 'cancelled'];
  if (!status || !validStatuses.includes(status)) {
    return res.status(400).json({ error: `status must be one of: ${validStatuses.join(', ')}` });
  }

  db.run('UPDATE ORDER_TABLE SET STATUS = ? WHERE ID = ?', [status, id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    return res.json({ message: 'Order status updated successfully' });
  });
};

module.exports = { createOrder, getAllOrders, getMyOrders, getOrderById, updateOrderStatus };
