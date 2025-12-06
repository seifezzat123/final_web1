const express = require('express');
const { signUp, login, getMe, getUserById, updateUser, deleteUser, logout } = require('../controller/auth_controller');
const { validateSignup } = require('../validators');
const { verifyToken, verifyAdmin } = require('../controller/auth_controller');

const authRouter = express.Router();

authRouter.post('/signup', validateSignup, signUp);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.get('/me', verifyToken, getMe);

authRouter.get('/user/:id', verifyToken, getUserById);
authRouter.put('/user/:id', verifyToken, updateUser);
authRouter.delete('/user/:id', verifyAdmin, deleteUser);

module.exports = authRouter;