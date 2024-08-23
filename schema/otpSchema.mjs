import mongoose from 'mongoose';
import { emailPattern } from './schemaConstants.mjs';

const otpSchema = new mongoose.Schema({
    medium: {
        type: String,
        enum: {
            values: ['email'],
            message: 'Medium must be "email"',
        },
        required: [true, 'OTP code field is required'],
        trim: true,
    },
    email: {
        type: String,
        default: null,
        trim: true,
        match: emailPattern,
    },
    otpCode: {
        type: String,
        required: [true, 'OTP code field is required'],
        // no min max length // bcrypt hash is going to be saved
        trim: true,
    },
    createdOn: {
        type: Date, default: Date.now,
    },
});

export const otpModel = mongoose.model('otps', otpSchema);

const forgetPasswordOtpSchema = new mongoose.Schema({
    email: {
        type: String,
        default: null,
        trim: true,
        match: emailPattern,
    },
    otpCodeHash: {
        type: String,
        required: [true, 'OTP code field is required'],
        // no min max length // bcrypt hash is going to be saved
        trim: true,
    },
    isUtilized: {
        type: Boolean,
        default: false,
    },
    createdOn: {
        type: Date, default: Date.now,
    },
});
export const forgetPasswordOtpModel = mongoose.model('forgetPasswordOtps', forgetPasswordOtpSchema);
