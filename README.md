# LMS Platform

A full-stack Learning Management System built with the MERN stack. The platform supports course creation, student enrollment, paid checkout, learning progress, ratings, educator dashboards, and media uploads.

## Features

- Clerk authentication with student and educator roles
- Educator role upgrade and protected educator dashboard
- Course creation with rich-text descriptions, chapters, lectures, thumbnails, pricing, and discounts
- Public course browsing and course details
- Stripe Checkout payments
- Stripe webhook-based enrollment confirmation
- Student enrollment list and course player
- Lecture completion and progress tracking
- Course ratings for enrolled students
- Educator course, enrollment, and earnings dashboards
- Cloudinary image uploads
- Vercel deployment configuration for client and server

## Tech Stack

- React and React Router
- Vite
- Tailwind CSS
- Node.js and Express
- MongoDB and Mongoose
- Clerk
- Stripe
- Cloudinary
- Multer
- Vercel

## Project Structure

```text
client/   React frontend
server/   Express API and MongoDB integration
```

The application uses four core MongoDB models:

- `User`
- `Course`
- `Purchase`
- `CourseProgress`

## Local Setup

### 1. Install dependencies

```bash
cd client
npm install

cd ../server
npm install
```

### 2. Configure environment variables

Create `client/.env`:

```env
VITE_BACKEND_URL=http://localhost:5000
VITE_CURRENCY=USD
VITE_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
```

Create `server/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_connection_string
CLIENT_URL=http://localhost:5173
CURRENCY=USD

CLERK_WEBHOOK_SECRET=your_clerk_webhook_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret

CLOUDINARY_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_SECRET_KEY=your_cloudinary_secret_key
```

Never commit environment files or secret keys to source control.

### 3. Start the application

Start the API:

```bash
cd server
npm start
```

Start the frontend in a second terminal:

```bash
cd client
npm run dev
```

The frontend runs at `http://localhost:5173` and the API runs at `http://localhost:5000`.

## API Overview

Public course endpoints:

- `GET /api/course/all`
- `GET /api/course/:id`

Authenticated user endpoints:

- `GET /api/user/data`
- `GET /api/user/enrolled-courses`
- `POST /api/user/purchase`
- `POST /api/user/update-course-progress`
- `POST /api/user/get-course-progress`
- `POST /api/user/add-rating`

Authenticated educator endpoints:

- `GET /api/educator/update-role`
- `POST /api/educator/add-course`
- `GET /api/educator/courses`
- `GET /api/educator/dashboard`
- `GET /api/educator/enrolled-students`

Webhook endpoints:

- `POST /clerk`
- `POST /stripe`

The Stripe endpoint requires the raw request body for signature verification. Configure Stripe to send payment events to the deployed `/stripe` endpoint.

## Validation

The client includes these scripts:

```bash
cd client
npm run lint
npm run build
```

The server JavaScript files can be syntax-checked with:

```bash
cd server
Get-ChildItem -Recurse -Filter *.js | ForEach-Object { node --check $_.FullName }
```

## Deployment

Deploy the `client` and `server` directories as separate Vercel projects, or configure them according to the included Vercel files. Set all required environment variables in the Vercel project settings.

For production deployment:

- Set `VITE_BACKEND_URL` to the deployed API URL.
- Set `CLIENT_URL` to the deployed frontend URL.
- Configure Clerk webhooks to call `/clerk`.
- Configure Stripe webhooks to call `/stripe`.
- Use production credentials and webhook signing secrets.

