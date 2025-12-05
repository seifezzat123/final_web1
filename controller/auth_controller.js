const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { db } = require('../db.js');

const signToken = (id, role) => {
    return jwt.sign({id, role}, process.env.JWT_SECRET, {expiresIn: process.env.JWT_EXPIRES_IN});
}

// POST /signup
const signUp = (req, res) => {
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  const role = 'user'; 

  if (!email || !password || !name) {
    return res.status(400).send('Please provide email, password and name.');
  }

  bcrypt.hash(password, 10, (err, hashedPassword) => {
    if (err) {
      console.error(err);
      return res.status(500).send('Error hashing password.');
    }

    // Insert
    const query = `
      INSERT INTO USER (NAME, EMAIL, ROLE, PASSWORD)
      VALUES (?,?,?,?)
    `;
    const params = [name, email, role, hashedPassword];

    db.run(query, params, function(err) {
      if (err) {
        // Handle unique constraint violation
        if (err.message.includes('UNIQUE constraint')) {
          return res.status(400).send('Email already exists.');
        }
        console.error(err);
        return res.status(500).send('Database error.');
      }

      // Create token
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

  const query = `SELECT * FROM USER WHERE EMAIL='${email}'`;

  db.get(query, (err, row) => {
    if (err) {
      console.log(err);
      return res.status(500).send('Database error');
    }

    if (!row) {
      return res.status(401).send('Invalid credentials');
    }

    // Compare the hashed password
    bcrypt.compare(password, row.PASSWORD, (err, isMatch) => {
      if (err) {
        console.error(err);
        return res.status(500).send('Error verifying password.');
      }

      if (!isMatch) {
        return res.status(401).send('Invalid credentials');
      }

      // Generate JWT token for successful login
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

// --- VERIFY TOKEN MIDDLEWARE ---
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
  
  if (!token) return res.jason({ user});
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


module.exports = { signUp, login, verifyToken, verifyAdmin, getMe };