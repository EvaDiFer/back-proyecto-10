const eventRoutes = require('./eventRoutes');
const usersRoutes = require('./userRoutes');

const mainRouter = require('express').Router();

mainRouter.use('/users', usersRoutes);
mainRouter.use('/events', eventRoutes);

module.exports = mainRouter;
