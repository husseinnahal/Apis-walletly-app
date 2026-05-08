import multer from 'multer';
import ApiError from '../utils/ApiError.js';

// Configure multer to store files in memory as a Buffer
const storage = multer.memoryStorage();

// File filter to explicitly only accept images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(ApiError.badRequest('Not an image! Please upload only images.'), false);
  }
};

// Create the upload middleware instance
export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Megabytes limit
  },
});
