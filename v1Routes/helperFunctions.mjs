import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import moment from 'moment';

import {
    initialSessionInDays,
    extendedSessionInDays, refresherTokenModel,
} from '../schema/index.mjs';

/**
 * Issues a new authentication token and refresh token for the user and sets them in cookies.
 * @async
 * @function
 * @param {Object} user - The user object containing authentication details.
 * @param {boolean} [user.isAdmin=false] - Indicates whether the user has administrator privileges.
 * @param {string} [user.userName] - The first name of the user.
 * @param {string} [user.role] - Indicates whether the user is organizer or normal user.
 * @param {string} [user.email] - The email address of the user.
 * @param {string} user._id - The unique identifier for the user.
 * @param {Object} res - The Express response object to set cookies and respond.
 * @returns {Promise<{token: string, refreshToken: string}>} An object
 * containing the issued authentication token and refresh token.
 * @throws {Error} If there is an issue with token generation, hashing, or cookie setting.
 */
export const issueNewTokenInCookies = async (user, res) => {
    const payload = {
        isAdmin: user?.isAdmin || false,
        userName: user?.userName,
        role: user?.role,
        email: user?.email,
        _id: user?._id,
    };

    const token = jwt.sign(
        payload,
        process.env.SERVER_SECRET,
        {
            expiresIn: `${initialSessionInDays}d`,
        },
    );

    const refreshToken = jwt.sign({
        _id: user._id,
    }, process.env.REFRESH_SECRET, {
        expiresIn: `${extendedSessionInDays}d`,
    });

    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);

    await refresherTokenModel.create({
        userId: user._id,
        refreshTokenHash,
    });

    res.cookie('hart', token, {
        httpOnly: true,
        secure: true,
        signed: true,
        sameSite: 'none', // Helps mitigate CSRF attacks
        expires: moment().add(initialSessionInDays, 'days').toDate(),
    });

    res.cookie('hartRef', refreshToken, {
        httpOnly: true,
        secure: true,
        signed: true,
        sameSite: 'none', // Helps mitigate CSRF attacks
        expires: moment().add(extendedSessionInDays, 'days').toDate(),
    });

    return { token, refreshToken };
};

export const removeTokenFromCookies = async (res) => {
    res.cookie('hart', '', {
        httpOnly: true,
        secure: true,
        signed: true,
        sameSite: 'none', // Helps mitigate CSRF attacks
        expires: moment(0).toDate(), // past date
    });

    res.cookie('hartRef', '', {
        httpOnly: true,
        secure: true,
        signed: true,
        sameSite: 'none', // Helps mitigate CSRF attacks
        expires: moment(0).toDate(), // past date
    });
    return;
};
