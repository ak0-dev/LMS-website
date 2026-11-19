import mongoose from "mongoose";
import Course from "../models/Course.js";

//Get all courses

export const getAllCourse = async(req,res)=>{
    try {
        const courses = await Course.find({
            isPublished:true
        }).select(['-courseContent','-enrolledStudents'])
            .populate({ path: 'educator', select: 'name imageUrl' })
        res.json({success:true, courses})
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}

//Get Course by Id

export const getCourseId = async(req,res)=>{
    const {id} = req.params

    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ success: false, message: 'Invalid course ID' })
    }

    try {
        const courseData = await Course.findOne({ _id: id, isPublished: true })
            .populate({ path: 'educator', select: 'name imageUrl' })

        if (!courseData) {
            return res.status(404).json({ success: false, message: 'Course not found' })
        }

        //remove lecurl if isPreview is false
        courseData.courseContent.forEach(chapter => {
            chapter.chapterContent.forEach(lecture => {
                if(!lecture.isPreviewFree){
                    lecture.lectureUrl =""
                }
            })
        })
        res.json({success:true, courseData})
    } catch (error) {
        res.status(500).json({ success: false, message: error.message })
    }
}