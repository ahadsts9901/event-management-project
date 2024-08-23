import mongoose from 'mongoose';

const refresherTokenSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'users',
        required: true,
    },
    refreshTokenHash: {
        type: String,
        required: true,
        trim: true,
        // no min max length // bcrypt hash is going to be saved
    },
    isConsumed: {
        type: Boolean, default: false,
    },
    createdOn: {
        type: Date, default: Date.now,
    },
});
export const refresherTokenModel = mongoose.model('refreshTokens', refresherTokenSchema);

export const abc = 'fake export';
