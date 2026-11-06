const express = require('express');

const aiController = require('../controllers/ai.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { analysisIdParamSchema } = require('../validators/analysis.validator');

const router = express.Router();

// POST (not GET) on purpose: both endpoints GENERATE text on the fly,
// they do not read a stored field.
router.post(
  '/explain/:analysisId',
  protect,
  validate({ params: analysisIdParamSchema }),
  aiController.explainAnalysis
);

router.post(
  '/roadmap/:analysisId',
  protect,
  validate({ params: analysisIdParamSchema }),
  aiController.buildRoadmap
);

module.exports = router;
