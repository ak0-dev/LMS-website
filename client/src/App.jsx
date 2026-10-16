import { lazy, Suspense } from 'react'
import { Route, Routes, useMatch } from 'react-router-dom'
import Navbar from './components/student/Navbar'
import Loading from './components/student/Loading'
import "quill/dist/quill.snow.css"
import { ToastContainer } from "react-toastify";

const CourseDetails = lazy(() => import('./pages/student/CourseDetails'))
const CourseList = lazy(() => import('./pages/student/CourseList'))
const Home = lazy(() => import('./pages/student/Home'))
const MyEnrollments = lazy(() => import('./pages/student/MyEnrollments'))
const Player = lazy(() => import('./pages/student/Player'))
const Educator = lazy(() => import('./pages/educator/Educator'))
const Dashboard = lazy(() => import('./pages/educator/Dashboard'))
const AddCourses = lazy(() => import('./pages/educator/AddCourse'))
const MyCourses = lazy(() => import('./pages/educator/MyCourses'))
const StudentEnrolled = lazy(() => import('./pages/educator/StudentEnrolled'))

const App = () => {

  const isEducatorRoute = useMatch('/educator/*')

  return (

    <div className='text-default min-h-screen bg-white'>
      <ToastContainer/>
      {!isEducatorRoute && <Navbar/>}
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route path='/' element={<Home />} />
          <Route path='/course-list' element={<CourseList />} />
          <Route path='/course-list/:input' element={<CourseList />} />
          <Route path='/course/:id' element={<CourseDetails />} />
          <Route path='/my-enrollments' element={<MyEnrollments />} />
          <Route path='/player/:courseId' element={<Player />} />
          <Route path='/loading/:path' element={<Loading />} />
          <Route path='/educator' element={<Educator />}>
            <Route path='/educator' element={<Dashboard />} />
            <Route path='add-course' element={<AddCourses />} />
            <Route path='my-courses' element={<MyCourses />} />
            <Route path='student-enrolled' element={<StudentEnrolled />} />
          </Route>
        </Routes>
      </Suspense>
    </div>
  )
}

export default App