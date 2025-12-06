const express = require('express');
const { addToCart, getAllCarts, getMyCart, updateCartItem, removeFromCart } = require('../controller/cart_controller');
const { verifyToken, verifyAdmin } = require('../controller/auth_controller');

const router = express.Router();

router.post('/', verifyToken, addToCart);
router.get('/', verifyAdmin, getAllCarts);
router.get('/my-cart', verifyToken, getMyCart);
router.put('/:id', verifyToken, updateCartItem);
router.delete('/:id', verifyToken, removeFromCart);
router.post('/', verifyToken, addToCart);

router.get('/', verifyAdmin, getAllCarts);

router.get('/my-cart', verifyToken, getMyCart);

router.put('/:id', verifyToken, updateCartItem);

router.delete('/:id', verifyToken, removeFromCart);

module.exports = router;
