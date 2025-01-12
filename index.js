const express = require("express");
require("dotenv").config();
const mongoose = require("mongoose");
const cors = require("cors");

const PORT = 3000;

mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
  })
  .then(() => {
    console.log("Подключено к MongoDB");
  })
  .catch((error) => console.error("Ошибка подключения к MongoDB:", error));

const app = express();
app.use(express.json());

app.use(
  cors({
    origin: "*",
    credentials: true,
  })
);

app.options("*", cors());

const usersRouter = require("./routes/users");
const authRouter = require("./routes/auth");
const scheduleRouter = require("./routes/schedule");

app.use("/users", usersRouter);
app.use("/auth", authRouter);
app.use("/schedule", scheduleRouter);

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
