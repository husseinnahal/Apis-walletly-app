import User from '../models/users.model.js';
import RefreshToken from '../models/refreshToken.model.js';
import ApiError from '../utils/ApiError.js';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';

/**
 * Generate tokens and save RefreshToken to DB
 */
const generateAuthTokens = async (user, deviceInfo = 'Unknown Device', ip = 'Unknown IP') => {
     const accessToken = user.getAccessToken();
     const refreshTokenStr = user.getRefreshToken();
     
     // Calculate expiration date for DB storage (e.g. 30 days)
     const decodedRefresh = jwt.verify(refreshTokenStr, config.jwt.refreshSecret);
     const expiresAt = new Date(decodedRefresh.exp * 1000);

     // Save refresh token to DB
     await RefreshToken.create({
          token: refreshTokenStr,
          user: user._id,
          expiresAt: expiresAt,
          deviceInfo: deviceInfo,
          ip: ip
     });

     return { accessToken, refreshToken: refreshTokenStr };
};

/**
 * Register a new user
 */
export const registerUser = async (userData) => {
     const existingByEmail = await User.findOne({ email: userData.email });
     if (existingByEmail) {
          throw ApiError.badRequest('Email is already in use');
     }

     const existingByPhone = await User.findOne({ phone: userData.phone });
     if (existingByPhone) {
          throw ApiError.badRequest('Phone number is already in use');
     }

     const user = await User.create(userData);
     const tokens = await generateAuthTokens(user, userData.deviceInfo, userData.ip);

     return { user, tokens };
};

/**
 * Login user via email or phone
 */
export const loginUser = async (identifier, password, deviceInfo, ip) => {
     const user = await User.findOne({
          $or: [{ email: identifier }, { phone: identifier }]
     });

     if (!user) {
          throw ApiError.unauthorized('Invalid credentials');
     }

     const isMatch = await user.matchPassword(password);
     if (!isMatch) {
          throw ApiError.unauthorized('Invalid credentials');
     }

     const tokens = await generateAuthTokens(user, deviceInfo, ip);

     return { user, tokens };
};

/**
 * Refresh the access token using a valid refresh token
 */
export const refreshSession = async (refreshTokenStr, deviceInfo, ip) => {
     if (!refreshTokenStr) {
          throw ApiError.unauthorized('No refresh token provided');
     }

     // Find token in DB
     const refreshTokenObj = await RefreshToken.findOne({ token: refreshTokenStr }).populate('user');
     
     if (!refreshTokenObj) {
          throw ApiError.unauthorized('Invalid refresh token');
     }

     // Check if token was revoked or expired
     if (!refreshTokenObj.isActive) {
          throw ApiError.unauthorized('Token expired. Please login again.');
     }

     try {
          // Verify JWT signature
          jwt.verify(refreshTokenStr, config.jwt.refreshSecret);
     } catch (error) {
          throw ApiError.unauthorized('Invalid or expired refresh token');
     }

     const user = refreshTokenObj.user;

     // Revoke the old refresh token (Token Rotation for security)
     refreshTokenObj.revoked = new Date();
     
     // Generate new token pair with potentially updated device info
     const tokens = await generateAuthTokens(user, deviceInfo, ip);

     refreshTokenObj.replacedByToken = tokens.refreshToken;
     await refreshTokenObj.save();

     return tokens;
};

/**
 * Logout user by revoking the refresh token
 */
export const logoutUser = async (refreshTokenStr) => {
     if (refreshTokenStr) {
          // Delete the token immediately from the database
          await RefreshToken.findOneAndDelete({ token: refreshTokenStr });
     }
     
     return true;
};

/**
 * Helper to parse raw User-Agent string into a friendly device name
 */
const parseDeviceInfo = (ua) => {
    if (!ua) return 'Unknown Device';
    
    // If it doesn't look like a standard browser User-Agent, assume it's a direct hardware name from a mobile app
    if (!ua.includes('Mozilla/') && !ua.includes('Opera/')) {
        return ua;
    }
    
    let browser = 'Unknown Browser';
    if (ua.includes('Edg')) browser = 'Edge';
    else if (ua.includes('Chrome')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    
    let os = 'Unknown OS';
    if (ua.includes('Win')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('like Mac')) os = 'iOS';
    
    return `${browser} on ${os}`;
};

/**
 * Get all active sessions for a user
 */
export const getActiveSessions = async (userId, currentRefreshTokenStr) => {
     const sessions = await RefreshToken.find({
          user: userId,
          revoked: { $exists: false } 
     }).select('-user -__v'); 

     // Filter by expiry and attach isCurrentDevice flag
     const mappedSessions = sessions
          .filter(session => session.isActive)
          .map(session => {
               
               const sessionObj = session.toObject();
               
               // Check if this specific session token matches the user's current exact cookie
               sessionObj.isCurrentDevice = (sessionObj.token === currentRefreshTokenStr);
               
               // Parse friendly name
               sessionObj.deviceName = parseDeviceInfo(sessionObj.deviceInfo);
               
               // Extremely important: delete the sensitive token string before sending to frontend!
               delete sessionObj.token;
               
               return sessionObj;
          });

     return mappedSessions;
};

/**
 * Revoke a specific session (Remote Logout)
 */
export const revokeSpecificSession = async (userId, tokenId) => {
     const session = await RefreshToken.findOneAndDelete({
          _id: tokenId,
          user: userId // Ensure the user actually owns this session
     });

     if (!session) {
          throw ApiError.notFound('Session not found or already logged out');
     }

     return true;
};
