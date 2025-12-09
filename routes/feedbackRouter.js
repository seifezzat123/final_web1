const express = require('express');
const { addFeedback, getAllFeedback } = require('../controller/feedback_controller');
const { verifyToken, verifyAdmin } = require('../controller/auth_controller');

const router = express.Router();

router.post('/', verifyToken, addFeedback);

router.get('/', verifyAdmin, getAllFeedback);


module.exports = router;
