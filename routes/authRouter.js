const express = require('express');
const { signUp, login, getMe, getUserById, updateUser, deleteUser, logout } = require('../controller/auth_controller');
const { validateSignup } = require('../validators');
const { verifyToken, verifyAdmin } = require('../controller/auth_controller');

const authRouter = express.Router();

// Middleware to optionally verify token (doesn't fail if no token)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const jwt = require('jsonwebtoken');
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = { id: decoded.id, role: decoded.role };
    } catch (err) {
      // Token invalid, but we continue anyway for public signup
    }
  }
  next();
};

authRouter.post('/signup', optionalAuth, validateSignup, signUp);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', verifyToken, getMe);

authRouter.get('/user/:id', verifyToken, getUserById);
authRouter.put('/user/:id', verifyToken, updateUser);
authRouter.delete('/user/:id', verifyAdmin, deleteUser);

module.exports = authRouter;