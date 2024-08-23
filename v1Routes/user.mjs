import express from 'express';
import { errorCodes } from '../core.mjs';
import { userModel } from '../schema/userSchema.mjs';
import { eventModel } from '../schema/eventSchema.mjs';
import { isValidObjectId } from 'mongoose';
import { eventRegistrationModel } from '../schema/eventRegistrationSchema.mjs';
const router = express.Router();

router.get('/events', async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await userModel.findById(userId);
        if (!user) {
            res.status(401).send({
                message: "UNAUTHORIZED",
                errorCode: errorCodes.UNAUTHORIZED,
            })
            return;
        }
        const events = await eventModel.find({  }).lean();
        res.status(200).send({
            message: 'Events fetched Successfully',
            data: events,
            errorCode: errorCodes.SUCCESS,
        })
    } catch (error) {
        res.status(500).send({
            message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
            errorCode: errorCodes.UNKNOWN_SERVER_ERROR
        })
    }
})

router.post('/event/:eventId/register', async (req, res, next) => {
    try {
        const eventId = req.params.eventId;
        const userId = req.user._id;

        const user = await userModel.findById(userId);
        if (!user) {
            res.status(401).send({
                message: "UNAUTHORIZED",
                errorCode: errorCodes.UNAUTHORIZED,
            })
            return;
        }
        

        // Create a new route with the provided details
        const event = await eventModel.findById(eventId);

        if (!event) {
            res.status(404).send({
                message: 'Event not found',
                errorCode: errorCodes.EVENT_NOT_EXIST,
            })
        }

        const participation = await eventRegistrationModel.create({
            event: event._id,
            participant: userId,
            status: 'draft',
        })

        user.organizers.push(event.organizer);
        user.save();

        // Send success response
        res.status(200).send({
            message: 'Participation created Successfully',
            participation,
            errorCode: errorCodes.SUCCESS,
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send({
            message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
            errorCode: errorCodes.UNKNOWN_SERVER_ERROR,
        });
    }
});

router.get('/event/:eventId', async (req, res, next) => {
    try {
        const eventId = req?.params.eventId;
        const userId = req?.user._id;
        const user = await userModel.findOne({ _id: userId });
        if (!user) {
            res.status(401).send({
                message: "UNAUTHORIZED",
                errorCode: errorCodes.UNAUTHORIZED,
            });
            return;
        }

        if (!isValidObjectId(eventId)) {
            res.status(403).send({
                errorCode: errorCodes.INVALID_EVENT_ID,
                message: 'INVALID_EVENT_ID',
            });
            return;
        }

        const event = await eventModel.findById(eventId);
        res.status(200).send({
            message: 'Event',
            errorCode: errorCodes.SUCCESS,
            data: event,
        });
    } catch (error) {
        res.status(500).send({
            message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
            errorCode: errorCodes.UNKNOWN_SERVER_ERROR
        })
    }
})

router.put('/event-registrations/:registrationId/participate', async (req, res, next) => {
    try {
      const registrationId = req?.params?.registrationId;
      const userId = req.user._id;
      const user = await userModel.findById(userId);
      if (!user) {
        res.status(401).send({
          message: "UNAUTHORIZED",
          errorCode: errorCodes.UNAUTHORIZED,
        });
        return;
      }
      const registration = await eventRegistrationModel.findById(registrationId);
      if (!registration) {
        res.status(400).send({
          message: "REGISTRATION_NOT_EXIST",
          errorCode: errorCodes.REGISTRATION_NOT_EXIST,
        });
        return;
      }

      if (!registration.isPaid) {
        res.status(401).send({
          message: "Not allowed first complete the payment",
          errorCode: errorCodes.NOT_ALLOWED,
        });
        return;
      }
  
      registration.isParticipated = true;
      registration.save();
      // Send success response
      res.status(200).send({
        message: 'Participated Successfully',
        errorCode: errorCodes.SUCCESS,
      });
    } catch (error) {
      res.status(500).send({
        message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
        errorCode: errorCodes.UNKNOWN_SERVER_ERROR,
      });
    }
  });

router.delete('/event-registrations/:registrationId', async (req, res, next) => {
  try {
    const registrationId = req?.params?.registrationId;
    const userId = req.user._id;
    const user = await userModel.findById(userId);
    if (!user) {
      res.status(401).send({
        message: "UNAUTHORIZED",
        errorCode: errorCodes.UNAUTHORIZED,
      });
      return;
    }
    const registration = await eventRegistrationModel.findById(registrationId);
    if (!registration) {
      res.status(400).send({
        message: "REGISTRATION_NOT_EXIST",
        errorCode: errorCodes.REGISTRATION_NOT_EXIST,
      });
      return;
    }

    await eventRegistrationModel.findByIdAndDelete(registrationId);
    // Send success response
    res.status(200).send({
      message: 'registration cancelled Successfully',
      errorCode: errorCodes.SUCCESS,
    });
  } catch (error) {
    res.status(500).send({
      message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
      errorCode: errorCodes.UNKNOWN_SERVER_ERROR,
    });
  }
});

export default router;
