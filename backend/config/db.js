import mongoose from 'mongoose';
import dns from 'dns';

// Configure public DNS servers to resolve MongoDB Atlas SRV records reliably on Windows/Node
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  console.warn('DNS server override failed, using system resolver:', dnsErr.message);
}

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI || mongoURI === 'YOUR_MONGODB_CONNECTION_STRING') {
      console.warn('⚠️ Warning: MONGODB_URI is not configured in backend/.env. Please provide your MongoDB Atlas connection string.');
      return;
    }

    if (mongoURI.includes('<db_password>')) {
      console.warn('⚠️ Warning: <db_password> placeholder detected in backend/.env. Please replace <db_password> with your actual MongoDB database password.');
      return;
    }

    // Connect specifically to the 'weather_platform' database
    const conn = await mongoose.connect(mongoURI, {
      dbName: 'weather_platform'
    });

    console.log(`MongoDB connected successfully: ${conn.connection.host} (Database: ${conn.connection.name})`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
  }
};

export default connectDB;
