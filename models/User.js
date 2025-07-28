const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const dayOffSchema = new mongoose.Schema({
  date: { type: Date, required: true },
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["user", "admin"], default: "user" },
  level: { type: String, enum: ["R1", "R2", "R3", "R4"], required: true },
  points: { type: Number, default: 0 },
  dayOffs: [dayOffSchema], // массив выходных дней
  dayOffsCount: { type: Number, default: 2 }, // количество выходных дней
});

userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  next();
});

const User = mongoose.model("User", userSchema);
module.exports = User;
