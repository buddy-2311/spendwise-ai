const express = require('express');
const router = express.Router();
const { generatePdfReport, generateExcelReport } = require('../controllers/reportController');
const { protect } = require('../middleware/authMiddleware');

router.get('/pdf', protect, generatePdfReport);
router.get('/excel', protect, generateExcelReport);

module.exports = router;
