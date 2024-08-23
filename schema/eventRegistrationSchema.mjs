import mongoose from 'mongoose';

const eventRegistrationSchema = new mongoose.Schema({
  isPaid: {
    type: Boolean,
    default: false
  },
  isParticipated: {
    type: Boolean,
    default: false
  },
  event: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'events', 
    required: true 
  },
  participant: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'users' 
  },
  status: {
    type: String,
    Enum: ['draft', 'completed'],
    default: 'draft'
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  }
});


export const eventRegistrationModel = mongoose.model('registrations', eventRegistrationSchema);
