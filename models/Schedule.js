// models/Schedule.js
const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  roleName: { type: String, required: true }, // "1st", "2nd", "neuro"
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  points: { type: Number, default: 0 },
});

const ShiftSchema = new mongoose.Schema({
  shiftName: { type: String, required: true }, // B-Shift, C-Shift, 1st Shift, 2nd Shift
  roles: [RoleSchema],
});

const DaySchema = new mongoose.Schema({
  date: { type: Number, required: true },
  weekday: { type: Number },
  shifts: [ShiftSchema],
});

const ScheduleSchema = new mongoose.Schema({
  year: { type: Number, required: true },
  month: { type: Number, required: true },
  days: [DaySchema],
});

module.exports = mongoose.model("Schedule", ScheduleSchema);
