const express = require('express');

const analysisController = require('../controllers/analysis.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { jobIdParamSchema, idParamSchema } = require('../validators/analysis.validator');

const router = express.Router();

// NOTE: "/history" must be registered BEFORE "/:id" so it is not captured as an id.
router.post('/:jobId', protect, validate({ params: jobIdParamSchema }), analysisController.createAnalysis);
router.get('/history', protect, analysisController.getHistory);
router.get('/:id', protect, validate({ params: idParamSchema }), analysisController.getAnalysis);

module.exports = router;
