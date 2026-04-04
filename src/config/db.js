import mongoose from 'mongoose';
import config, { MONGODB_URI } from './env.js';

export async function connectDB() {
  try {
    if (MONGODB_URI.startsWith('mongodb+srv://')) {
      const uriMatch = MONGODB_URI.match(/mongodb\+srv:\/\/[^@]+@([^/?]+)/);
      if (uriMatch) {
        console.log(`🔗 Connecting to MongoDB Atlas cluster: ${uriMatch[1]}`);
      }
    }

    await mongoose.connect(MONGODB_URI, {
      dbName: config.mongodb.dbName,
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 15000,
      retryWrites: true,
    });
    console.log('✅ MongoDB connected');
  } catch (error) {
    if (MONGODB_URI.startsWith('mongodb+srv://') && error.message.includes('ENOTFOUND')) {
      console.error('❌ MongoDB connection failed: DNS/SRV issue');
      console.error('   DNS/SRV issue. Check Windows DNS or try a standard mongodb:// URI.');
      console.error(`   Error: ${error.message}`);
    } else {
      console.error('❌ MongoDB connection failed:', error.message);
    }
    
    if (config.nodeEnv === 'production') {
      process.exit(1);
    } else {
      console.warn('⚠️  Development mode: Server will start but DB operations will fail.');
      throw error;
    }
  }
}



