const mongoose = require('mongoose');
const { generateSign } = require('../../config/jwt');
const User = require('../models/users');
const bcrypt = require('bcrypt');
const Event = require('../models/events');
const cloudinary = require('cloudinary').v2;
const { deleteFile } = require('../../utils/deleteFile');

// Obtener todos los usuarios
const getUsers = async (req, res) => {
  try {
    // Población de eventos para obtener detalles en lugar de solo IDs
    const users = await User.find().populate('attendingEvents', 'title'); // 'title' es el campo del evento que quieres
    return res.status(200).json(users);
  } catch (error) {
    return res
      .status(500)
      .json({ error: 'No se pudieron obtener los usuarios' });
  }
};

module.exports = { getUsers };
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

// Registrar un nuevo usuario
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

// Iniciar sesión de usuario
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

// Eliminar un usuario
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

    // Obtener el usuario actual para acceder a la URL de la imagen de perfil existente
    const currentUser = await User.findById(id);
    if (!currentUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Crear el objeto de datos de actualización dinámicamente
    const updateData = { ...req.body };

    // Imprimir los datos recibidos para depuración
    console.log('Datos recibidos para actualización:', req.body);
    console.log(
      'Archivo recibido:',
      req.file ? req.file.path : 'No se recibió archivo'
    );

    // Si se ha subido una imagen, añadir la URL de la imagen al objeto de actualización
    if (req.file) {
      // Guardar la URL de la imagen anterior
      const oldImageUrl = currentUser.profileImageUrl;

      // Actualizar con la nueva URL de la imagen
      updateData.profileImageUrl = req.file.path;

      // Eliminar la imagen anterior de Cloudinary si existía
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

    // Verificar y actualizar la contraseña
    if (req.body.currentPassword && req.body.newPassword) {
      // Imprimir la contraseña actual y nueva para depuración
      console.log('Contraseña actual recibida:', req.body.currentPassword);
      console.log('Nueva contraseña recibida:', req.body.newPassword);

      // Verificar que la contraseña actual es correcta
      const isMatch = await bcrypt.compare(
        req.body.currentPassword,
        currentUser.password
      );
      if (!isMatch) {
        return res.status(400).json({ error: 'Contraseña actual incorrecta' });
      }

      // Asegúrate de que la nueva contraseña no esté vacía
      if (req.body.newPassword.trim() !== '') {
        updateData.password = bcrypt.hashSync(req.body.newPassword, 10);

        // Imprimir la nueva contraseña encriptada para depuración
        console.log('Nueva contraseña encriptada:', updateData.password);
      } else {
        return res
          .status(400)
          .json({ error: 'La nueva contraseña no puede estar vacía' });
      }
    }

    // Actualizar el usuario en la base de datos
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
