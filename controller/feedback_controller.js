const { db } = require('../db.js');

const addFeedback = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role !== 'buyer') {
    return res.status(403).json({ error: 'Access denied: only buyers can submit feedback' });
  }

  // Support both medicine feedback and order feedback
  const { medicine_id, rating, comment, order_id, order_quality, delivery_rating, comments } = req.body;

  // Medicine feedback
  if (medicine_id) {
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'rating must be between 1 and 5' });
    }

    db.get('SELECT ID FROM MEDICINE WHERE ID = ?', [medicine_id], (err, medicine) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!medicine) {
        return res.status(404).json({ error: 'Medicine not found' });
      }

      const query = `
        INSERT INTO MEDICINE_FEEDBACK (USER_ID, MEDICINE_ID, RATING, COMMENT)
        VALUES (?, ?, ?, ?)
      `;
      const params = [user.id, medicine_id, rating, comment || null];

      db.run(query, params, function(err) {
        if (err) {
          console.error('DB insert error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        return res.status(201).json({
          status: 'success',
          message: 'Feedback submitted successfully',
          feedbackId: this.lastID,
        });
      });
    });
  }
  // Order feedback
  else if (order_id) {
    if (!order_quality || !delivery_rating) {
      return res.status(400).json({ error: 'order_quality and delivery_rating are required' });
    }

    if (order_quality < 1 || order_quality > 5 || delivery_rating < 1 || delivery_rating > 5) {
      return res.status(400).json({ error: 'order_quality and delivery_rating must be between 1 and 5' });
    }

    db.get('SELECT ID FROM ORDER_TABLE WHERE ID = ? AND USER_ID = ?', [order_id, user.id], (err, order) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Database error' });
      }
      if (!order) {
        return res.status(404).json({ error: 'Order not found or does not belong to you' });
      }

      const query = `
        INSERT INTO FEEDBACK (USER_ID, ORDER_ID, ORDER_QUALITY, DELIVERY_RATING, COMMENTS)
        VALUES (?, ?, ?, ?, ?)
      `;
      const params = [user.id, order_id, order_quality, delivery_rating, comments || null];

      db.run(query, params, function(err) {
        if (err) {
          console.error('DB insert error:', err);
          return res.status(500).json({ error: 'Database error' });
        }

        return res.status(201).json({
          status: 'success',
          message: 'Feedback submitted successfully',
          feedbackId: this.lastID,
        });
      });
    });
  } else {
    return res.status(400).json({ error: 'Either medicine_id or order_id is required' });
  }
};

const getAllFeedback = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  if (user.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: admins only' });
  }

  // Get medicine feedback (what admin dashboard expects)
  const query = `
    SELECT MF.ID, MF.USER_ID, MF.MEDICINE_ID, MF.RATING, MF.COMMENT, MF.CREATED_AT,
           U.NAME as USER_NAME, U.EMAIL as USER_EMAIL,
           M.NAME as MEDICINE_NAME
    FROM MEDICINE_FEEDBACK MF
    LEFT JOIN USER U ON MF.USER_ID = U.ID
    LEFT JOIN MEDICINE M ON MF.MEDICINE_ID = M.ID
    ORDER BY MF.CREATED_AT DESC
  `;

  db.all(query, (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ data: rows });
  });
};

const getMyFeedback = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const query = `
    SELECT F.ID, F.ORDER_ID, F.ORDER_QUALITY, F.DELIVERY_RATING, F.COMMENTS, F.CREATED_AT
    FROM FEEDBACK F
    WHERE F.USER_ID = ?
    ORDER BY F.CREATED_AT DESC
  `;

  db.all(query, [user.id], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ data: rows });
  });
};

const getFeedbackById = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  let query = `
    SELECT F.ID, F.USER_ID, F.ORDER_ID, F.ORDER_QUALITY, F.DELIVERY_RATING, F.COMMENTS, F.CREATED_AT,
           U.EMAIL as USER_EMAIL, U.NAME as USER_NAME
    FROM FEEDBACK F
    LEFT JOIN USER U ON F.USER_ID = U.ID
    WHERE F.ID = ?
  `;

  const params = [id];

  if (user.role !== 'admin') {
    query += ` AND F.USER_ID = ?`;
    params.push(user.id);
  }

  db.get(query, params, (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Feedback not found' });
    }
    return res.json({ data: row });
  });
};

const updateFeedback = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;
  const { order_quality, delivery_rating, comments } = req.body;

  if (order_quality == null && delivery_rating == null && !comments) {
    return res.status(400).json({ error: 'At least one field is required to update' });
  }

  if ((order_quality != null && (order_quality < 1 || order_quality > 5)) || 
      (delivery_rating != null && (delivery_rating < 1 || delivery_rating > 5))) {
    return res.status(400).json({ error: 'Ratings must be between 1 and 5' });
  }

  db.get('SELECT USER_ID FROM FEEDBACK WHERE ID = ?', [id], (err, feedback) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (user.role !== 'admin' && feedback.USER_ID !== user.id) {
      return res.status(403).json({ error: 'Access denied: you can only update your own feedback' });
    }

    const updates = [];
    const values = [];
    if (order_quality != null) {
      updates.push('ORDER_QUALITY = ?');
      values.push(order_quality);
    }
    if (delivery_rating != null) {
      updates.push('DELIVERY_RATING = ?');
      values.push(delivery_rating);
    }
    if (comments) {
      updates.push('COMMENTS = ?');
      values.push(comments);
    }
    values.push(id);

    const updateQuery = `UPDATE FEEDBACK SET ${updates.join(', ')} WHERE ID = ?`;

    db.run(updateQuery, values, function(err) {
      if (err) {
        console.error('DB update error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.json({ message: 'Feedback updated successfully' });
    });
  });
};

const deleteFeedback = (req, res) => {
  const user = req.user;
  if (!user) return res.status(401).json({ error: 'Unauthorized' });

  const { id } = req.params;

  db.get('SELECT USER_ID FROM FEEDBACK WHERE ID = ?', [id], (err, feedback) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!feedback) {
      return res.status(404).json({ error: 'Feedback not found' });
    }

    if (user.role !== 'admin' && feedback.USER_ID !== user.id) {
      return res.status(403).json({ error: 'Access denied: you can only delete your own feedback' });
    }

    db.run('DELETE FROM FEEDBACK WHERE ID = ?', [id], function(err) {
      if (err) {
        console.error('DB delete error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.json({ message: 'Feedback deleted successfully' });
    });
  });
};

module.exports = { addFeedback, getAllFeedback, getMyFeedback, getFeedbackById, updateFeedback, deleteFeedback };
