const { compareSync } = require('bcrypt');
const { verifyJwt } = require('../../config/jwt');
const { deleteFile } = require('../../utils/deleteFile');
const Event = require('../models/events');
const mongoose = require('mongoose');
const User = require('../models/users');

const getEvents = async (req, res, next) => {
  try {
    const allEvents = await Event.find()
      .populate('createdBy', 'userName')
      .populate('attendants', 'userName');
    return res.status(200).json(allEvents);
  } catch (err) {
    return res
      .status(400)
      .json({ error: `Error al obtener eventos: ${err.message}` });
  }
};

const getEventById = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'ID de evento no válido' });
    }

    const event = await Event.findById(id)
      .populate('createdBy', 'userName')
      .populate('attendants', 'userName');

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    return res.status(200).json(event);
  } catch (err) {
    return res
      .status(400)
      .json({ error: `Error al obtener evento: ${err.message}` });
  }
};

const createEvent = async (req, res, next) => {
  try {
    console.log(req.body);

    // Validar campos requeridos
    if (!req.body.title || !req.body.description || !req.body.date) {
      return res.status(400).json({ error: 'Campos requeridos faltantes' });
    }

    const newEvent = new Event({
      title: req.body.title,
      description: req.body.description,
      date: req.body.date,
      createdBy: req.body.createdBy,
    });

    if (req.file) {
      newEvent.imageUrl = req.file.path;
    }

    const eventSaved = await newEvent.save();
    return res.status(201).json(eventSaved);
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .json({ error: `Error al crear evento: ${err.message}` });
  }
};

const updateEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updatedData = { ...req.body };

    if (req.file) {
      const eventToUpdate = await Event.findById(id);
      if (!eventToUpdate) {
        return res.status(404).json({ error: 'Evento no encontrado' });
      }

      if (eventToUpdate.imageUrl) {
        await deleteFile(eventToUpdate.imageUrl);
      }
      updatedData.imageUrl = req.file.path;
    }

    const updatedEvent = await Event.findByIdAndUpdate(id, updatedData, {
      new: true,
    });

    if (!updatedEvent) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    return res.status(200).json(updatedEvent);
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .json({ error: `Error al actualizar evento: ${err.message}` });
  }
};

const deleteEvent = async (req, res, next) => {
  try {
    const { id } = req.params;
    const eventToRemove = await Event.findByIdAndDelete(id);

    if (!eventToRemove) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (eventToRemove.imageUrl) {
      await deleteFile(eventToRemove.imageUrl);
    }

    return res.status(200).json({
      message: 'Evento eliminado correctamente',
      event: eventToRemove,
    });
  } catch (err) {
    console.error(err);
    return res
      .status(400)
      .json({ error: `Error al eliminar evento: ${err.message}` });
  }
};

const addAttendant = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(eventId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res
        .status(400)
        .json({ error: 'ID de evento o usuario no válido' });
    }

    const event = await Event.findById(eventId);

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    if (event.attendants.includes(userId)) {
      return res
        .status(400)
        .json({ error: 'El usuario ya está en la lista de asistentes' });
    }

    event.attendants.push(userId);
    await event.save();

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (!user.attendingEvents.includes(eventId)) {
      user.attendingEvents.push(eventId);
      await user.save();
    }

    return res
      .status(200)
      .json({ message: 'Usuario añadido como asistente al evento' });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Error al añadir asistente: ${error.message}` });
  }
};

const removeAttendant = async (req, res, next) => {
  try {
    const { eventId } = req.params;
    const { userId } = req.body;

    if (
      !mongoose.Types.ObjectId.isValid(eventId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res
        .status(400)
        .json({ error: 'ID de evento o usuario no válido' });
    }

    const event = await Event.findById(eventId).populate(
      'attendants',
      'userName'
    );

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    // Verificar si el usuario está en la lista de asistentes
    const userIndex = event.attendants.findIndex(
      (attendant) => attendant._id.toString() === userId
    );
    if (userIndex === -1) {
      return res
        .status(400)
        .json({ error: 'El usuario no está en la lista de asistentes' });
    }

    // Remover al usuario de la lista de asistentes y guardar el evento
    event.attendants.splice(userIndex, 1);
    await event.save();

    // Buscar el usuario por ID
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Verificar si el evento está en la lista de eventos a los que el usuario asiste
    const eventIndex = user.attendingEvents.findIndex(
      (event) => event._id.toString() === eventId
    );
    if (eventIndex !== -1) {
      // Remover el evento de la lista de eventos del usuario
      user.attendingEvents.splice(eventIndex, 1);
      await user.save();
    }

    // Devolver respuesta exitosa
    return res
      .status(200)
      .json({ message: 'Asistencia cancelada exitosamente', event });
  } catch (error) {
    return res
      .status(500)
      .json({ error: `Error al cancelar asistencia: ${error.message}` });
  }
};

const getAttendeesByEvent = async (req, res, next) => {
  try {
    const { eventId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(eventId)) {
      return res.status(400).json({ error: 'ID de evento no válido' });
    }

    // Continuar con la búsqueda del evento por ID
    const event = await Event.findById(eventId).populate(
      'attendants',
      'userName'
    );

    if (!event) {
      return res.status(404).json({ error: 'Evento no encontrado' });
    }

    return res.status(200).json(event.attendants);
  } catch (error) {
    console.error('Error al obtener asistentes para el evento:', error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

module.exports = {
  getEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  addAttendant,
  removeAttendant,
  getAttendeesByEvent,
};
