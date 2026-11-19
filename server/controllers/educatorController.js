import { clerkClient } from '@clerk/express'
import { v2 as cloudinary } from 'cloudinary'
import mongoose from 'mongoose'
import sanitizeHtml from 'sanitize-html'
import Course from '../models/Course.js'
import { CourseProgress } from '../models/CourseProgress.js'
import { Purchase } from '../models/Purchase.js'
import User from '../models/User.js'

export const updateRoleToEducator = async (req, res) => {
    try {
        const auth = await req.auth()
        await clerkClient.users.updateUserMetadata(auth.userId, {
            publicMetadata: { role: 'educator' }
        })
        res.json({ success: true, message: 'You can publish a course now' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const addCourse = async (req, res) => {
    try {
        const { courseData } = req.body
        const imageFile = req.file
        const auth = await req.auth()

        if (!imageFile) {
            return res.status(400).json({ success: false, message: 'Thumbnail not attached' })
        }

        const parsedCourseData = JSON.parse(courseData)
        parsedCourseData.courseDescription = sanitizeHtml(parsedCourseData.courseDescription || '')
        parsedCourseData.educator = auth.userId

        const newCourse = await Course.create(parsedCourseData)
        const imageUpload = await cloudinary.uploader.upload(imageFile.path)
        newCourse.courseThumbnail = imageUpload.secure_url
        await newCourse.save()

        res.status(201).json({ success: true, message: 'Course Added', course: newCourse })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getEducatorCourses = async (req, res) => {
    try {
        const auth = await req.auth()
        const courses = await Course.find({ educator: auth.userId })
        res.json({ success: true, courses })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const educatorDashboardData = async (req, res) => {
    try {
        const auth = await req.auth()
        const courses = await Course.find({ educator: auth.userId })
        const courseIds = courses.map(course => course._id)
        const purchases = await Purchase.find({ courseId: { $in: courseIds }, status: 'completed' })
        const totalEarnings = Number(purchases.reduce((sum, purchase) => sum + Number(purchase.amount), 0).toFixed(2))

        const enrolledStudentsData = []
        for (const course of courses) {
            const students = await User.find({ _id: { $in: course.enrolledStudents } }, 'name imageUrl')
            students.forEach(student => {
                enrolledStudentsData.push({ courseTitle: course.courseTitle, student })
            })
        }
        res.json({
            success: true,
            dashboardData: {
                totalEarnings,
                enrolledStudentsData,
                totalCourses: courses.length
            }
        })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const getEnrolledStudentsData = async (req, res) => {
    try {
        const auth = await req.auth()
        const courses = await Course.find({ educator: auth.userId })
        const courseIds = courses.map(course => course._id)
        const purchases = await Purchase.find({ courseId: { $in: courseIds }, status: 'completed' })
            .populate('userId', 'name imageUrl')
            .populate('courseId', 'courseTitle')

        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }))
        res.json({ success: true, enrolledStudents })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

const parseCourseUpdateData = (req) => {
    if (req.body.courseData) return JSON.parse(req.body.courseData)
    return req.body
}

const validateCourseContent = (courseContent) => {
    if (!Array.isArray(courseContent)) {
        throw new Error('courseContent must be an array')
    }

    return courseContent.map((chapter, chapterIndex) => {
        if (!chapter || typeof chapter.chapterId !== 'string' || !chapter.chapterId.trim() ||
            typeof chapter.chapterTitle !== 'string' || !chapter.chapterTitle.trim() ||
            typeof chapter.chapterOrder !== 'number' || !Number.isFinite(chapter.chapterOrder) ||
            !Array.isArray(chapter.chapterContent)) {
            throw new Error(`Invalid chapter at index ${chapterIndex}`)
        }

        const chapterContent = chapter.chapterContent.map((lecture, lectureIndex) => {
            if (!lecture || typeof lecture.lectureId !== 'string' || !lecture.lectureId.trim() ||
                typeof lecture.lectureTitle !== 'string' || !lecture.lectureTitle.trim() ||
                typeof lecture.lectureUrl !== 'string' || !lecture.lectureUrl.trim() ||
                typeof lecture.lectureDuration !== 'number' || !Number.isFinite(lecture.lectureDuration) ||
                lecture.lectureDuration < 0 ||
                typeof lecture.lectureOrder !== 'number' || !Number.isFinite(lecture.lectureOrder) ||
                typeof lecture.isPreviewFree !== 'boolean') {
                throw new Error(`Invalid lecture at chapter ${chapterIndex}, lecture ${lectureIndex}`)
            }
            return lecture
        })
        return { ...chapter, chapterContent }
    })
}

export const updateCourse = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID' })
        }

        let updateData
        try {
            updateData = parseCourseUpdateData(req)
        } catch (error) {
            return res.status(400).json({ success: false, message: 'Invalid course data' })
        }

        const auth = await req.auth()
        const course = await Course.findById(id)
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' })
        }
        if (course.educator !== auth.userId) {
            return res.status(403).json({ success: false, message: 'You do not own this course' })
        }

        const allowedUpdates = {}
        if (updateData.courseTitle !== undefined) {
            if (typeof updateData.courseTitle !== 'string' || !updateData.courseTitle.trim()) {
                return res.status(400).json({ success: false, message: 'Invalid course title' })
            }
            allowedUpdates.courseTitle = updateData.courseTitle.trim()
        }
        if (updateData.courseDescription !== undefined) {
            if (typeof updateData.courseDescription !== 'string') {
                return res.status(400).json({ success: false, message: 'Invalid course description' })
            }
            allowedUpdates.courseDescription = sanitizeHtml(updateData.courseDescription)
        }
        if (updateData.coursePrice !== undefined) {
            const coursePrice = Number(updateData.coursePrice)
            if (!Number.isFinite(coursePrice) || coursePrice < 0) {
                return res.status(400).json({ success: false, message: 'Invalid course price' })
            }
            allowedUpdates.coursePrice = coursePrice
        }
        if (updateData.discount !== undefined) {
            const discount = Number(updateData.discount)
            if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
                return res.status(400).json({ success: false, message: 'Discount must be between 0 and 100' })
            }
            allowedUpdates.discount = discount
        }
        if (updateData.courseContent !== undefined) {
            try {
                allowedUpdates.courseContent = validateCourseContent(updateData.courseContent)
            } catch (error) {
                return res.status(400).json({ success: false, message: error.message })
            }
        }
        if (req.file) {
            const imageUpload = await cloudinary.uploader.upload(req.file.path)
            allowedUpdates.courseThumbnail = imageUpload.secure_url
        }
        if (Object.keys(allowedUpdates).length === 0) {
            return res.status(400).json({ success: false, message: 'No valid course fields provided' })
        }

        const updatedCourse = await Course.findByIdAndUpdate(
            id,
            { $set: allowedUpdates },
            { new: true, runValidators: true }
        )
        res.json({ success: true, message: 'Course updated', course: updatedCourse })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

export const deleteCourse = async (req, res) => {
    try {
        const { id } = req.params
        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ success: false, message: 'Invalid course ID' })
        }

        const auth = await req.auth()
        const course = await Course.findById(id)
        if (!course) {
            return res.status(404).json({ success: false, message: 'Course not found' })
        }
        if (course.educator !== auth.userId) {
            return res.status(403).json({ success: false, message: 'You do not own this course' })
        }

        const completedPurchase = await Purchase.exists({
            courseId: course._id,
            status: 'completed'
        })
        if (completedPurchase || course.enrolledStudents.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Cannot delete a course with enrolled students or completed purchases'
            })
        }

        await CourseProgress.deleteMany({ courseId: id })
        await Purchase.deleteMany({ courseId: course._id, status: { $ne: 'completed' } })
        await Course.findByIdAndDelete(id)
        res.json({ success: true, message: 'Course deleted successfully' })
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}
