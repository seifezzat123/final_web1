const express = require('express');
const {
  createUser,
  retrieveAllUsers,
} = require('../controller/User_controller.js');

const { verifyAdmin } = require('../controller/auth_controller.js'); // import it


const userRouter = express.Router();

// Apply verifyAdmin to all routes in this router
userRouter.use(verifyAdmin)

// All users
userRouter
  .route('/')
  .get(retrieveAllUsers)   // Get all users
  .post(createUser);       // Add new user

module.exports = userRouter;