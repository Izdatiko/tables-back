const express = require("express");
const router = express.Router();
const User = require("../models/User");

// 1. Создание выходного дня
router.post("/", async (req, res) => {
  try {
    const { userId, date } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ message: "User ID and date are required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const year = parsedDate.getFullYear();
    const month = parsedDate.getMonth();

    // Проверка на количество dayOffs в текущем месяце
    const currentMonthDayOffs = user.dayOffs.filter((dayOff) => {
      const dayOffDate = new Date(dayOff.date);
      return (
        dayOffDate.getFullYear() === year && dayOffDate.getMonth() === month
      );
    });

    if (currentMonthDayOffs.length >= user.dayOffsCount) {
      return res.status(400).json({
        message: `User cannot have more than ${user.dayOffsCount} day-offs in this month`,
      });
    }

    // Добавление нового day-off
    user.dayOffs.push({ date: parsedDate });

    await user.save();

    return res
      .status(201)
      .json({ message: "Day-off added successfully", user });
  } catch (error) {
    console.error("POST /dayoffs error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// 2. Удаление выходного дня
router.delete("/:userId/:id", async (req, res) => {
  try {
    const { userId, id } = req.params; // ID dayOff в массиве

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.dayOffs = user.dayOffs.filter(
      (dayOff) => dayOff._id.toString() !== id
    );
    await user.save();

    return res
      .status(200)
      .json({ message: "Day-off removed successfully", user });
  } catch (error) {
    console.error("DELETE /dayoffs error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// 3. Получение всех выходных пользователя
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({ dayOffs: user.dayOffs });
  } catch (error) {
    console.error("GET /dayoffs/:userId error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// 4. Обновление выходного дня
router.put("/:id", async (req, res) => {
  try {
    const { id } = req.params; // ID dayOff в массиве
    const { userId, date } = req.body;

    if (!userId || !date) {
      return res.status(400).json({ message: "User ID and date are required" });
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const dayOffIndex = user.dayOffs.findIndex(
      (dayOff) => dayOff._id.toString() === id
    );

    if (dayOffIndex === -1) {
      return res.status(404).json({ message: "Day-off not found" });
    }

    user.dayOffs[dayOffIndex].date = parsedDate;
    await user.save();

    return res
      .status(200)
      .json({ message: "Day-off updated successfully", user });
  } catch (error) {
    console.error("PUT /dayoffs/:id error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
