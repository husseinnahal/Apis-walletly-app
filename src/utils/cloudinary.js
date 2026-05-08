import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import config from '../config/index.js';

// Configure Cloudinary
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

/**
 * Uploads a file buffer to Cloudinary
 * @param {Buffer} fileBuffer The file buffer from multer
 * @param {string} folder The folder inside Cloudinary where to put the image
 * @returns {Promise<Object>} The Cloudinary response object with the URL
 */
export const uploadImageToCloudinary = (fileBuffer, folder = 'avatars') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
      },
      (error, result) => {
        if (result) {
          resolve(result);
        } else {
          reject(error);
        }
      }
    );

    streamifier.createReadStream(fileBuffer).pipe(uploadStream);
  });
};

/**
 * Extracts the public ID from a Cloudinary URL
 * @param {string} url The full Cloudinary URL
 * @returns {string|null} The public ID or null
 */
export const getPublicIdFromUrl = (url) => {
  if (!url) return null;
  // Standard Cloudinary URL structure: .../upload/v12345/folder/public_id.extension
  const parts = url.split('/');
  const uploadIndex = parts.indexOf('upload');
  if (uploadIndex === -1) return null;

  // Join parts after the version (v...) and remove the file extension
  const publicIdWithExtension = parts.slice(uploadIndex + 2).join('/');
  return publicIdWithExtension.split('.')[0];
};

/**
 * Delete an image from Cloudinary (using its public_id or full URL)
 */
export const deleteImageFromCloudinary = async (identifier) => {
  if (!identifier) return;

  // If it's a URL, extract the public ID first
  const publicId = identifier.startsWith('http') 
    ? getPublicIdFromUrl(identifier) 
    : identifier;

  if (!publicId) return;

  try {
     await cloudinary.uploader.destroy(publicId);
  } catch (error) {
     console.error('Error deleting from Cloudinary:', error);
  }
};
