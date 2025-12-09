const express = require('express');
const { addMedicine, listMedicines, getMedicineById, updateMedicine, deleteMedicine } = require('../controller/medicine_controller');
const { verifyToken } = require('../controller/auth_controller');

const router = express.Router();

router.get('/', listMedicines);
router.post('/', verifyToken, addMedicine);
router.get('/:id', verifyToken, getMedicineById);
router.put('/:id', verifyToken, updateMedicine);
router.delete('/:id', verifyToken, deleteMedicine);

module.exports = router;
