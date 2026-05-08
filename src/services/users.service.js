import User from '../models/users.model.js';
import ApiError from '../utils/ApiError.js';
import { deleteImageFromCloudinary, uploadImageToCloudinary } from '../utils/cloudinary.js';
import axios from 'axios';

/**
 * Get user profile safely
 * @param {string} userId The logged-in user's ID
 * @returns {Object} User profile without password
 */
export const getUserProfile = async (userId) => {
     const user = await User.findById(userId).select('-password');
     if (!user) {
          throw ApiError.notFound('User not found');
     }
     return user;
};


/**
 * Update basic user profile information (username, email, phone)
 * @param {string} userId The logged-in user's ID
 * @param {Object} updateData The data to update (username, email, phone)
 * @returns {Object} Updated user
 */
export const updateProfileInfo = async (userId, updateData) => {
     // Ensure we don't accidentally update password or avatar here
     const validFields = ['username', 'email', 'phone'];
     const cleanData = {};
     validFields.forEach(field => {
          if (updateData[field]) cleanData[field] = updateData[field];
     });

     // Check if new email is taken by SOMEONE ELSE
          if (cleanData.email) {
               const emailExists = await User.findOne({
               email: cleanData.email,
               _id: { $ne: userId } // exclude current user
               });

               if (emailExists) {
               throw ApiError.badRequest('Emailll is already taken');
               }
          }


     // Check if new phone is taken by SOMEONE ELSE
     if (cleanData.phone) {
          const phoneExists = await User.findOne({
          phone: cleanData.phone,
          _id: { $ne: userId } // exclude current user
          });

          if (phoneExists) {
          throw ApiError.badRequest('Phone number is already taken');
          }
     }

     // Update user
     const updatedUser = await User.findByIdAndUpdate(userId, cleanData, { 
          new: true, 
          runValidators: true 
     }).select('-password');

     return updatedUser;
};

/**
 * Update user's base currency
 * @param {string} userId The logged-in user's ID
 * @param {string} currency The new currency code (e.g., 'USD', 'EGP')
 * @returns {Object} Updated user profile
 */
export const updateProfileCurrency = async (userId, currency, currencyRate = 1) => {
     if (!currency) {
          throw ApiError.badRequest('Currency is required');
     }

     const formattedCurrency = currency.toUpperCase().trim();

     const updatedUser = await User.findByIdAndUpdate(
          userId, 
          { 
               currency: formattedCurrency,
               currencyRate: currencyRate
          }, 
          { new: true, runValidators: true }
     ).select('-password');

     if (!updatedUser) {
          throw ApiError.notFound('User not found');
     }

     return updatedUser;
};


/**
 * Update user password
 * @param {string} userId The logged-in user's ID
 * @param {string} currentPassword The user's current password
 * @param {string} newPassword The new password they want
 */
export const updatePassword = async (userId, currentPassword, newPassword) => {
     const user = await User.findById(userId);
     
     if (!user) {
          throw ApiError.notFound('User not found');
     }

     // Check if current password is correct
     const isMatch = await user.matchPassword(currentPassword);
     if (!isMatch) {
          throw ApiError.badRequest('Current password is incorrect');
     }

     user.password = newPassword;
     await user.save(); 

     return { message: 'Password updated successfully' };
};


/**
 * Update user avatar by uploading to Cloudinary
 * @param {string} userId The logged-in user's ID
 * @param {Buffer} fileBuffer The file buffer from multer
 * @returns {Object} Updated user
 */
export const updateAvatar = async (userId, fileBuffer) => {
     if (!fileBuffer) {
          throw ApiError.badRequest('No image provided');
     }

     const user = await User.findById(userId);

     if (!user) {
          throw ApiError.notFound('User not found');
     }
     // If user already has an avatar, delete the old one from Cloudinary
     if (user.avatar) {
          await deleteImageFromCloudinary(user.avatar);
     }

     // Upload to cloudinary directly from memory
     const cloudinaryResponse = await uploadImageToCloudinary(fileBuffer, 'walletly/avatars');

     user.avatar = cloudinaryResponse.secure_url;
     await user.save();

     // Return user without password
     const userWithoutPassword = user.toObject();
     delete userWithoutPassword.password;

     return userWithoutPassword;
};
