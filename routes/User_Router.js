const express = require('express');
const {
  createUser,
  retrieveAllUsers,
  addAddress,
  getAllAddresses,
  getAddressById,
  deleteAddress,
} = require('../controller/User_controller.js');

const { verifyAdmin, verifyToken } = require('../controller/auth_controller.js');


const userRouter = express.Router();

userRouter
 .route('/')
 .get(verifyAdmin, retrieveAllUsers)
 .post(verifyAdmin, createUser);
userRouter
 .route('/address')
 .post(verifyToken, addAddress);
userRouter.route('/address/all').get(verifyToken, getAllAddresses);
userRouter
  .route('/address/:id')
  .get(verifyToken, getAddressById)
  .delete(verifyToken, deleteAddress);

module.exports = userRouter;