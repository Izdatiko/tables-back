const mongoose = require("mongoose");

const RoleSchema = new mongoose.Schema({
  roleName: { type: String, required: true }, // "1st", "2nd", "neuro"
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  points: { type: Number, default: 0 },
});

const ShiftSchema = new mongoose.Schema({
  shiftName: { type: String, required: true }, // B-Shift, C-Shift, 1st Shift, 2nd Shift
  roles: [RoleSchema],
  points: { type: Number, default: 0 },
});

const DaySchema = new mongoose.Schema({
  date: { type: Date, required: true }, // Полный объект даты
  weekday: { type: Number }, // День недели
  shifts: [ShiftSchema],
});

module.exports = mongoose.model("DaySchedule", DaySchema);
