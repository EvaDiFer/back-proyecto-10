const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true },
    description: { type: String, required: true },
    imageUrl: { type: String },
    date: { type: Date, required: true },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'users',
      required: false,
    },
    attendants: [{ type: mongoose.Types.ObjectId, ref: 'users' }],
  },
  {
    timestamps: true,
    collection: 'events',
  }
);

const Event = mongoose.model('events', eventSchema, 'events');
module.exports = Event;
