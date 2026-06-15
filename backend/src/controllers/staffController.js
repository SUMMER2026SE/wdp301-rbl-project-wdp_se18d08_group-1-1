const User = require('../models/User');
const UserDetail = require('../models/UserDetail');

/**
 * @desc  List all customer users with their profiles
 * @route GET /api/staff/users
 * @access Staff only
 */
exports.listCustomers = async (req, res, next) => {
  try {
    const users = await User.aggregate([
      { $match: { role: 'customer' } }, // ONLY customers
      {
        $lookup: {
          from: 'userdetails',
          localField: '_id',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      {
        $unwind: {
          path: '$profile',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $sort: { createdAt: -1 }
      }
    ]);
    res.status(200).json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update customer status (block/unblock)
 * @route PUT /api/staff/users/:id/status
 * @access Staff only
 */
exports.updateCustomerStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    
    // Ensure the target is a customer
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Staff can only manage customer accounts' });
    }

    user.status = status;
    await user.save();
    
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
};

/**
 * @desc  Update customer details (profile)
 * @route PUT /api/staff/users/:id
 * @access Staff only
 */
exports.updateCustomer = async (req, res, next) => {
  try {
    const { firstName, lastName, phone } = req.body;
    
    // Check target user
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    if (user.role !== 'customer') {
      return res.status(403).json({ success: false, message: 'Staff can only manage customer accounts' });
    }

    // Notice we DO NOT allow changing the role here at all, even if passed in req.body.
    // Staff cannot escalate or change roles.
    
    let userDetail = await UserDetail.findOne({ userId: user._id });
    if (!userDetail) {
      userDetail = new UserDetail({ userId: user._id });
    }
    
    if (firstName !== undefined) userDetail.firstName = firstName;
    if (lastName !== undefined) userDetail.lastName = lastName;
    if (phone !== undefined) userDetail.phone = phone;
    await userDetail.save();

    // Fetch the updated user with profile to return
    const updatedUser = await User.aggregate([
      { $match: { _id: user._id } },
      {
        $lookup: {
          from: 'userdetails',
          localField: '_id',
          foreignField: 'userId',
          as: 'profile'
        }
      },
      {
        $unwind: {
          path: '$profile',
          preserveNullAndEmptyArrays: true
        }
      }
    ]);

    res.status(200).json({ success: true, data: updatedUser[0] });
  } catch (err) {
    next(err);
  }
};
