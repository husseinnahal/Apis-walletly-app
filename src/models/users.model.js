import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import config from '../config/index.js';
const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      trim: true,
    },

  email: { 
    type: String,
    required: true },

  phone: { 
    type: String, 
    required:true
  },

  password: { 
    type: String, 
    required: true,
    trim: true,
  },
  avatar: {
    type: String, // Cloudinary URL
    default: ''
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  currency: {
    type: String,
    default: 'USD',
    trim: true,
    uppercase: true
  },

  currencyRate: {
    type: Number,
    default:1,
  },

  },
  {
    timestamps: true, 
  }
);

// Encrypt password using bcrypt
userSchema.pre('save', async function () {
  if (!this.isModified('password')) {
    return;
  }

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Match user entered password to hashed password in database
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Sign Access JWT and return
userSchema.methods.getAccessToken = function () {
  return jwt.sign({ id: this._id }, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpire,
  });
};

// Sign Refresh JWT and return
userSchema.methods.getRefreshToken = function () {
  return jwt.sign({ id: this._id }, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpire,
  });
};

const User = mongoose.model('User', userSchema);

export default User;

