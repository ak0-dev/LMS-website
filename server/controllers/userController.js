import Course from '../models/Course.js'
import { CourseProgress } from '../models/CourseProgress.js'
import { Purchase } from '../models/Purchase.js'
import User from '../models/User.js'
import Stripe from 'stripe'

export const getUserData = async (req, res) => {
    try {
        const { userId } = await req.auth()
        const user = await User.findById(userId)
        if (!user) return res.status(404).json({ success: false, message: 'User not Found' })
        res.json({ success: true, user })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const userEnrolledCourses = async (req, res) => {
    try {
        const { userId } = await req.auth()
        const userData = await User.findById(userId).populate('enrolledCourses')
        res.json({ success: true, enrolledCourses: userData.enrolledCourses })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const purchaseCourse = async (req, res) => {
    try {
        const { courseId } = req.body
        const { origin } = req.headers
        const { userId } = await req.auth()
        const userData = await User.findById(userId)
        const courseData = await Course.findById(courseId)
        if (!userData || !courseData) {
            return res.status(404).json({ success: false, message: 'Data not Found' })
        }

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData.discount * courseData.coursePrice / 100).toFixed(2)
        }
        const newPurchase = await Purchase.create(purchaseData)
        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)
        const currency = process.env.CURRENCY.toLowerCase()
        const line_items = [{
            price_data: {
                currency,
                product_data: { name: courseData.courseTitle },
                unit_amount: Math.floor(newPurchase.amount * 100)
            },
            quantity: 1
        }]
        const session = await stripeInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}/`,
            line_items,
            mode: 'payment',
            metadata: { purchaseId: newPurchase._id.toString() }
        })
        res.json({ success: true, session_url: session.url })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const updateUserCourseprogress = async (req, res) => {
    try {
        const { userId } = await req.auth()
        const { courseId, lectureId } = req.body
        const progressData = await CourseProgress.findOne({ userId, courseId })
        if (progressData) {
            if (progressData.lectureCompleted.includes(lectureId)) {
                return res.json({ success: true, message: 'Lecture Already Completed' })
            }
            progressData.lectureCompleted.push(lectureId)
            await progressData.save()
        } else {
            await CourseProgress.create({ userId, courseId, lectureCompleted: [lectureId] })
        }
        res.json({ success: true, message: 'Progress Updated' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getUserCourseProgress = async (req, res) => {
    try {
        const { userId } = await req.auth()
        const { courseId } = req.body
        const progressData = await CourseProgress.findOne({ userId, courseId })
        res.json({ success: true, progressData })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getUserOverallProgress = async (req, res) => {
    try {
        const { userId } = await req.auth()
        const user = await User.findById(userId).select('enrolledCourses')
        if (!user) return res.status(404).json({ success: false, message: 'User not found' })

        const courses = await Course.find({ _id: { $in: user.enrolledCourses } })
            .select('courseTitle courseThumbnail courseContent')

        const courseIds = courses.map(course => course._id.toString())
        const progressRecords = await CourseProgress.find({
            userId,
            courseId: { $in: courseIds }
        })
        const progressByCourse = new Map(
            progressRecords.map(progress => [progress.courseId, progress.lectureCompleted || []])
        )

        const progress = courses.map(course => {
            const lectureIds = new Set()
            for (const chapter of course.courseContent || []) {
                for (const lecture of chapter.chapterContent || []) {
                    if (lecture.lectureId) lectureIds.add(lecture.lectureId)
                }
            }
            const completedIds = new Set(
                (progressByCourse.get(course._id.toString()) || [])
                    .filter(lectureId => lectureIds.has(lectureId))
            )
            const totalLectures = lectureIds.size
            const completedLectures = completedIds.size
            const progressPercentage = totalLectures === 0
                ? 0
                : Math.round((completedLectures / totalLectures) * 100)

            return {
                courseId: course._id,
                courseTitle: course.courseTitle,
                courseThumbnail: course.courseThumbnail,
                totalLectures,
                completedLectures,
                progressPercentage
            }
        })
        res.json({ success: true, progress })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const addUserRating = async (req, res) => {
    try {
        const { userId } = await req.auth()
        const { courseId, rating } = req.body
        if (!courseId || !userId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ success: false, message: 'Invalid Details' })
        }
        const course = await Course.findById(courseId)
        if (!course) return res.status(404).json({ success: false, message: 'Course not Found' })

        const user = await User.findById(userId)
        if (!user || !user.enrolledCourses.some(id => id.toString() === courseId)) {
            return res.status(403).json({ success: false, message: 'User has not purchased this course' })
        }
        const existingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId)
        if (existingRatingIndex > -1) {
            course.courseRatings[existingRatingIndex].rating = rating
        } else {
            course.courseRatings.push({ userId, rating })
        }
        await course.save()
        res.json({ success: true, message: 'Rating added' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
