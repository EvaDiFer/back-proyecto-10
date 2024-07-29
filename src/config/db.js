const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log(' perfecto!😉 conectado con éxito a la bbdd');
  } catch (error) {
    console.log('Algo ha salido mal');
  }
};

module.exports = { connectDB };
