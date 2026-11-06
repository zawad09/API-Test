const express = require('express');

const recommendationController = require('../controllers/recommendation.controller');
const { protect } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { analysisIdParamSchema } = require('../validators/analysis.validator');

const router = express.Router();

router.get(
  '/:analysisId',
  protect,
  validate({ params: analysisIdParamSchema }),
  recommendationController.getRecommendations
);

module.exports = router;
