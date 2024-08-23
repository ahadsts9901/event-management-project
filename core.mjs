import { readFileSync } from 'fs';

// check if all variables that are listed in env_template are actually present in env
const envTemplateLines = readFileSync('.env_template', 'utf8').split('\n');
const missingVariables = envTemplateLines
    .map((line) => line.split('=')[0].trim())
    .filter((name) => name && !process.env[name]);

if (missingVariables.length > 0) {
    console.error(`Missing environment variables: ${missingVariables.join(', ')}`);
    process.exit(1);
} else {
    console.info('All environment variables are set.');
}

export const errorCodes = {

    SUCCESS: 'SUCCESS',
    REQUIRED_PARAMETER_MISSING: 'REQUIRED_PARAMETER_MISSING',
    UNKNOWN_SERVER_ERROR: 'UNKNOWN_SERVER_ERROR',
    UNAUTHORIZED: 'UNAUTHORIZED',

    EMAIL_ALREADY_VERIFIED: 'EMAIL_ALREADY_VERIFIED',
    EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
    INVALID_EMAIL: 'INVALID_EMAIL',
    INVALID_EMAIL_OR_PASSWORD: 'INVALID_EMAIL_OR_PASSWORD',
    EMAIL_NOT_PROVIDED: 'EMAIL_NOT_PROVIDED',

    INVALID_PASSWORD: 'INVALID_PASSWORD',
    INVALID_OTP: 'INVALID_OTP',
    INVALID_ROLE: 'INVALID_ROLE',
    USER_ALREADY_EXIST: 'USER_ALREADY_EXIST',
    USER_NOT_EXIST: 'USER_NOT_EXIST',
    USER_SUSPENDED: 'USER_SUSPENDED',
    INVALID_DATE: "INVALID_DATE",
    INVALID_PHONE_NUMBER: "INVALID_PHONE_NUMBER",
    DATE_FIELD_MISSING: "DATE_FIELD_MISSING",
    LIMIT_EXCEED_TRY_IN_24HR: 'LIMIT_EXCEED_TRY_IN_24HR',
    LIMIT_EXCEED_TRY_IN_60MIN: 'LIMIT_EXCEED_TRY_IN_60MIN',
    LIMIT_EXCEED_TRY_IN_5MIN: 'LIMIT_EXCEED_TRY_IN_5MIN',
    EVENT_NOT_EXIST: 'EVENT_NOT_EXIST',
    INVALID_EVENT_ID: 'INVALID_EVENT_ID',
    INVALID_EVENT_TYPE: 'INVALID_EVENT_TYPE',
    REGISTRATION_NOT_EXIST: 'REGISTRATION_NOT_EXIST',
    NOT_ALLOWED: 'NOT_ALLOWED',

};

export default null;
