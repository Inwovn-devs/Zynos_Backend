const mongoose = require('mongoose');

const connectDB = async () => {
  let retries = 5;

  while (retries > 0) {
    try {
      const conn = await mongoose.connect(process.env.MONGODB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
      });

      console.log(`MongoDB Connected: ${conn.connection.host}`);

      mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
      });

      mongoose.connection.on('disconnected', () => {
        console.warn('MongoDB disconnected. Attempting to reconnect...');
        connectDB();
      });

      return;
    } catch (error) {
      console.error(`MongoDB connection failed. Retries left: ${retries - 1}`);
      console.error(error.message);
      retries -= 1;

      if (retries === 0) {
        console.error('Could not connect to MongoDB. Exiting...');
        process.exit(1);
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
};

module.exports = connectDB;
