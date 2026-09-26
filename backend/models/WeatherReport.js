import mongoose from 'mongoose';

const weatherReportSchema = new mongoose.Schema(
  {
    userId: {
      type: String,
      default: null,
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
    // Data source attribution
    sourceType: {
      type: String,
      enum: ['citizen', 'weather_api', 'social', 'public_dataset'],
      default: 'citizen',
      index: true
    },
    sourceName: {
      type: String,
      default: 'Citizen Report',
      trim: true
    },
    sourceId: {
      type: String,
      default: null,
      trim: true
    },
    // Event information
    eventType: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    },
    // Nested content object
    content: {
      text: {
        type: String,
        default: '',
        trim: true
      },
      mediaUrl: {
        type: String,
        default: '',
        trim: true
      }
    },
    // Location information
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
    // Temporal information
    reportedAt: {
      type: Date,
      default: Date.now
    },
    // Processing information
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
    },
    duplicateOf: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'WeatherReport',
      default: null
    },
    similarityScore: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Pre-validate hook to synchronize description and content.text if one is provided
weatherReportSchema.pre('validate', function () {
  if (this.description && (!this.content || !this.content.text)) {
    if (!this.content) {
      this.content = { text: '', mediaUrl: '' };
    }
    this.content.text = this.description;
  } else if (this.content && this.content.text && !this.description) {
    this.description = this.content.text;
  }
});

const WeatherReport = mongoose.model('WeatherReport', weatherReportSchema);

export default WeatherReport;

