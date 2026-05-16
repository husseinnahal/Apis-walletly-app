import * as usersService from '../services/users.service.js';

/**
 * Get profile data for the logged-in user
 * @route GET /api/users/profile
 */
export const getMe = async (req, res) => {
     const user = await usersService.getUserProfile(req.user._id);
     
     res.status(200).json({
          success: true,
          data: user
     });
};

export const getUsers = async (req, res) => {
     const users = await usersService.getAllUsers();
     
     res.status(200).json({
          success: true,
          data: users
     });
};


/**
 * Update user basic info (username, email, phone)
 * @route PUT /api/users/profile/info
 */
export const updateInfo = async (req, res) => {
     // req.user._id comes from the protect middleware
     const updatedUser = await usersService.updateProfileInfo(req.user._id, req.body);
     
     res.status(200).json({
          success: true,
          message: 'Profile information updated successfully',
          data: updatedUser
     });
};

/**
 * Update user currency preference
 * @route PUT /api/users/profile/currency
 */
export const updateCurrency = async (req, res) => {
     const { currency, currencyRate } = req.body;
     const updatedUser = await usersService.updateProfileCurrency(req.user._id, currency, currencyRate);
     
     res.status(200).json({
          success: true,
          message: 'Currency updated successfully',
          data: updatedUser
     });
};

/**
 * Update user password
 * @route PUT /api/users/profile/password
 */
export const updatePassword = async (req, res) => {
     const { currentPassword, newPassword } = req.body;
     const result = await usersService.updatePassword(req.user._id, currentPassword, newPassword);
     
     res.status(200).json({
          success: true,
          message: result.message
     });
};

/**
 * Update user avatar (requires multipart/form-data with file)
 * @route PUT /api/users/profile/avatar
 */
export const updateAvatar = async (req, res) => {
     const updatedUser = await usersService.updateAvatar(req.user._id, req.file?.buffer);
     
     res.status(200).json({
          success: true,
          message: 'Avatar uploaded successfully',
          data: updatedUser
     });
};
