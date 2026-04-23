import {z} from 'zod';


export const registerSchema = z.object({
    email: z.email('Invalid email address').toLowerCase(),

    password: z.string().min(8, 'Password must be at atleast 8 characters') ,
    
    firstName: z.string().trim().min(2, 'firt name is required'),
    lastName: z.string().trim().min(1, 'Last name is required')


});


export const loginSchema = z.object({
    email: z.email('Invalid email address').toLowerCase(),


    password: z.string().min(8,'Password is required')
})

// export const refreshTokenSchema = z.object({
//     refreshToken: z.string().min(1,'Refresh token is required')
// })