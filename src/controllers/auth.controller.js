import * as authService from '../services/auth.service.js';
// import config from '../config/index.js';

/**
 * Helper to structure responses with cookie setting
 */
const sendTokenResponse = (user, tokens, statusCode, res) => {
     const isProduction = process.env.NODE_ENV === 'production';

     // Options for cookie
     const options = {
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          httpOnly: true,
          sameSite: isProduction ? 'none' : 'lax',
          secure: isProduction, // must be true when sameSite is 'none'
     };

     // Attach refresh token to cookie, AND return it in JSON body for localStorage fallback
     res
          .status(statusCode)
          .cookie('refreshToken', tokens.refreshToken, options)
          .json({
               success: true,
               accessToken: tokens.accessToken,
               refreshToken: tokens.refreshToken,
               data: {
                    id: user._id,
                    username: user.username,
                    email: user.email,
                    phone: user.phone,
                    role: user.role,
                    currency: user.currency,
                    currencyRate: user.currencyRate
               }
          });
};

/**
 * Register a user
 * @route POST /api/auth/register
 */
export const register = async (req, res) => {
     // Allow native apps to send exact device models via a custom header
     const deviceInfo = req.headers['x-device-name'] || req.headers['user-agent'] || 'Unknown Device';
     const ip = req.ip || 'Unknown IP';

     const userData = { ...req.body, deviceInfo, ip };
     
     const { user, tokens } = await authService.registerUser(userData);
     sendTokenResponse(user, tokens, 201, res);
};

/**
 * Login user
 * @route POST /api/auth/login
 */
export const login = async (req, res) => {
     // Allow native apps to send exact device models via a custom header
     const deviceInfo = req.headers['x-device-name'] || req.headers['user-agent'] || 'Unknown Device';
     const ip = req.ip || 'Unknown IP';
     const { identifier, password } = req.body;
     
     const { user, tokens } = await authService.loginUser(identifier, password, deviceInfo, ip);
     sendTokenResponse(user, tokens, 200, res);
};

/**
 * Refresh Access Token
 * @route POST /api/auth/refresh
 */
export const refresh = async (req, res) => {
     // Token comes from request body or browser cookie
     const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
     const deviceInfo = req.headers['x-device-name'] || req.headers['user-agent'] || 'Unknown Device';
     const ip = req.ip || 'Unknown IP';
     
     const tokens = await authService.refreshSession(refreshToken, deviceInfo, ip);
     
     const isProduction = process.env.NODE_ENV === 'production';

     // Note: In token rotation, we set the NEW refresh token back in the cookie
     const options = {
          expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          httpOnly: true,
          sameSite: isProduction ? 'none' : 'lax',
          secure: isProduction,
     };

     res
          .status(200)
          .cookie('refreshToken', tokens.refreshToken, options)
          .json({
               success: true,
               accessToken: tokens.accessToken,
               refreshToken: tokens.refreshToken
          });
};

/**
 * Logout
 * @route POST /api/auth/logout
 */
export const logout = async (req, res) => {
     const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
     await authService.logoutUser(refreshToken);

     // Clear the cookie
     res.cookie('refreshToken', 'none', {
          expires: new Date(Date.now() + 10 * 1000),
          httpOnly: true,
          sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
          secure: process.env.NODE_ENV === 'production',
     });

     res.status(200).json({
          success: true,
          message: 'Logged out successfully',
          data: {}
     });
};

/**
 * Get all active sessions for the user
 * @route GET /api/auth/sessions
 */
export const getSessions = async (req, res) => {
     const currentRefreshToken = req.cookies.refreshToken;
     const sessions = await authService.getActiveSessions(req.user._id, currentRefreshToken);
     
     res.status(200).json({
          success: true,
          count: sessions.length,
          data: sessions
     });
};

/**
 * Revoke a specific session
 * @route DELETE /api/auth/sessions/:sessionId
 */
export const revokeSession = async (req, res) => {
     const { sessionId } = req.params;
     
     await authService.revokeSpecificSession(req.user._id, sessionId);
     
     res.status(200).json({
          success: true,
          message: 'Session revoked successfully'
     });
};
