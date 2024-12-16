const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");

// Создание пользователя — доступно только админам
router.post("/", isAdmin, async (req, res) => {
  try {
    const { username, password, role, level } = req.body;
    const newUser = new User({ username, password, role, level });
    await newUser.save();
    res.status(201).json(newUser);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Чтение всех пользователей — доступно только авторизованным
router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { username } = req.query;

    if (username) {
      const users = await User.find({
        username: { $regex: username, $options: "i" },
      });
      return res.status(200).json(users);
    }
    const users = await User.find();
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Чтение одного пользователя — доступно только авторизованным
router.get("/:id", isAuthenticated, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Обновление пользователя — доступно только админам
router.put("/:id", isAdmin, async (req, res) => {
  try {
    const updates = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, updates, {
      new: true,
    });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Удаление пользователя — доступно только админам
router.delete("/:id", isAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
