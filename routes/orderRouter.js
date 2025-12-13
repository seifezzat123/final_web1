const express = require('express');
const { createOrder, getAllOrders, getMyOrders, getOrderById, updateOrderStatus, getOrderItems } = require('../controller/order_controller');
const { verifyToken, verifyAdmin } = require('../controller/auth_controller');

const router = express.Router();

router.post('/', verifyToken, createOrder);
router.get('/', verifyAdmin, getAllOrders);
router.get('/my-orders', verifyToken, getMyOrders);
router.get('/:id', verifyToken, getOrderById);
router.get('/:id/items', verifyToken, getOrderItems);
router.put('/:id/status', verifyAdmin, updateOrderStatus);

module.exports = router;
