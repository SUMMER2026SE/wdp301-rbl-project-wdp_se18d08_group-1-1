const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { requirePolicyAcceptance } = require('../middlewares/policyAcceptanceMiddleware');
const renewalController = require('../controllers/subscriptionRenewalController');
const {
  subscriptionIdValidator,
  renewalPaymentValidator,
  renewalVerifyValidator,
} = require('../validators/subscriptionValidator');
const { isEnabled, defaultForCurrentEnvironment } = require('../utils/featureFlags');

const renewalEnabled = (req, res, next) => {
  if (!isEnabled('SUBSCRIPTION_RENEWAL_ENABLED', defaultForCurrentEnvironment())) {
    return res.status(404).json({ success: false, message: 'Renewal is not enabled.' });
  }
  next();
};

router.use(protect);

router.get('/membership', subscriptionController.getMembership);
router.post(
  '/renew/verify-payment',
  renewalEnabled,
  renewalVerifyValidator,
  renewalController.verifyPayosPayment
);
router.post(
  '/:subscriptionId/renew/quote',
  renewalEnabled,
  subscriptionIdValidator,
  renewalController.getQuote
);
router.post(
  '/:subscriptionId/renew/pay-with-wallet',
  renewalEnabled,
  requirePolicyAcceptance({ action: 'subscription:renew-wallet' }),
  renewalPaymentValidator,
  renewalController.payWithWallet
);
router.post(
  '/:subscriptionId/renew/create-payment',
  renewalEnabled,
  requirePolicyAcceptance({ action: 'subscription:renew-payment' }),
  renewalPaymentValidator,
  renewalController.createPayosPayment
);
router.post('/payment', requirePolicyAcceptance({ action: 'subscription:create-payment' }), subscriptionController.createSubscriptionPayment);
router.post('/create-payment', requirePolicyAcceptance({ action: 'subscription:create-payment' }), subscriptionController.createSubscriptionPayment);
router.post('/verify-payment', subscriptionController.verifyPayment);
router.post('/pay-with-wallet', requirePolicyAcceptance({ action: 'subscription:pay-with-wallet' }), subscriptionController.paySubscriptionWithWallet);

// Admin route to get all subscriptions
router.get('/all', authorize('admin', 'staff'), subscriptionController.getAllSubscriptions);
module.exports = router;
