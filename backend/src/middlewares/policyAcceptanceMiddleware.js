const policyAcceptanceService = require('../services/policyAcceptanceService');

const requirePolicyAcceptance = () => async (req, res, next) => {
  try {
    if (!req.user || req.user.role !== 'customer') {
      return next();
    }

    const missingPolicies = await policyAcceptanceService.getMissingRequiredPolicies(req.user._id);
    if (!missingPolicies.length) {
      return next();
    }

    return res.status(428).json({
      success: false,
      code: 'POLICY_ACCEPTANCE_REQUIRED',
      message: 'Please accept the latest required policies before continuing.',
      data: {
        missingPolicies,
      },
    });
  } catch (error) {
    return next(error);
  }
};

module.exports = { requirePolicyAcceptance };
