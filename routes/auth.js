const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();

const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";

router.post("/register", async (req, res) => {
  const { username, password, isAdmin, level } = req.body;
  try {
    const user = new User({ username, password, isAdmin, level });
    await user.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const token = jwt.sign(
      { id: user._id, isAdmin: user.isAdmin },
      SECRET_KEY,
      {
        expiresIn: "1d",
      }
    );
    res.status(200).json({ token, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
