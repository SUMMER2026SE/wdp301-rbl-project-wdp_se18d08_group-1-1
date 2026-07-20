const express = require('express');
const router = express.Router();
const subscriptionController = require('../controllers/subscriptionController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { requirePolicyAcceptance } = require('../middlewares/policyAcceptanceMiddleware');

router.use(protect);

router.get('/membership', subscriptionController.getMembership);
router.get('/membership/qr', subscriptionController.getMembershipQr);
router.post('/payment', requirePolicyAcceptance({ action: 'subscription:create-payment' }), subscriptionController.createSubscriptionPayment);
router.post('/create-payment', requirePolicyAcceptance({ action: 'subscription:create-payment' }), subscriptionController.createSubscriptionPayment);
router.post('/verify-payment', subscriptionController.verifyPayment);
router.post('/pay-with-wallet', requirePolicyAcceptance({ action: 'subscription:pay-with-wallet' }), subscriptionController.paySubscriptionWithWallet);
router.get('/:subscriptionId/qr', subscriptionController.getSubscriptionMembershipQr);

// Admin route to get all subscriptions
router.get('/all', authorize('admin', 'staff'), subscriptionController.getAllSubscriptions);
module.exports = router;
