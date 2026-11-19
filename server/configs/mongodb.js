import mongoose from "mongoose";

//Connect to mongodb

const connectDB = async () => {
    mongoose.connection.on('connected', ()=> console.log('Database connected'))

    const mongoUri = process.env.MONGODB_URI
    if (!mongoUri) {
        throw new Error('MONGODB_URI is not configured')
    }

    const [uriWithoutQuery, query] = mongoUri.includes('?')
        ? mongoUri.split(/(?=\?)/)
        : [mongoUri, '']
    const protocolSeparator = uriWithoutQuery.indexOf('://')
    const authorityAndPath = uriWithoutQuery.slice(protocolSeparator + 3)
    const hasDatabasePath = authorityAndPath.includes('/')
    const databaseUri = hasDatabasePath ? uriWithoutQuery : `${uriWithoutQuery}/lms`

    await mongoose.connect(`${databaseUri}${query}`)
}

export default connectDB