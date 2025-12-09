const express = require('express');
const { addFeedback, getAllFeedback, getMyFeedback, getFeedbackById, updateFeedback, deleteFeedback } = require('../controller/feedback_controller');
const { verifyToken, verifyAdmin } = require('../controller/auth_controller');

const router = express.Router();

router.post('/', verifyToken, addFeedback);

router.get('/', verifyAdmin, getAllFeedback);

router.get('/my-feedback', verifyToken, getMyFeedback);

router.get('/:id', verifyToken, getFeedbackById);

router.put('/:id', verifyToken, updateFeedback);

router.delete('/:id', verifyToken, deleteFeedback);

module.exports = router;
