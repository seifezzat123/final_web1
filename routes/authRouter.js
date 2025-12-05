const express = require('express');
const { signUp, login, getMe } = require('../controller/auth_controller');
const { validateSignup } = require('../validators');

const authRouter = express.Router();

authRouter.post('/signup',validateSignup ,signUp);

authRouter.post('/login', login);
authRouter.get('/me', getMe);

module.exports = authRouter;