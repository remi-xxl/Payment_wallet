

import logger from "../config/logger.js";

export function deprecateVersion(sunsetDate, successorVersion) {
    return (req,res, next) => {
        res.set('Deprecation', true);

        if(sunsetDate) {
            res.set('SUnset', new Date(sunsetDate).toUTCString());
        }

        if(successorVersion) {
            res.set('Link', `</api${successorVersion}>; rel="successor-version`)
        };
        
        logger.warn(`[Deprecation] ${req.method} ${req.path} called on deprecated version`)
    }
}

