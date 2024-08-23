import mongoose from 'mongoose';

const eventSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  eventType: {
    type: String,
    enum: ['online', 'onsite'],
    required: true
  },
  price: {
    type: String,
    required: true
  },
  location: { 
    type: String,
    required: function() {
      return this.eventType === 'onsite';
    }
  },
  organizer: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'users', 
    required: true 
  },
  participants: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'users' 
  }],
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});

// Ensure that endDate is after startDate
eventSchema.pre('save', function (next) {
  if (this.endDate <= this.startDate) {
    return next(new Error('End date must be after start date'));
  }
  next();
});

export const eventModel = mongoose.model('events', eventSchema);
