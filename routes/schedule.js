// routes/schedule.js
const express = require("express");
const router = express.Router();
const Schedule = require("../models/Schedule");
const { isAuthenticated } = require("../middlewares/auth");
const { createSkeletonSchedule } = require("../utils/createSkeletonSchedule");
const User = require("../models/User");

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { year, month, userId, shiftName, roleName, date } = req.query;

    if (!year || !month) {
      return res.status(400).json({ message: "Missing year or month query" });
    }

    const filter = { year: Number(year), month: Number(month) };

    let schedule = await Schedule.findOne(filter).populate(
      "days.shifts.roles.user",
      "username role level"
    );

    if (!schedule) {
      schedule = createSkeletonSchedule(Number(year), Number(month));

      if (userId && shiftName && roleName && date) {
        const dayObj = schedule.days.find((d) => d.date === Number(date));
        if (!dayObj) {
          return res.status(404).json({ message: `Day ${date} not found` });
        }

        const shiftObj = dayObj.shifts.find((s) => s.shiftName === shiftName);
        if (!shiftObj) {
          return res
            .status(404)
            .json({ message: `Shift ${shiftName} not found` });
        }

        const roleObj = shiftObj.roles.find((r) => r.roleName === roleName);
        if (!roleObj) {
          return res
            .status(404)
            .json({ message: `Role ${roleName} not found` });
        }

        roleObj.user = userId;
      }

      const newSchedule = new Schedule(schedule);
      await newSchedule.save();
      schedule = await Schedule.findById(newSchedule._id).populate(
        "days.shifts.roles.user",
        "username role level"
      );
    }

    return res.json(schedule);
  } catch (error) {
    console.error("GET /api/schedule error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/assign", async (req, res) => {
  try {
    const { year, month, date, shiftName, roleName, userId, points } = req.body;

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(400).json({ message: "User not found" });
    }

    let schedule = await Schedule.findOne({ year, month });
    if (!schedule) {
      return res
        .status(404)
        .json({ message: "Schedule not found for this month" });
    }

    const dayObj = schedule.days.find((d) => d.date === Number(date));
    if (!dayObj) {
      return res
        .status(404)
        .json({ message: `Day ${date} not found in schedule` });
    }

    const shiftObj = dayObj.shifts.find((s) => s.shiftName === shiftName);
    if (!shiftObj) {
      return res.status(404).json({ message: `Shift ${shiftName} not found` });
    }

    const roleObj = shiftObj.roles.find((r) => r.roleName === roleName);
    if (!roleObj) {
      return res.status(404).json({ message: `Role ${roleName} not found` });
    }

    roleObj.user = userId;

    const pointsToAdd = points || 10;
    roleObj.points = pointsToAdd;

    userExists.points += pointsToAdd;

    await userExists.save();
    await schedule.save();

    const updatedSchedule = await Schedule.findById(schedule._id).populate(
      "days.shifts.roles.user",
      "username role level points"
    );

    return res.status(200).json({
      message: "User assigned successfully, points updated",
      schedule: updatedSchedule,
    });
  } catch (error) {
    console.error("POST /api/schedule/assign error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
