const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.SECRET_KEY || "your-secret-key";
const User = require("../models/User"); // Подключите вашу модель пользователя

// Проверка аутентификации
async function isAuthenticated(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Unauthorized" });

  try {
    // Декодируем токен и получаем ID пользователя
    const decoded = jwt.verify(token, SECRET_KEY);
    const user = await User.findById(decoded.id); // Запрашиваем пользователя по ID

    if (!user) return res.status(404).json({ error: "User not found" });

    req.user = user; // Передаем пользователя в req.user
    next();
  } catch (error) {
    console.error("Authentication error:", error.message);
    res.status(401).json({ error: "Invalid token" });
  }
}

// Проверка роли администратора
function isAdmin(req, res, next) {
  isAuthenticated(req, res, async () => {
    console.log(req.user); // Теперь в req.user есть вся информация о пользователе
    if (!req.user.role === "admin")
      return res.status(403).json({ error: "Forbidden: Admins only" });
    next();
  });
}

module.exports = { isAuthenticated, isAdmin };
