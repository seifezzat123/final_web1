const { db } = require('../db.js');

const createOrder = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  // Only buyers can create orders
  if (user.role !== 'buyer') {
    return res.status(403).json({ error: 'Access denied: only buyers can create orders' });
  }

  const { street, building, floor, apartment } = req.body;

  if (!street || !building || !floor || !apartment) {
    return res.status(400).json({ error: 'street, building, floor, and apartment are required' });
  }

  // Step 1: Create address first
  const addressQuery = `INSERT INTO ADDRESS (USER_ID, STREET, BUILDING, FLOOR, APARTMENT) 
                        VALUES (?, ?, ?, ?, ?)`;
  
  db.run(addressQuery, [user.id, street, building, floor, apartment], function(err) {
    if (err) {
      console.error('Address creation error:', err);
      return res.status(500).json({ error: 'Failed to create address' });
    }
    
    const address_id = this.lastID;

    // Step 2: Get cart items and calculate total price
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

        // Step 3: Create order (use first cart item ID as cart_id for now)
        const cart_id = cartItems[0].ID;
        const orderQuery = `INSERT INTO ORDER_TABLE (USER_ID, ADDRESS_ID, CART_ID, TOTAL_PRICE, STATUS) 
                           VALUES (?, ?, ?, ?, ?)`;
        const params = [user.id, address_id, cart_id, totalPrice, 'pending'];

        db.run(orderQuery, params, function(err) {
          if (err) {
            console.error('Order creation error:', err);
            return res.status(500).json({ error: 'Database error' });
          }

          const order_id = this.lastID;

          // Step 4: Clear user's cart after successful order
          db.run('DELETE FROM CART WHERE USER_ID = ?', [user.id], (err) => {
            if (err) {
              console.error('Cart clear error:', err);
              // Don't fail the order if cart clear fails
            }

            return res.status(201).json({
              status: 'success',
              message: 'Order created successfully',
              orderId: order_id,
              totalPrice: totalPrice,
            });
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
