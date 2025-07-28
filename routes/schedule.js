// routes/schedule.js
const express = require("express");
const router = express.Router();
const DaySchedule = require("../models/Schedule");
const { isAuthenticated } = require("../middlewares/auth");
const { createSkeletonSchedule } = require("../utils/createSkeletonSchedule");
const { generateDaysInRange } = require("../utils/generateDaysInRange");
const User = require("../models/User");

function checkUserEligibility(roleName, userLevel) {
  // Определяем, какие уровни могут быть у каждого типа тела
  const levelRules = {
    "1st": ["R1", "R2"],
    "2nd": ["R3", "R4"],
    neuro: ["R1", "R2", "R3", "R4"],
  };

  // Проверяем роль и соответствие уровню пользователя
  return levelRules[roleName]?.includes(userLevel);
}

router.get("/", isAuthenticated, async (req, res) => {
  try {
    const { startDate, endDate, year, month } = req.query;

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res
          .status(400)
          .json({ message: "Invalid startDate or endDate" });
      }

      if (start > end) {
        return res
          .status(400)
          .json({ message: "startDate cannot be greater than endDate" });
      }

      // Устанавливаем границы дня
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);

      // Получаем существующие дни
      let days = await DaySchedule.find({
        date: { $gte: start, $lte: end },
      })
        .populate("shifts.roles.user", "username role level")
        .sort({ date: 1 });

      // Приводим даты в Set для быстрого поиска (ISO без времени)
      const existingDates = new Set(
        days.map((day) => day.date.toISOString().split("T")[0])
      );

      // Генерируем все даты диапазона
      const allDates = generateDaysInRange(start, end).map((day) => {
        const dateObj = new Date(day.date);
        return {
          ...day,
          date: dateObj.toISOString().split("T")[0], // Только день, без времени
          weekday: dateObj.getUTCDay(), // День недели (0 - воскресенье, 6 - суббота)
        };
      });

      // Определяем отсутствующие даты
      const missingDates = allDates.filter(
        (day) => !existingDates.has(day.date)
      );

      if (missingDates.length) {
        // Проверка перед вставкой, чтобы избежать дубликатов
        const existingDaysInDB = await DaySchedule.find({
          date: { $in: missingDates.map((d) => new Date(d.date)) },
        });

        const finalMissingDays = missingDates
          .filter(
            (day) =>
              !existingDaysInDB.some(
                (d) => d.date.toISOString().split("T")[0] === day.date
              )
          )
          .map((day) => ({
            date: new Date(day.date),
            weekday: day.weekday, // Добавляем день недели в новую запись
            shifts: day.shifts,
          }));

        if (finalMissingDays.length > 0) {
          await DaySchedule.insertMany(finalMissingDays);
          days = await DaySchedule.find({
            date: { $gte: start, $lte: end },
          })
            .populate("shifts.roles.user", "username role level")
            .sort({ date: 1 });
        }
      }

      return res.json(days);
    }

    if (!year || !month) {
      return res.status(400).json({ message: "Year and month are required" });
    }

    // Получаем первый день месяца
    const startDateByMonth = new Date(year, month - 1, 1);

    // Получаем последний день месяца
    const endDateByMonth = new Date(year, month, 1); // This gives the last day of the previous month, so it's correct.

    // Adjust the time to the end of the last day of the month
    endDateByMonth.setUTCHours(23, 59, 59, 999); // Ensure we capture the last moment of the last day

    // Получаем существующие дни
    let days = await DaySchedule.find({
      date: { $gte: startDateByMonth, $lte: endDateByMonth },
    })
      .populate("shifts.roles.user", "username role level")
      .sort({ date: 1 });

    // Приводим даты в Set для быстрого поиска (ISO без времени)
    const existingDates = new Set(
      days.map((day) => day.date.toISOString().split("T")[0])
    );

    // Генерируем все даты месяца
    const allDates = generateDaysInRange(startDateByMonth, endDateByMonth).map(
      (day) => {
        console.log(day);

        const dateObj = new Date(day.date);
        return {
          ...day,
          date: dateObj.toISOString().split("T")[0], // Только день, без времени
          weekday: dateObj.getUTCDay(), // День недели (0 - воскресенье, 6 - суббота)
        };
      }
    );

    // Определяем отсутствующие даты
    const missingDates = allDates.filter((day) => !existingDates.has(day.date));

    if (missingDates.length) {
      // Повторная проверка перед вставкой, чтобы избежать коллизий
      const existingDaysInDB = await DaySchedule.find({
        date: { $in: missingDates.map((d) => new Date(d.date)) },
      });

      const finalMissingDays = missingDates
        .filter(
          (day) =>
            !existingDaysInDB.some(
              (d) => d.date.toISOString().split("T")[0] === day.date
            )
        )
        .map((day) => ({
          date: new Date(day.date),
          weekday: day.weekday, // Добавляем день недели в новую запись
          shifts: day.shifts,
        }));

      if (finalMissingDays.length > 0) {
        await DaySchedule.insertMany(finalMissingDays);
        days = await DaySchedule.find({
          date: { $gte: startDateByMonth, $lte: endDateByMonth },
        })
          .populate("shifts.roles.user", "username role level")
          .sort({ date: 1 });
      }
    }

    return res.json(days);
  } catch (error) {
    console.error("GET /api/schedule error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/assign", async (req, res) => {
  try {
    const { date, shiftName, roleName, userId, points } = req.body;

    const userExists = await User.findById(userId);
    if (!userExists) {
      return res.status(400).json({ message: "User not found" });
    }

    const targetDate = new Date(date);
    const formattedDate = targetDate.toISOString().split("T")[0];

    const userDayOffExists = userExists.dayOffs.some((dayOff) => {
      const dayOffDate = new Date(dayOff.date).toISOString().split("T")[0];
      return dayOffDate === formattedDate;
    });

    if (userDayOffExists) {
      return res
        .status(400)
        .json({ message: `User has a day off on ${formattedDate}` });
    }

    let daySchedule = await DaySchedule.findOne({ date: targetDate });

    if (!daySchedule) {
      return res
        .status(404)
        .json({ message: `Day ${formattedDate} not found in schedule` });
    }

    const shiftObj = daySchedule.shifts.find((s) => s.shiftName === shiftName);
    if (!shiftObj) {
      return res.status(404).json({ message: `Shift ${shiftName} not found` });
    }

    const roleObj = shiftObj.roles.find((r) => r.roleName === roleName);
    if (!roleObj) {
      return res.status(404).json({ message: `Role ${roleName} not found` });
    }

    roleObj.user = userId;
    roleObj.points = points || 10;

    userExists.points += roleObj.points;

    await userExists.save();
    await daySchedule.save();

    const updatedSchedule = await DaySchedule.findById(
      daySchedule._id
    ).populate("shifts.roles.user", "username role level points");

    return res.status(200).json({
      message: "User assigned successfully, points updated",
      schedule: updatedSchedule,
    });
  } catch (error) {
    console.error("POST /api/schedule/assign error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Функция для вычисления "взвешенных" очков пользователя
// Для R4 мы умножаем текущее количество очков на 2, для остальных — оставляем без изменений.
// Функция для вычисления «эффективного» счёта пользователя.
// Для R4 – raw очки умножаем на 2, для остальных оставляем без изменений.
router.post("/generateFromTo", async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    if (!startDate || !endDate) {
      return res
        .status(400)
        .json({ message: "Start and end dates are required" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res
        .status(400)
        .json({ message: "Start date must be before end date" });
    }

    // Генерируем скелет расписания (учитывая день недели и тип смены)
    const skeletonSchedule = generateDaysInRange(start, end);

    // Получаем и перемешиваем пользователей
    let users = await User.find({ role: "user" });
    if (!users.length) {
      return res
        .status(400)
        .json({ message: "No users available for assignment" });
    }
    users = users.sort(() => Math.random() - 0.5);

    // Инициализируем для каждого пользователя баланс очков в рамках расписания
    users.forEach((user) => {
      user.totalPoints = 0; // абсолютное количество начисленных очков
    });

    // Создаем объект с 5 массивами для каждого возможного значения shift.points (14, 16, 12, 8, 10)
    const buckets = {
      14: [],
      16: [],
      12: [],
      10: [],
      8: [],
    };

    // Основной цикл по дням, сменам и ролям
    for (let dayIndex = 0; dayIndex < skeletonSchedule.length; dayIndex++) {
      const day = skeletonSchedule[dayIndex];

      for (const shift of day.shifts) {
        for (const role of shift.roles) {
          // Фильтруем пользователей по условиям:
          // 1. Нет выходного в этот день.
          // 2. Не назначен в другую смену этого дня.
          // 3. Не работал в предыдущий день.
          // 4. Соответствует требованиям для роли (checkUserEligibility).
          let eligibleUsers = users.filter((user) => {
            // Проверка: нет выходного в этот день
            const hasDayOff =
              user.dayOffs &&
              user.dayOffs.some((dayOff) => {
                const dayOffDate = new Date(dayOff.date)
                  .toISOString()
                  .split("T")[0];
                return (
                  dayOffDate === new Date(day.date).toISOString().split("T")[0]
                );
              });
            if (hasDayOff) return false;

            // Проверка: не назначен в другую смену в тот же день
            const assignedElsewhere = day.shifts.some((otherShift) => {
              if (otherShift.shiftName === shift.shiftName) return false;
              return otherShift.roles.some(
                (r) => r.user && r.user._id.toString() === user._id.toString()
              );
            });
            if (assignedElsewhere) return false;

            // Проверка: не работал в предыдущий день
            const previousDay = skeletonSchedule[dayIndex - 1];
            if (previousDay) {
              const workedPrev = previousDay.shifts.some((prevShift) =>
                prevShift.roles.some(
                  (r) => r.user && r.user._id.toString() === user._id.toString()
                )
              );
              if (workedPrev) return false;
            }

            // Проверка: соответствует требованиям для роли
            return checkUserEligibility(role.roleName, user.level);
          });

          if (!eligibleUsers.length) {
            return res.status(400).json({
              message: `Not enough eligible users for ${new Date(
                day.date
              ).toLocaleDateString()} - ${shift.shiftName}`,
            });
          }

          // Выбор кандидата:
          // Для расчета «взвешенной» суммы, для R4 пользователей умножаем totalPoints на 2.
          const candidate = eligibleUsers.reduce((minUser, currentUser) => {
            const minWeighted =
              minUser.level === "R4"
                ? minUser.totalPoints * 2
                : minUser.totalPoints;
            const currentWeighted =
              currentUser.level === "R4"
                ? currentUser.totalPoints * 2
                : currentUser.totalPoints;
            return currentWeighted < minWeighted ? currentUser : minUser;
          }, eligibleUsers[0]);

          // Назначаем кандидата в расписании
          role.user = {
            _id: candidate._id,
            username: candidate.username,
            level: candidate.level,
          };
          role.points = shift.points;

          // Обновляем баланс пользователя – начисляем полное значение shift.points
          candidate.totalPoints += shift.points;

          // Записываем назначение в соответствующий bucket
          buckets[shift.points].push({
            userId: candidate._id,
            username: candidate.username,
            assignedDay: day.date,
            shift: shift.shiftName,
            role: role.roleName,
            points: shift.points,
          });
        }
      }
    }

    // Результаты: возвращаем расписание, buckets и суммарные баллы пользователей.
    return res.status(200).json({
      message: "Schedule generated successfully",
      schedule: skeletonSchedule,
      buckets,
      userPoints: users.map((u) => ({
        id: u._id,
        username: u.username,
        totalPoints: u.totalPoints,
      })),
    });
  } catch (error) {
    console.error("POST /generateFromTo error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

router.post("/confirmFromTo", async (req, res) => {
  try {
    const { schedule } = req.body;

    if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
      return res
        .status(400)
        .json({ message: "Schedule is required and must contain days" });
    }

    // Сортируем входные данные по дате
    schedule.sort((a, b) => new Date(a.date) - new Date(b.date));

    console.log(schedule);

    // Обновляем или вставляем записи, предотвращая дублирование
    for (const day of schedule) {
      const dayDate = day.date;

      // Try to find the existing day and update it, if exists
      const existingDay = await DaySchedule.findOne({ date: dayDate });

      if (existingDay) {
        // Если день уже существует, обновляем его
        await DaySchedule.updateOne(
          { date: dayDate }, // Ищем день по дате
          { $set: { weekday: day.weekday, shifts: day.shifts } } // Обновляем смены
        );
      } else {
        // Если день не найден, создаем новый
        await DaySchedule.create({
          date: dayDate,
          weekday: day.weekday,
          shifts: day.shifts,
        });
      }
    }

    // Обновление очков пользователей
    const userPointsUpdates = schedule.flatMap((day) =>
      day.shifts.flatMap((shift) =>
        shift.roles
          .filter((role) => role.user && role.user._id)
          .map((role) => ({
            updateOne: {
              filter: { _id: role.user._id },
              update: { $inc: { points: role.points } },
            },
          }))
      )
    );

    if (userPointsUpdates.length > 0) {
      await User.bulkWrite(userPointsUpdates);
    }

    return res.status(200).json({
      message:
        "Schedule confirmed and saved successfully for the specified range",
    });
  } catch (error) {
    console.error("POST /confirmFromTo error:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

module.exports = router;
