const express = require("express");
const router = express.Router();
const User = require("../models/User");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");

const validateDayOffs = (dayOffs, dayOffsCount) => {
  const monthYearMap = new Map();

  dayOffs.forEach((item) => {
    const parsedDate = new Date(item.date);
    if (isNaN(parsedDate)) {
      throw new Error(`Invalid date format: ${item.date}`);
    }

    const formattedDate = parsedDate.toISOString().split("T")[0]; // Формат YYYY-MM-DD
    const monthYear = `${parsedDate.getFullYear()}-${parsedDate.getMonth()}`;

    if (!monthYearMap.has(monthYear)) {
      monthYearMap.set(monthYear, new Set());
    }

    const daysInMonth = monthYearMap.get(monthYear);

    if (daysInMonth.has(formattedDate)) {
      throw new Error(`Duplicate date found: ${formattedDate}`);
    }

    daysInMonth.add(formattedDate);

    if (daysInMonth.size > dayOffsCount) {
      throw new Error(
        `User cannot have more than ${dayOffsCount} day-offs in a month (${monthYear})`
      );
    }
  });

  return dayOffs.map((item) => ({ date: new Date(item.date) }));
};

// Создание пользователя — доступно только админам
router.post("/", async (req, res) => {
  try {
    const { username, password, role, level, dayOffs, dayOffsCount } = req.body;

    const formattedDayOffs = validateDayOffs(dayOffs || [], dayOffsCount || 1);

    // Создание пользователя
    const newUser = new User({
      username,
      password,
      role,
      level,
      dayOffs: formattedDayOffs,
    });

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
