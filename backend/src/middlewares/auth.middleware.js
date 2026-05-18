import { verifyAccessToken } from "../utils/jwt.js";
import ApiError from "../utils/ApiError.js";


export function authenticate(req,res,next) {
const authHeader = req.headers.authorization;

if(!authHeader || !authHeader.startsWith('Bearer ')){
    return next( new ApiError(401, 'Access token required'))
}


const token = authHeader.split(' ')[1];

try {
    const decoded = verifyAccessToken(token);

    req.user = decoded;

    next();

} catch (error) {
    if(error.name === 'TokenExpiredError') {
   return next(new ApiError(401, 'Access token expired'))
    }

    return next(new ApiError(401, 'Invalid access token'))
}
}

