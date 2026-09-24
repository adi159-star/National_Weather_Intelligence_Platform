import mongoose from 'mongoose';

const weatherReportSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      required: true,
      index: true
    },
    userName: {
      type: String,
      default: ''
    },
    userEmail: {
      type: String,
      default: ''
    },
    eventType: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      required: true,
      trim: true
    },
    city: {
      type: String,
      default: '',
      trim: true
    },
    state: {
      type: String,
      default: '',
      trim: true
    },
    latitude: {
      type: Number,
      default: null
    },
    longitude: {
      type: Number,
      default: null
    },
    reportedAt: {
      type: Date,
      default: Date.now
    },
    verificationStatus: {
      type: String,
      enum: ['pending', 'verified', 'rejected'],
      default: 'pending'
    },
    aiClassification: {
      type: String,
      default: null
    },
    aiConfidence: {
      type: Number,
      default: null
    },
    isDuplicate: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

const WeatherReport = mongoose.model('WeatherReport', weatherReportSchema);

export default WeatherReport;
