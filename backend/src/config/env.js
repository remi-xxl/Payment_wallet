import dotenv from 'dotenv';

if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.dev' });
}
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

    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
    },

    email: {
        host: process.env.EMAIL_HOST || 'smtp.ethereal.email',
        port: parseInt(process.env.EMAIL_PORT || '587', 10),
        user: process.env.EMAIL_USER || 'donald.cassin@ethereal.email',
        pass: process.env.EMAIL_PASS || 'Hg2RbZHc6k5TxwszRv',
        from: process.env.EMAIL_FROM || 'noreply@fintechapi.com'

}


}


