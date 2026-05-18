import User from '../models/users.model.js';
import Bill from '../models/bills.model.js';
import Saving from '../models/saving.model.js';
import Debt from '../models/debt.model.js';
import Transaction from '../models/transactions.model.js';
import Account from '../models/accounts.model.js';
import ApiError from '../utils/ApiError.js';
import { deleteImageFromCloudinary, uploadImageToCloudinary } from '../utils/cloudinary.js';

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

export const getAllUsers = async () => {
     const users = await User.find().select('-password');
     return users;
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

/**
 * Get all upcoming bills, savings deadlines, and debt deadlines for the current week
 * @param {string} userId The logged-in user's ID
 * @returns {Array} Sorted list of upcoming events
 */
export const getUpcomingThisWeek = async (userId) => {
     const startOfWeek = new Date();
     startOfWeek.setHours(0, 0, 0, 0);
     
     const endOfWeek = new Date();
     endOfWeek.setDate(startOfWeek.getDate() + 7);
     endOfWeek.setHours(23, 59, 59, 999);

     const query = {
          user: userId,
          $or: [
               { dueDate: { $gte: startOfWeek, $lte: endOfWeek } },
               { deadline: { $gte: startOfWeek, $lte: endOfWeek } }
          ]
     };

     // Note: We perform separate queries because the date field names differ
     const [bills, savings, debts] = await Promise.all([
          Bill.find({ userId : userId, dueDate: { $gte: startOfWeek, $lte: endOfWeek }, status: { $ne: 'paid' } }),
          Saving.find({ userId : userId, deadline: { $gte: startOfWeek, $lte: endOfWeek } }),
          Debt.find({ userId : userId, dueDate: { $gte: startOfWeek, $lte: endOfWeek }, status: { $ne: 'paid' } })
     ]);

     const upcoming = [
          ...bills.map(b => ({ ...b.toObject(), type: 'bill', date: b.dueDate })),
          ...savings.map(s => ({ ...s.toObject(), type: 'saving', date: s.deadline })),
          ...debts.map(d => ({ ...d.toObject(), type: 'debt', date: d.dueDate }))
     ];

     // Sort by date: nearly to far
     upcoming.sort((a, b) => new Date(a.date) - new Date(b.date));

     return upcoming;
};

/**
 * Get comprehensive financial stats for a user (spent, income, saved, debts, credits) filtered by a date range
 * @param {string} userId The logged-in user's ID
 * @param {string} [startDateStr] Optional start date string (YYYY-MM-DD)
 * @param {string} [endDateStr] Optional end date string (YYYY-MM-DD)
 * @returns {Object} Calculated flow data for the range
 */
export const getMonthlyStatsOverview = async (userId, startDateStr, endDateStr) => {
     let startDate;
     let endDate;

     if (startDateStr) {
          startDate = new Date(startDateStr);
          startDate.setHours(0, 0, 0, 0);
     } else {
          startDate = new Date();
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
     }

     if (endDateStr) {
          endDate = new Date(endDateStr);
          endDate.setHours(23, 59, 59, 999);
     } else {
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1);
          endDate.setDate(0);
          endDate.setHours(23, 59, 59, 999);
     }

     // 1. Fetch transactions in range
     const transactions = await Transaction.find({
          user: userId,
          date: { $gte: startDate, $lte: endDate }
     });

     let spent = 0;
     let income = 0;
     let saved = 0;

     transactions.forEach(tx => {
          if (tx.type === 'expense') {
               spent += tx.amount;
          } else if (tx.type === 'income') {
               income += tx.amount;
          } else if (tx.type === 'saving') {
               saved += tx.amount;
          }
     });

     // 2. Fetch debts and credits payments in range
     const debts = await Debt.find({ userId: userId });

     let debtPaid = 0;
     let creditReceived = 0;

     debts.forEach(debt => {
          debt.paidDebt.forEach(payment => {
               const paymentDate = new Date(payment.date);
               if (paymentDate >= startDate && paymentDate <= endDate) {
                    if (debt.type === 'debt') {
                         debtPaid += payment.amount;
                    } else if (debt.type === 'credit') {
                         creditReceived += payment.amount; // repayments they got back on loans lent
                    }
               }
          });
     });

     // 3. Fetch all accounts and sum total balances (current total money)
     const accounts = await Account.find({ user: userId });
     let totalMoney = 0;
     accounts.forEach(acc => {
          totalMoney += acc.totalBalance;
     });

     return {
          spent,
          income,
          saved,
          debtPaid,
          creditReceived,
          totalMoney
     };
};
