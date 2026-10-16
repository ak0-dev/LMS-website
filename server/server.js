import express from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks, stripeWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoutes.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoutes.js'

//Initialize express
const app = express()

//connect to db
await connectDB()
await connectCloudinary()


//Middlewares
app.use(cors({
    origin: process.env.CLIENT_URL || 'http://localhost:5173'
}))
app.use(clerkMiddleware())

//Route
app.get('/', (req, res) => {
    res.send("Api Working")
})
app.post('/clerk', express.json(), clerkWebhooks)
app.use('/api/educator',express.json(),educatorRouter)
app.use('/api/course', express.json(), courseRouter)
app.use('/api/user', express.json(), userRouter)
app.post('/stripe', express.raw({type: 'application/json'}), stripeWebhooks)


const PORT = process.env.PORT || 5000

if (!process.env.VERCEL) {
    app.listen(PORT, () => {
        console.log(`Server is running on port ${PORT}`)
    })
}

export default app


