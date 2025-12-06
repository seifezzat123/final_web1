const express = require('express');
const { createOrder, getAllOrders, getMyOrders, getOrderById, updateOrderStatus } = require('../controller/order_controller');
const { verifyToken, verifyAdmin } = require('../controller/auth_controller');

const router = express.Router();

router.post('/', verifyToken, createOrder);
router.get('/', verifyAdmin, getAllOrders);
router.get('/my-orders', verifyToken, getMyOrders);
router.get('/:id', verifyToken, getOrderById);
router.put('/:id/status', verifyAdmin, updateOrderStatus);
router.post('/', verifyToken, createOrder);

router.get('/', verifyAdmin, getAllOrders);

router.get('/my-orders', verifyToken, getMyOrders);

router.get('/:id', verifyToken, getOrderById);

router.put('/:id/status', verifyAdmin, updateOrderStatus);

module.exports = router;
