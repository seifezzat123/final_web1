const { db } = require('../db.js');
const bcrypt = require('bcryptjs');
const { signToken } = require('./auth_controller');

const retrieveAllUsers = (req, res) => {
  const query = `SELECT * FROM USER`;

  db.all(query, (err, rows) => {
    if (err) {
      console.log(err);
      return res.status(500).json({ message: 'Error retrieving users' });
    }
    return res.status(200).json({
      message: 'Users retrieved successfully',
      data: rows
    });
  });
};

const createUser = (req, res) => {
  const { name, email, role, password } = req.body;

  if (!name || !email || !role || !password) {
    return res.status(400).json({ message: 'name, email, role, and password are required' });
  }

  if (!['buyer', 'seller', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'role must be "buyer", "seller", or "admin"' });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error hashing password.');
      }
  
      const query = `
        INSERT INTO USER (NAME, EMAIL, ROLE, PASSWORD)
        VALUES (?, ?, ?, ?)
      `;
      const params = [name, email, role, hashedPassword];
  
      db.run(query, params, function(err) {
        if (err) {
          if (err.message.includes('UNIQUE constraint')) {
            return res.status(400).send('Email already exists.');
          }
          console.error(err);
          return res.status(500).send('Database error.');
        }
  
        const token = signToken(this.lastID, role);
        return res.status(201).json({
          status: 'success',
          message: 'User created successfully',
          token,
        });
      });
    });
};

const addAddress = (req, res) => {
  const userId = req.user && req.user.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  if (!street || !building || !floor || !apartment) {
    return res.status(400).json({ error: 'street, building, floor, and apartment are required' });
  }

  // Check if user exists
  db.get('SELECT ID FROM USER WHERE ID = ?', [userId], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const query = `
      INSERT INTO ADDRESS (USER_ID, STREET, BUILDING, FLOOR, APARTMENT)
      VALUES (?, ?, ?, ?, ?)
    `;
    const params = [userId, street, building, floor, apartment];

    db.run(query, params, function(err) {
      if (err) {
        console.error('DB insert error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      return res.status(201).json({
        status: 'success',
        message: 'Address added successfully',
        addressId: this.lastID,
      });
    });
  });
};

const getAllAddresses = (req, res) => {
  const userId = req.user && req.user.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = `SELECT * FROM ADDRESS WHERE USER_ID = ?`;

  db.all(query, [userId], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ data: rows });
  });
};

const getAddressById = (req, res) => {
  const { id } = req.params;
  const userId = req.user && req.user.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = `SELECT * FROM ADDRESS WHERE ID = ? AND USER_ID = ?`;

  db.get(query, [id, userId], (err, row) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!row) {
      return res.status(404).json({ error: 'Address not found' });
    }
    return res.json({ data: row });
  });
};

const deleteAddress = (req, res) => {
  const { id } = req.params;
  const userId = req.user && req.user.id;

  if (!userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const query = `DELETE FROM ADDRESS WHERE ID = ? AND USER_ID = ?`;

  db.run(query, [id, userId], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'Address not found' });
    }
    return res.json({ message: 'Address deleted successfully' });
  });
};

module.exports = {
  createUser,
  retrieveAllUsers,
  addAddress,
  getAllAddresses,
  getAddressById,
  deleteAddress,
};