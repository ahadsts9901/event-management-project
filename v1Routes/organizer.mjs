import express from 'express';
import { errorCodes } from '../core.mjs';
import { userModel } from '../schema/userSchema.mjs';
import { eventModel } from '../schema/eventSchema.mjs';
import { isValidObjectId } from 'mongoose';
const router = express.Router();

router.get('/my-events', async (req, res) => {
    try {
        const userId = req.user._id;
        const user = await userModel.findOne({ _id: userId, role: 'organizer'});
        if (!user) {
            res.status(401).send({
                message: "UNAUTHORIZED",
                errorCode: errorCodes.UNAUTHORIZED,
            })
            return;
        }
        const events = await eventModel.find({ organizer: userId }).lean();
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

router.post('/event', async (req, res, next) => {
    try {
        const { title, description, startTime, endTime, date, eventType, price } = req?.body;
        const userId = req.user._id;

        const user = await userModel.findOne({ _id: userId, role: 'organizer' });
        if (!user) {
            res.status(401).send({
                message: "UNAUTHORIZED",
                errorCode: errorCodes.UNAUTHORIZED,
            })
            return;
        }
        
        // Check if all required parameters are provided
        if (!title || !description || !startTime || !endTime || !date || !eventType || !price) {
            res.status(403).send({
                message: "REQUIRED_PARAMETER_MISSING",
                errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            });
            return;
        }

        if (!eventType === 'online' || !eventType ==='onsite') {
            res.status(403).send({
                message: 'invalid event type value',
                errorCode: errorCodes.INVALID_EVENT_TYPE,
            });
            return;
        }

        // Convert time strings to Date objects
        const startDateTime = new Date(date + 'T' + startTime + ':00');
        const endDateTime = new Date(date + 'T' + endTime + ':00');

        if (eventType === 'onsite' && !req.body.location) {
            res.status(403).send({
                message: 'required field location missing',
                errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            });
            return;
        }

        // Create a new route with the provided details
        const event = await eventModel.create({
            title,
            description,
            startTime,
            endTime,
            organizer: userId,
            eventType,
            price,
        });

        if (eventType === 'onsite' && !req.body.location) {
            res.status(403).send({
                message: 'required field location missing',
                errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            });
            return;
        }

        event.location = req.body.location;
        event.save();

        // Send success response
        res.status(200).send({
            message: 'Event created Successfully',
            errorCode: errorCodes.SUCCESS,
        });
    } catch (error) {
        // Handle any errors and send an error response
        console.log(error.message);
        res.status(500).send({
            message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
            errorCode: errorCodes.UNKNOWN_SERVER_ERROR,
        });
    }
});

router.get('/my-event/:eventId', async (req, res, next) => {
    try {
        const eventId = req?.params.eventId;
        const userId = req?.user._id;
        const user = await userModel.findOne({ _id: userId, role: 'organizer' });
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

router.put('/event/:eventId', async (req, res, next) => {
  try {
    const eventId = req?.params?.eventId;
    const userId = req.user._id;
    const user = await userModel.findOne({ _id: userId, role: 'organizer' });
    if (!user) {
      res.status(401).send({
        message: "UNAUTHORIZED",
        errorCode: errorCodes.UNAUTHORIZED,
      });
      return;
    }
    const event = await eventModel.findById(eventId);
    if (!event) {
      res.status(400).send({
        message: "EVENT_NOT_EXIST",
        errorCode: errorCodes.EVENT_NOT_EXIST,
      });
      return;
    }
    // Check if date is provided
    if (req.body.startTime || req.body.endTime) {
      if (!req.body.date) {
        res.status(404).send({
          message: "DATE_FIELD_MISSING",
          errorCode: errorCodes.DATE_FIELD_MISSING,
        });
        return;
      }
    }
    // Update the route with the provided details
    const updateData = {};
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.price) updateData.price = req.body.price;
    if (req.body.eventType) {
        if (req.body.eventType === 'online') {
            updateData.eventType = req.body.eventType;
            updateData.location = '';
        } else if (req.body.eventType === 'onsite') {
            if (!req.body.location) {
                res.status(403).send({
                    message: 'required field location is missing',
                    errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
                });
                return;
            }

            updateData.eventType = req.body.eventType;
            updateData.location = req.body.location;
        }
    }
    if (req.body.startTime) {
      updateData.startTime = new Date(req.body.date + 'T' + req.body.startTime + ':00');
    } else if (req.body.date) {
      updateData.startTime = new Date(req.body.date + 'T' + event.startTime.toISOString().slice(11, 16) + ':00');
    }
    if (req.body.endTime) {
      updateData.endTime = new Date(req.body.date + 'T' + req.body.endTime + ':00');
    } else if (req.body.date) {
      updateData.endTime = new Date(req.body.date + 'T' + event.endTime.toISOString().slice(11, 16) + ':00');
    }
    await eventModel.findByIdAndUpdate(event._id, updateData);
    // Send success response
    res.status(200).send({
      message: 'Event updated Successfully',
      errorCode: errorCodes.SUCCESS,
    });
  } catch (error) {
    res.status(500).send({
      message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
      errorCode: errorCodes.UNKNOWN_SERVER_ERROR,
    });
  }
});

router.delete('/event/:eventId', async (req, res, next) => {
    try {
        const eventId = req?.params.eventId;
        const userId = req.user._id;
        const user = await userModel.findOne({ _id: userId, role: 'organizer' });
        if (!user) {
            res.status(401).send({
                message: "UNAUTHORIZED",
                errorCode: errorCodes.UNAUTHORIZED,
            })
            return;
        }
        if (!eventId || !isValidObjectId(eventId)) {
            res.status(403).send({
                message: "REQUIRED_PARAMETER_MISSING or invalid",
                errorCode: errorCodes.REQUIRED_PARAMETER_MISSING,
            })
            return;
        }
        await eventModel.findByIdAndDelete(eventId);
        res.status(200).send({
            message: "Event Deleted Successfully",
            errorCode: errorCodes.SUCCESS
        })
    } catch (error) {
        res.status(500).send({
            message: `UNKNOWN_SERVER_ERROR: ${error.message}`,
            errorCode: errorCodes.UNKNOWN_SERVER_ERROR
        })
    }
})

export default router;
