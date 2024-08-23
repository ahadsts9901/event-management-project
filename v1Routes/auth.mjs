import express from 'express';
import nodemailer from 'nodemailer';
import otpGenerator from 'otp-generator';
import moment from 'moment';
import bcrypt from 'bcrypt';

import { errorCodes } from '../core.mjs';
import { issueNewTokenInCookies, removeTokenFromCookies } from './helperFunctions.mjs';

import {
    userModel, otpModel, emailPattern,
    passwordPattern, otpPattern, otpMaxAgeInMinutes,
    forgetPasswordOtpModel, forgetPasswordOtpMaxAgeInMinutes,
} from '../schema/index.mjs';

const router = express.Router();

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
        user: process.env.USER_EMAIL,
        pass: process.env.USER_PASS,
    },
});

// completed
/**
 * @swagger
 * /api/v1/signup:
 *   post:
 *     description: |
 *      This api will be used for signing up new user,
 *      phone validation api must be called before signup
 *      otherwise signup will respond invalid phone number
 *
 *      JSON body inputs:
 *         - userName: String
 *         - role: String
 *         - email: String
 *           * Format: /^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
 *         - password: String
 *           * Format: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,100}$/
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * REQUIRED_PARAMETER_MISSING,
 *           * INVALID_PASSWORD
 *           * SUCCESS,
 *
 *     tags:
 *       - auth
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: credentials
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             userName:
 *               type: string
 *             role:
 *               type: string
 *             email:
 *               type: string
 *             password:
 *               type: string
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/signup', async (req, res) => {
    try {
        const userRole = req.body?.role;
        if (
            !req.body?.email
            || !req.body?.userName
            || !req.body?.password
            || !userRole
        ) {
            res.status(403).send({
                errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
                message: `required parameters missing, 
                    example request body:
                    {
                        userName: "Muhammad Awais", 
                        email: "awais@gmail.com",
                        password: "teatPassword123",
                        role: "organizer",
                    }
                    Password rules: 
                        1) 8 characters or more
                        2) mix of upper and lowercase.
                        3) at least one digit (0-9).
                        4) May contain special characters
                    `,
            });
            return;
        }

        // step 1: password validation
        if (!passwordPattern.test(req.body?.password)) {
            res.status(403).send({
                message: `password is not valid, password must match this pattern: ${passwordPattern}`,
                errorCode: errorCodes.INVALID_PASSWORD,
            });
            return;
        }

        // step 2: email validation: pattern
        if (!emailPattern.test(req.body?.email)) {
            res.status(403).send({
                message: `email is not valid, email must match this pattern: ${emailPattern}`,
                errorCode: errorCodes.INVALID_EMAIL,
            });
            return;
        }

        const foundUser = await userModel.findOne({ email: req.body?.email }).lean();

        // step 4: validation: user already exist
        if (foundUser) {
            res.status(403).send({
                message: 'user already exist with this email',
                errorCode: errorCodes.USER_ALREADY_EXIST,
            });
            return;
        }

        const passwordHash = await bcrypt.hash(req.body.password, 10);

        if (!userRole === 'user' || !userRole ==='organizer') {
            res.status(403).send({
                message: 'invalid user role',
                errorCode: errorCodes.INVALID_ROLE,
            });
            return;
        }

        await userModel.create({
            userName: req.body?.userName,
            email: req.body?.email,
            password: passwordHash,
            role: req.body?.role,
        });

        const otpCodeEmail = otpGenerator.generate(
            6,
            {
                upperCaseAlphabets: false,
                lowerCaseAlphabets: false,
                specialChars: false,
            },
        );
        const otpCodeEmailHash = await bcrypt.hash(otpCodeEmail, 10);
    
        await otpModel.create({
            email: req.body.email,
            otpCode: otpCodeEmailHash,
        });
    
        await transporter.sendMail({
            from: `"Progziel" <${process.env.USER_EMAIL}>`,
            to: req.body.email,
            subject: 'Progziel - Verify your email',
            html:
                `Hi ${user.userName}! welcome onboard`
                + ` here is your email verification code that is valid`
                + ` for ${otpMaxAgeInMinutes} minutes:`
                + ` <h1>${otpCodeEmail}</h1>`,
        });

        res.send({
            message: 'Signup successful, verify otp',
            errorCode: errorCodes.SUCCESS,
        });
    } catch (e) {
        console.error('error getting data mongodb: ', e);
        res.status(500).send({
            message: 'server error, please try later',
            errorCode: errorCodes.UNKNOWN_SERVER_ERROR,
        });
    }
});

// completed
/**
 * @swagger
 * /api/v1/send-email-otp:
 *   post:
 *     description: |
 *      this api will be used to send otp on email
 *
 *      JSON body inputs:
 *         - email: String
 *           * Format: /^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * REQUIRED_PARAMETER_MISSING,
 *           * INVALID_EMAIL,
 *           * EMAIL_ALREADY_VERIFIED
 *           * SUCCESS,
 *           * UNKNOWN_SERVER_ERROR
 *
 *     tags:
 *       - auth
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: credentials
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/send-email-otp', async (req, res) => {
    if (!req.body?.email) {
        res.status(403).send({
            errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            message: `provide email in body. example request body:
                {
                    email: "John@gmail.com"
                }
        `,
        });
        return;
    }

    // step 1: check email the pattern
    if (!emailPattern.test(req.body.email)) {
        res.send({
            message: `email is not valid, email must match this pattern: ${emailPattern}`,
            errorCode: errorCodes.INVALID_EMAIL,
        });
        return;
    }

    const user = await userModel.findOne({ email: req.body?.email }).lean();

    // step 2: check if user not exist
    if (!user) {
        res.status(403).send({
            message: 'user not exist',
            errorCode: errorCodes.USER_NOT_EXIST,
        });
        return;
    }

    // step 3: check if email is already verified
    if (user.isEmailVerified) {
        res.status(403).send({
            message: 'email is already verified, please login',
            errorCode: errorCodes.EMAIL_ALREADY_VERIFIED,
        });
        return;
    }

    // get otp for opt time based throttling
    const otp = await otpModel
        .find({
            email: req.body.email,
            createdOn: {
                // getting otp that is created within last 24hr
                $gte: moment().subtract(24, 'hours').toDate(),
            },
        })
        .lean()
        .sort({ _id: -1 })
        .limit(3);

    // time based throttling criteria
    // 1st OTP: No delay.
    // 2nd OTP: 5 minutes delay.
    // 3rd OTP: 1 hour delay.
    // 4th OTP: 24 hours delay.

    if (otp?.length >= 3) { // if three otp created within 24hr
        res.status(405).send({
            message: 'limit exceed, please try again in 24hr',
            errorCode: errorCodes.LIMIT_EXCEED_TRY_IN_24HR,
        });
        return;
    } if (otp?.length === 2) { // if two otp created within 24hr
        // it should be older than 60 minutes
        if (moment().diff(moment(otp[0].createdOn), 'minutes') <= 60) {
            res.status(405).send({
                message: 'limit exceed, wait 60 minutes before sending another OTP',
                errorCode: errorCodes.LIMIT_EXCEED_TRY_IN_60MIN,
            });
            return;
        }
    } else if (otp?.length === 1) { // if only one otp created within 24hr
        // it should be older than 5 minutes
        if (moment().diff(moment(otp[0].createdOn), 'minutes') <= 5) {
            res.status(405).send({
                message: 'limit exceed, wait 5 minutes before sending another OTP',
                errorCode: errorCodes.LIMIT_EXCEED_TRY_IN_5MIN,
            });
            return;
        }
    }
    const otpCodeEmail = otpGenerator.generate(
        6,
        {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        },
    );
    const otpCodeEmailHash = await bcrypt.hash(otpCodeEmail, 10);

    await otpModel.create({
        email: req.body.email,
        otpCode: otpCodeEmailHash,
    });

    await transporter.sendMail({
        from: `"Progziel" <${process.env.USER_EMAIL}>`,
        to: req.body.email,
        subject: 'Progziel - Verify your email',
        html:
            `Hi ${user.userName}! welcome onboard`
            + ` here is your email verification code that is valid`
            + ` for ${otpMaxAgeInMinutes} minutes:`
            + ` <h1>${otpCodeEmail}</h1>`,
    });



    res.send({
        message: 'email otp sent successfully',
        errorCode: errorCodes.SUCCESS,
        otpCodeEmail: otpCodeEmail
    });
});

/**
 * @swagger
 * /api/v1/verify-email-otp:
 *   post:
 *     description: |
 *      this api will be used to verify email otp
 *
 *      JSON body inputs:
 *         - email: String
 *           * Format: /^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
 *         - otpCode: String
 *             Format: /^[0-9]{6}$/
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * REQUIRED_PARAMETER_MISSING,
 *           * INVALID_EMAIL,
 *           * INVALID_OTP,
 *           * EMAIL_ALREADY_VERIFIED
 *           * SUCCESS,
 *           * UNKNOWN_SERVER_ERROR
 *
 *     tags:
 *       - auth
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: credentials
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             otpCode:
 *               type: string
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/verify-email-otp', async (req, res) => {
    if (!req.body?.email || !req.body?.otpCode) {
        res.status(403).send({
            errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            message: `provide email and otpCode in body. example request body:
                {
                    email: "John@gmail.com",
                    otpCode: "123456"
                }
        `,
        });
        return;
    }

    // step 1: check email pattern
    if (!emailPattern.test(req.body.email)) {
        res.status(403).send({
            message: `email is not valid, email must match this pattern: ${emailPattern}`,
            errorCode: errorCodes.INVALID_EMAIL,
        });
        return;
    }
    // step 2: check otp pattern
    if (!otpPattern.test(req.body.otpCode)) {
        res.status(403).send({
            message: `OTP is not valid, otp must match this pattern: ${otpPattern}`,
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    // can not lean this query, calling .save later on
    const user = await userModel.findOne({
        email: req.body?.email,
    }).exec();

    // step 3: check if user not exist
    if (!user || user.isEmailVerified) {
        res.status(403).send({
            message: 'invalid otp',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    // get otp from database
    const otp = await otpModel
        .findOne({
            email: req.body.email,
            createdOn: {
                // getting otp that is created within last ${otpMaxAgeInMinutes} minutes
                $gte: moment().subtract(otpMaxAgeInMinutes, 'minutes').toDate(),
            },
        })
        .sort({ _id: -1 })
        .lean();

    // step 5: incase no otp found
    if (!otp) {
        res.status(403).send({
            message: 'invalid otp',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }
    const isOtpMatched = await bcrypt.compare(req.body.otpCode, otp.otpCode);

    if (!isOtpMatched) {
        res.status(403).send({
            message: 'invalid otp',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    if (moment().diff(moment(otp?.createdOn), 'minutes') > otpMaxAgeInMinutes) {
        res.status(403).send({
            message: 'invalid otp',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    /// //////////it means otp is matched and generated within ${otpMaxAgeInMinutes} minutes

    user.isEmailVerified = true;
    await user.save();

    res.send({
        message: 'email verified successfully',
        errorCode: errorCodes.SUCCESS,
    });
});

/**
 * @swagger
 * /api/v1/login:
 *   post:
 *     description: |
 *      This api will be used for login a user only when user signup successfully
 *      and verify phone number and email already
 *
 *      JSON body inputs:
 *         - email: String
 *           * Format: /^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
 *         - password: String
 *           * Format: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,100}$/
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * REQUIRED_PARAMETER_MISSING,
 *           * INVALID_EMAIL_OR_PASSWORD
 *           * EMAIL_NOT_VERIFIED
 *           * PHONE_NOT_VERIFIED
 *           * USER_SUSPENDED
 *           * SUCCESS,
 *           * UNKNOWN_SERVER_ERROR
 *         - data: Object
 *           * data.userName: String
 *           * data.role: String (user or organizer)
 *           * data.email: String (user Email)
 *           * data.phone: String (user Phone)
 *           * data._id: String (user unique id)
 *
 *       Along with JSON in response body, this api will also respond with some http-only cookies,
 *       that you are supposed to send with every subsequent request as it is.
 *       cookies will automatically expire in 30 days of inactivity, otherwise it never expire
 *     tags:
 *       - auth
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: credentials
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             password:
 *               type: string
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/login', async (req, res) => {
    if (
        !req?.body?.email
        || !req?.body?.password
    ) {
        res.status(403)
            .send({
                errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
                message: `required parameters missing, 
        example request body:
        {
            email: "some@email.com",
            password: "some$password",
        } `,
            });
        return;
    }

    try {
        const user = await userModel.findOne({ email: req?.body?.email }).lean();

        if (!user) { // user not found
            res.status(401).send({
                message: 'email or password incorrect',
                errorCode: errorCodes.INVALID_EMAIL_OR_PASSWORD,
            });
            return;
        }
        const isMatch = await bcrypt.compare(req.body.password, user.password);

        if (!isMatch) {
            res.status(401).send({
                message: 'email or password incorrect',
                errorCode: errorCodes.INVALID_EMAIL_OR_PASSWORD,
            });
            return;
        }

        if (!user.isEmailVerified) {
            res.status(403).send({
                message: "email not verified",
                errorCode: errorCodes.EMAIL_NOT_VERIFIED
            });
            return;
        }

        await issueNewTokenInCookies(user, res);

        res.send({
            message: 'login successful',
            errorCode: errorCodes.SUCCESS,
            data: {
                isAdmin: user.isAdmin,
                role: user.role,
                userName: user.userName,
                email: user.email,
                _id: user._id,
            },
        });
    } catch (e) {
        console.error('error getting data mongodb: ', e);
        res.status(500).send({
            message: 'server error, please try later',
            errorCode: errorCodes.UNKNOWN_SERVER_ERROR,
        });
    }
});

// completed
/**
 * @swagger
 * /api/v1/logout:
 *   post:
 *     description: |
 *      This api will be used for logout
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * SUCCESS,
 *
 *     tags:
 *       - auth
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/logout', async (req, res) => {
    removeTokenFromCookies(res);

    res.send({
        message: 'logout successful',
        errorCode: errorCodes.SUCCESS,
    });
});

// completed
/**
 * @swagger
 * /api/v1/forget-password:
 *   post:
 *     description: |
 *      this api will be used to send otp on email to reset password
 *
 *      JSON body inputs:
 *         - email: String
 *           * Format: /^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * REQUIRED_PARAMETER_MISSING,
 *           * INVALID_EMAIL,
 *           * USER_NOT_EXIST,
 *           * USER_SUSPENDED,
 *           * SUCCESS,
 *
 *     tags:
 *       - auth
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: credentials
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/forget-password', async (req, res) => {
    // step 1: check email parameter
    if (!req.body?.email) {
        res.status(403).send({
            errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            message: `provide email in body. example request body:
                  {
                      email: "John@gmail.com"
                  }
          `,
        });
        return;
    }

    // step 2: check email the pattern
    if (!emailPattern.test(req.body.email)) {
        res.status(403).send({
            message: `email is not valid, email must match this pattern: ${emailPattern}`,
            errorCode: errorCodes.INVALID_EMAIL,
        });
        return;
    }

    const user = await userModel.findOne({ email: req.body?.email }).lean();

    // step 2: check if user exist
    if (!user) {
        res.status(403).send({
            message: 'user not exist',
            errorCode: errorCodes.USER_NOT_EXIST,
        });
        return;
    }

    const otpCodeEmail = otpGenerator.generate(
        6,
        {
            upperCaseAlphabets: false,
            lowerCaseAlphabets: false,
            specialChars: false,
        },
    );
    const otpCodeEmailHash = await bcrypt.hash(otpCodeEmail, 10);

    await forgetPasswordOtpModel.create({
        email: user.email,
        otpCodeHash: otpCodeEmailHash,
    });

    const otpCodeDigits = otpCodeEmail.split('');

    await transporter.sendMail({
        from: `"Progziel" <${process.env.USER_EMAIL}>`,
        to: req.body.email,
        subject: 'Progziel event - Verify your email',
        html:
            `Hi ${user.userName}! welcome onboard`
            + ` here is your otp code that is valid`
            + ` for ${otpMaxAgeInMinutes} minutes:`
            + ` <h1>${otpCodeDigits}</h1>`,
    });

    res.send({
        message: 'otp sent on email successfully',
        errorCode: errorCodes.SUCCESS,
        otpCodeEmail: otpCodeEmail
    });
});

/**
 * @swagger
 * /api/v1/forget-password-verify-otp:
 *   post:
 *     description: |
 *      this api will be used to verify email otp for forget password
 *
 *      JSON body inputs:
 *         - email: String
 *           * Format: /^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
 *         - otpCode: String
 *             Format: /^[0-9]{6}$/
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * REQUIRED_PARAMETER_MISSING,
 *           * INVALID_EMAIL,
 *           * INVALID_OTP,
 *           * USER_NOT_EXIST
 *           * USER_SUSPENDED
 *           * SUCCESS,
 *
 *     tags:
 *       - auth
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: credentials
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             otpCode:
 *               type: string
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/forget-password-verify-otp', async (req, res) => {
    // step 1: check all parameters present
    if (!req.body?.email
        || !req.body?.otpCode) {
        res.status(403).send({
            errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            message: `provide email and otp in body. example request body:
                  {
                      email: "John@gmail.com",
                      otpCode: "XXXXXX"
                  }
          `,
        });
        return;
    }

    // step 2: check email the pattern
    if (!emailPattern.test(req.body.email)) {
        res.status(403).send({
            message: `email is not valid, email must match this pattern: ${emailPattern}`,
            errorCode: errorCodes.INVALID_EMAIL,
        });
        return;
    }

    // can not lean down calling .save later
    const user = await userModel
        .findOne({ email: req.body?.email })
        .exec();

    // step 4: check if user exist
    if (!user) {
        res.status(403).send({
            message: 'user not exist',
            errorCode: errorCodes.USER_NOT_EXIST,
        });
        return;
    }

    const otp = await forgetPasswordOtpModel
        .findOne({ email: user.email })
        .sort({ _id: -1 })
        .lean();

    // step 5: check if otp not found
    if (!otp) {
        res.status(403).send({
            message: 'Invalid otp code, not found',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }
    // step 6: check if otp is already used
    if (otp.isUtilized) {
        res.status(403).send({
            message: 'Invalid otp code, already used',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    const xMinuteOld = moment().diff(moment(otp.createdOn), 'minutes');

    // step 7: check if otp not older than 15 minutes
    if (xMinuteOld > forgetPasswordOtpMaxAgeInMinutes) {
        res.status(403).send({
            message: 'Invalid otp code, older than 15 minute',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    const isOtpMatched = await bcrypt.compare(req.body.otpCode, otp.otpCodeHash);

    // step 8: check otp is incorrect
    if (!isOtpMatched) {
        res.status(403).send({
            message: 'Invalid otp code, not matched',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    res.send({
        message: 'otp is valid success, do not use this message for condition checking, use errorCode instead',
        errorCode: errorCodes.SUCCESS,
    });
});

// complete
/**
 * @swagger
 * /api/v1/forget-password-compete:
 *   post:
 *     description: |
 *      this api will be used to complete the process of change password by validating email, otp
 *
 *      JSON body inputs:
 *         - email: String
 *           * Format: /^[a-zA-Z0-9!#$%&'*+-/=?^_`{|}~]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/
 *         - otpCode: String
 *             Format: /^[0-9]{6}$/
 *         - newPassword: String
 *             Format: /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d).{6,100}$/
 *
 *      JSON Response body:
 *         - message: String
 *         - errorCode: String
 *         - Possible error codes:
 *           * REQUIRED_PARAMETER_MISSING,
 *           * INVALID_EMAIL,
 *           * INVALID_PASSWORD,
 *           * INVALID_OTP,
 *           * USER_NOT_EXIST
 *           * USER_SUSPENDED
 *           * SUCCESS,
 *
 *     tags:
 *       - auth
 *     consumes:
 *       - application/json
 *     parameters:
 *       - in: body
 *         name: credentials
 *         required: true
 *         schema:
 *           type: object
 *           properties:
 *             email:
 *               type: string
 *             otpCode:
 *               type: string
 *             newPassword:
 *               type: string
 *     responses:
 *       '.':
 *         description: .
 */
router.post('/forget-password-complete', async (req, res) => {
    // step 1: check all parameters present
    if (!req.body?.email
        || !req.body?.otpCode
        || !req.body?.newPassword) {
        res.status(403).send({
            errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            message: `provide email in body. example request body:
                  {
                      email: "John@gmail.com",
                      newPassword: "XXXXXXXXXXXXX",
                      otpCode: "XXXXXX"
                  }
          `,
        });
        return;
    }

    // step 2: check email the pattern
    if (!emailPattern.test(req.body.email)) {
        res.status(403).send({
            message: `email is not valid, email must match this pattern: ${emailPattern}`,
            errorCode: errorCodes.INVALID_EMAIL,
        });
        return;
    }

    // step 3: check password pattern
    if (!passwordPattern.test(req.body.newPassword)) {
        res.status(403).send({
            message: `password is not valid, password must match this pattern: ${passwordPattern}`,
            isValid: false,
            errorCode: errorCodes.INVALID_PASSWORD,
        });
        return;
    }

    // can not lean down calling .save later
    const user = await userModel
        .findOne({ email: req.body?.email })
        .exec();

    // step 4: check if user exist
    if (!user) {
        res.status(403).send({
            message: 'user not exist',
            errorCode: errorCodes.USER_NOT_EXIST,
        });
        return;
    }

    const otp = await forgetPasswordOtpModel
        .findOne({ email: user.email })
        .sort({ _id: -1 })
        .exec();

    // step 5: check if otp not found
    if (!otp) {
        res.status(403).send({
            message: 'Invalid otp code, not found',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }
    // step 6: check if otp is already used
    if (otp.isUtilized) {
        res.status(403).send({
            message: 'Invalid otp code, already used',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    const xMinuteOld = moment().diff(moment(otp.createdOn), 'minutes');

    // step 7: check if otp not older than 15 minutes
    if (xMinuteOld > forgetPasswordOtpMaxAgeInMinutes) {
        res.status(403).send({
            message: 'Invalid otp code, older than 15 minute',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    const isOtpMatched = await bcrypt.compare(req.body.otpCode, otp.otpCodeHash);

    // step 8: check otp is incorrect
    if (!isOtpMatched) {
        res.status(403).send({
            message: 'Invalid otp code, not matched',
            errorCode: errorCodes.INVALID_OTP,
        });
        return;
    }

    // step 9: mark otp as used and save in db
    otp.isUtilized = true;

    // const otpSaveResp =
    await otp.save();
    // console.log("otpSaveResp: ", otpSaveResp);

    const passwordHash = await bcrypt.hash(req.body.newPassword, 10);

    // step 10: update user password in db

    // const userSaveResp =
    user.password = passwordHash;
    await user.save();
    // console.log("userSaveResp: ", userSaveResp);

    res.send({
        message: 'your password has been updated, proceed to login',
        errorCode: errorCodes.SUCCESS,
    });
});

export default router;
