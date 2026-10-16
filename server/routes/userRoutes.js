import express from 'express'
import { addUserRating, getUserCourseProgress, getUserData, purchaseCourse, updateUserCourseprogress, userEnrolledCourses } from '../controllers/userController.js'
import { protectUser } from '../middlewares/authMiddleware.js'

const userRouter  = express.Router()

userRouter.use(protectUser)

userRouter.get('/data', getUserData)
userRouter.get('/enrolled-courses', userEnrolledCourses)
userRouter.post('/purchase', purchaseCourse)

userRouter.post('/update-course-progress', updateUserCourseprogress)
userRouter.post('/get-course-progress', getUserCourseProgress)
userRouter.post('/add-rating', addUserRating)

export default userRouter