import { Webhook } from "svix";
import User from "../models/User.js";
import Stripe from "stripe";
import { Purchase } from "../models/Purchase.js";
import Course from "../models/Course.js";

//Api Controller function

export const clerkWebhooks = async (req, res) => {
    try {
        const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET)

        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        const { data, type } = req.body
        switch (type) {
            case 'user.created': {
                const userData = {
                    _id: data.id,
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }
                await User.findByIdAndUpdate(data.id, userData, { upsert: true, new: true, setDefaultsOnInsert: true })
                res.json({ success: true })
                break;
            }
            case 'user.updated': {
                const userData = {
                    email: data.email_addresses[0].email_address,
                    name: data.first_name + " " + data.last_name,
                    imageUrl: data.image_url,
                }
                await User.findByIdAndUpdate(data.id, userData)
                res.json({ success: true })
                break;
            }
            case 'user.deleted': {
                await User.findByIdAndDelete(data.id)
                res.json({ success: true })
                break;
            }

            default:
                res.json({ success: true, message: 'Event ignored' })
                break;
        }
    } catch (error) {
        res.status(400).json({ success: false, message: error.message })
    }
}

const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY)

const completePurchaseEnrollment = async (purchaseId) => {
    const purchaseData = await Purchase.findById(purchaseId)
    if (!purchaseData) {
        return { status: 404, message: 'Purchase not found' }
    }
    if (purchaseData.status === 'completed') {
        return { status: 200, duplicate: true }
    }

    const userData = await User.findById(purchaseData.userId)
    const courseData = await Course.findById(purchaseData.courseId)
    if (!userData || !courseData) {
        return { status: 404, message: 'Enrollment data not found' }
    }

    if (!courseData.enrolledStudents.some(id => id === userData._id)) {
        courseData.enrolledStudents.push(userData._id)
        await courseData.save()
    }
    if (!userData.enrolledCourses.some(id => id.toString() === courseData._id.toString())) {
        userData.enrolledCourses.push(courseData._id)
        await userData.save()
    }

    purchaseData.status = 'completed'
    await purchaseData.save()
    return { status: 200, duplicate: false }
}

export const stripeWebhooks = async (request, response) => {
    const sig = request.headers['stripe-signature'];

    let event;

    try {
        event = Stripe.webhooks.constructEvent(request.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    }
    catch (err) {
        return response.status(400).send(`Webhook Error: ${err.message}`);
    }
    switch (event.type) {
    case 'checkout.session.completed': {
        const session = event.data.object
        if (session.payment_status !== 'paid') {
            return response.status(200).json({ received: true })
        }
        const purchaseId = session.metadata?.purchaseId
        if (!purchaseId) {
            return response.status(400).json({ success: false, message: 'Purchase metadata missing' })
        }
        const result = await completePurchaseEnrollment(purchaseId)
        if (result.status !== 200) {
            return response.status(result.status).json({ success: false, message: result.message })
        }
        break
    }
    case 'checkout.session.async_payment_failed': {
        const session = event.data.object
        const purchaseId = session.metadata?.purchaseId
        if (!purchaseId) {
            return response.status(400).json({ success: false, message: 'Purchase metadata missing' })
        }
        const purchaseData = await Purchase.findById(purchaseId)
        if (!purchaseData) {
            return response.status(404).json({ success: false, message: 'Purchase not found' })
        }
        if (purchaseData.status !== 'completed') {
            purchaseData.status = 'failed'
            await purchaseData.save()
        }
        break
    }
    case 'payment_intent.succeeded':{
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId
      })

            const purchaseId = session.data[0]?.metadata?.purchaseId;
            if (!purchaseId) {
                return response.status(400).json({ success: false, message: 'Purchase metadata missing' });
            }

      const purchaseData = await Purchase.findById(purchaseId)
            if (!purchaseData) {
                return response.status(404).json({ success: false, message: 'Purchase not found' });
            }
            if (purchaseData.status === 'completed') {
                return response.json({ received: true });
            }
      const userData = await User.findById(purchaseData.userId)
      const courseData = await Course.findById(purchaseData.courseId.toString())
            if (!userData || !courseData) {
                return response.status(404).json({ success: false, message: 'Enrollment data not found' });
            }

            if (!courseData.enrolledStudents.includes(userData._id)) {
                courseData.enrolledStudents.push(userData._id)
                await courseData.save()
            }
            if (!userData.enrolledCourses.some(courseId => courseId.toString() === courseData._id.toString())) {
                userData.enrolledCourses.push(courseData._id)
            }
      await userData.save()

      purchaseData.status = 'completed'
      await purchaseData.save()

      break;
    }
    case 'payment_intent.payment_failed':{
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id

      const session = await stripeInstance.checkout.sessions.list({
        payment_intent: paymentIntentId
      })

            const purchaseId = session.data[0]?.metadata?.purchaseId;
            if (!purchaseId) {
                return response.status(400).json({ success: false, message: 'Purchase metadata missing' });
            }

      const purchaseData = await Purchase.findById(purchaseId)
            if (!purchaseData) {
                return response.status(404).json({ success: false, message: 'Purchase not found' });
            }
      purchaseData.status = 'failed'
      await purchaseData.save()
      
      break;
    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  // Return a response to acknowledge receipt of the event
  response.json({received: true});
}