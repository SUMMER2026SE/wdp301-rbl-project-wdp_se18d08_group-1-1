const express = require('express');
const {
  archivePolicy,
  createPolicy,
  createVersion,
  deletePolicy,
  getAdminPolicy,
  getPolicyAcceptances,
  listAdminPolicies,
  publishVersion,
  updatePolicy,
  updateVersion,
} = require('../controllers/policyController');
const {
  acceptanceQueryValidator,
  createPolicyValidator,
  policyMetadataValidator,
  policyVersionValidator,
} = require('../validators/policyValidator');

const router = express.Router();

router.get('/', listAdminPolicies);
router.post('/', createPolicyValidator, createPolicy);
router.get('/:id', getAdminPolicy);
router.put('/:id', policyMetadataValidator, updatePolicy);
router.post('/:id/versions', policyVersionValidator, createVersion);
router.put('/:id/versions/:versionId', policyVersionValidator, updateVersion);
router.post('/:id/versions/:versionId/publish', publishVersion);
router.patch('/:id/archive', archivePolicy);
router.delete('/:id', deletePolicy);
router.get('/:id/acceptances', acceptanceQueryValidator, getPolicyAcceptances);

module.exports = router;
