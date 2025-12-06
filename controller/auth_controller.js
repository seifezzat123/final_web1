const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../db.js');

const signToken = (id, role) => {
    return jwt.sign({id, role}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
}

const signUp = (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const role = req.body.role || 'buyer'; 


  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }

  if (!['buyer', 'seller'].includes(role)) {
    return res.status(400).json({ error:` role must be "buyer" or "seller", received: ${role}` });
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error hashing password.');
    }

    const query = `
      INSERT INTO USER (NAME, EMAIL, ROLE, PASSWORD)
      VALUES (?,?,?,?)
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
        message: 'Registration successful',
        token,
      });
    });
  });
};

const login = (req, res) => {
  const email = req.body.email;
  const password = req.body.password;

  if (!email || !password) {
    return res.status(400).send('Please provide email and password.');
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const query = `SELECT * FROM USER WHERE EMAIL = ?`;

  db.get(query, [normalizedEmail], (err, row) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Database error');
    }

    if (!row) {
      return res.status(401).send('Invalid credentials');
    }

    bcrypt.compare(password, row.PASSWORD, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error verifying password.');
      }

      if (!isMatch) {
        return res.status(401).send('Invalid credentials');
      }

      const token = signToken(row.ID, row.ROLE);

      return res.status(200).json({
        message: 'Login successful',
        user: {
          id: row.ID,
          email: row.EMAIL,
          role: row.ROLE,
        },
        token,
      });
    });
  });
};

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(403).send('Access denied: Token missing or malformed');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).send('Invalid or expired token');
    }

    req.user = { id: decoded.id, role: decoded.role };
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).send('Access denied: Admins only');
    }
    next();
  });
};

const getMe = (req, res) => {
  const token = req.cookies.jwt;
  
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    db.get(
      "SELECT * FROM USER WHERE ID = ?",
      [decoded.id],
      (err, user) => {
        if (err || !user) return res.json({ user: null });
        res.json({ user });
      }
    );
  } catch (err) {
    return res.json({ user: null });
  }
};

const getUserById = (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  // Admin can get any user, otherwise only themselves
  if (currentUser.role !== 'admin' && currentUser.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.get('SELECT ID, NAME, EMAIL, ROLE FROM USER WHERE ID = ?', [id], (err, user) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) return res.status(404).json({ error: 'User not found' });
    return res.json({ user });
  });
};

const updateUser = (req, res) => {
  const { id } = req.params;
  const { name, email } = req.body;
  const currentUser = req.user;

  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  // Admin can update any user, otherwise only themselves
  if (currentUser.role !== 'admin' && currentUser.id !== parseInt(id)) {
    return res.status(403).json({ error: 'Access denied' });
  }

  if (!name && !email) {
    return res.status(400).json({ error: 'At least name or email is required' });
  }

  const updates = [];
  const values = [];
  if (name) {
    updates.push('NAME = ?');
    values.push(name);
  }
  if (email) {
    updates.push('EMAIL = ?');
    values.push(email.toLowerCase().trim());
  }
  values.push(id);

  const query = `UPDATE USER SET ${updates.join(', ')} WHERE ID = ?`;

  db.run(query, values, function(err) {
    if (err) {
      if (err.message && err.message.includes('UNIQUE constraint')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json({ message: 'User updated successfully' });
  });
};

const deleteUser = (req, res) => {
  const { id } = req.params;
  const currentUser = req.user;

  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  // Admin only
  if (currentUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied: Admins only' });
  }

  db.run('DELETE FROM USER WHERE ID = ?', [id], function(err) {
    if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (this.changes === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ message: 'User deleted successfully' });
  });
};

const logout = (req, res) => {
  return res.json({ message: 'Logged out successfully' });
};

module.exports = { signUp, login, verifyToken, verifyAdmin, getMe, getUserById, updateUser, deleteUser, logout };