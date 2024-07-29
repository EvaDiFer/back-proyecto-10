const { isAuth, isAdmin } = require('../../middlewares/auth');
const upload = require('../../middlewares/file');
const {
  getUsers,
  register,
  login,
  deleteUser,
  getUserById,
  updateUser,
} = require('../controllers/userController');

const usersRoutes = require('express').Router();

usersRoutes.get('/', [isAdmin], getUsers);
usersRoutes.get('/:id', [isAuth], getUserById);
usersRoutes.post('/register', upload.single('profileImageUrl'), register);
usersRoutes.put('/:id', upload.single('profileImageUrl'), [isAuth], updateUser);
usersRoutes.post('/login', login);
usersRoutes.delete('/:userId', [isAdmin], deleteUser);

module.exports = usersRoutes;
