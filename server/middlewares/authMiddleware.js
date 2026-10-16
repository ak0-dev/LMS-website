import { clerkClient } from "@clerk/express";

//Middleware

export const protectUser = async (req, res, next) => {
    try {
        const { userId } = await req.auth();
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        next();
    } catch (error) {
        res.status(401).json({ success: false, message: 'Authentication required' });
    }
};

export const protectEducator = async(req,res,next)=>{
    try {
        const { userId } = await req.auth();
        if (!userId) {
            return res.status(401).json({ success: false, message: 'Authentication required' });
        }
        const response = await clerkClient.users.getUser(userId)
        if(response.publicMetadata.role !=='educator'){
            return res.status(403).json({success: false, message: 'Unauthorized Access'})
        }
        next()
    } catch (error) {
        res.status(401).json({success:false, message: 'Authentication required'})
    }
}