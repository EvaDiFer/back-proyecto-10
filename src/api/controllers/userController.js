const mongoose = require('mongoose');
const { generateSign } = require('../../config/jwt');
const User = require('../models/users');
const bcrypt = require('bcrypt');
const Event = require('../models/events');
const cloudinary = require('cloudinary').v2;
const { deleteFile } = require('../../utils/deleteFile');

const getUsers = async (req, res) => {
  try {
    const users = await User.find().populate('attendingEvents', 'title');
    return res.status(200).json(users);
  } catch (error) {
    return res
      .status(500)
      .json({ error: 'No se pudieron obtener los usuarios' });
  }
};

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de usuario no válido' });
    }

    const user = await User.findById(id).populate('attendingEvents');

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(user);
  } catch (error) {
    return res
      .status(400)
      .json({ error: `Error al obtener el usuario: ${error.message}` });
  }
};

const register = async (req, res, next) => {
  try {
    const { userName, password, email } = req.body;

    const newUser = new User({
      userName,
      password,
      email,
      rol: 'user',
    });

    const duplicateUser = await User.findOne({ userName });

    if (duplicateUser) {
      return res
        .status(400)
        .json({ error: 'El nombre de usuario ya está en uso' });
    }

    const userSaved = await newUser.save();

    // Generate a token for the new user
    const token = generateSign(userSaved._id);

    return res.status(200).json({ user: userSaved, token });
  } catch (error) {
    console.error('Error al registrar usuario:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al procesar la solicitud de registro',
    });
  }
};

const login = async (req, res, next) => {
  try {
    const { userName, password } = req.body;

    const user = await User.findOne({ userName });

    if (!user) {
      return res.status(400).json({ error: 'Usuario no existente' });
    }

    if (bcrypt.compareSync(password, user.password)) {
      const token = generateSign(user._id);
      return res.status(200).json({ user, token });
    } else {
      return res.status(400).json({ error: 'La contraseña es incorrecta' });
    }
  } catch (error) {
    console.error('Error al iniciar sesión:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const deletedUser = await User.findByIdAndDelete(userId);
    if (!deletedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.status(200).json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error al eliminar usuario:', error);
    return res.status(500).json({
      error:
        'Error interno del servidor al procesar la solicitud de eliminación de usuario',
    });
  }
};
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    const updateData = { ...req.body };

    const isAdmin = currentUser.role === 'admin';

    if (!isAdmin) {
      delete updateData.role; //añadida condición: si no es admin, el campo rol se elimina.
    }

    if (req.file) {
      const oldImageUrl = currentUser.profileImageUrl;
      updateData.profileImageUrl = req.file.path;

      if (oldImageUrl) {
        try {
          await deleteFile(oldImageUrl);
        } catch (error) {
          console.error(
            'Error al eliminar la imagen anterior de Cloudinary:',
            error
          );
        }
      }
    }

    if (req.body.currentPassword && req.body.newPassword) {
      const isMatch = await bcrypt.compare(
        req.body.currentPassword,
        currentUser.password
      );
      if (!isMatch) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }

      if (req.body.newPassword.trim() !== '') {
        updateData.password = bcrypt.hashSync(req.body.newPassword, 10);
      } else {
        return res
          .status(400)
          .json({ error: 'La nueva contraseña no puede estar vacía' });
      }
    }

    const updatedUser = await User.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    if (!updatedUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    return res.status(500).json({
      error: 'Error interno del servidor al actualizar el usuario',
    });
  }
};

module.exports = {
  getUsers,
  getUserById,
  register,
  login,
  deleteUser,
  updateUser,
};
