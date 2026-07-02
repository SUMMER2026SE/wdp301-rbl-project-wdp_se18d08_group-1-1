const express = require('express');
const {
  acceptPolicy,
  getAcceptanceStatus,
  getPublishedPolicyBySlug,
  getPublishedPolicyVersion,
  listPublishedPolicies,
} = require('../controllers/policyController');
const { protect, authorize } = require('../middlewares/authMiddleware');

const router = express.Router();

router.get('/acceptance-status', protect, authorize('customer'), getAcceptanceStatus);
router.post('/:policyId/accept', protect, authorize('customer'), acceptPolicy);

router.get('/', listPublishedPolicies);
router.get('/:slug/versions/:versionNumber', getPublishedPolicyVersion);
router.get('/:slug', getPublishedPolicyBySlug);

module.exports = router;
