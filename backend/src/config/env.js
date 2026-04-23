import dotenv from 'dotenv';
dotenv.config();


function requireEnv(name) {
    const value = process.env[name];
    if(!value) {
        throw new Error(`Missing required envionment varaible: ${name}`);
    }

    return value;
}


export const env = {
    port: parseInt(process.env.NODE_PORT || '5555'),
    nodeEnv: process.env.NODE_ENV || 'development',

    database: requireEnv('DATABASE_URL'),

    jwt: {
        accessSecret: requireEnv('JWT_ACCESS_SECRET'),
        accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
        refreshSecret: requireEnv('JWT_REFRESH_SECRET'),
        refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    },


    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12', 10),
  
    sessionSecret: requireEnv('SESSION_SECRET'),
}





