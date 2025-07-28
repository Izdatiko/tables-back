const { createEmptyRoles } = require("./createEmptyRole");

function generateDaysInRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = [];

  while (start <= end) {
    const jsDate = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate())
    );
    const weekday = jsDate.getUTCDay(); // День недели (0 = воскресенье)

    // Определяем смены в зависимости от дня недели
    let shifts;

    if (weekday === 5 || weekday === 6) {
      // Пятница или суббота
      shifts = [
        {
          shiftName: "B-Shift (8 AM - 8 PM)",
          roles: createEmptyRoles(),
          points: 14,
        },
        {
          shiftName: "C-Shift (8 PM - 8 AM)",
          roles: createEmptyRoles(),
          points: weekday === 5 ? 16 : 12,
        },
      ];
    } else {
      // Будние дни
      shifts = [
        {
          shiftName: "B-Shift (4 PM - 10 PM)",
          roles: createEmptyRoles(),
          points: 8,
        },
        {
          shiftName: "C-Shift (10 PM - 8 AM)",
          roles: createEmptyRoles(),
          points: weekday === 4 ? 12 : 10,
        },
      ];
    }

    days.push({
      date: jsDate.toISOString().split("T")[0], // Убираем время, оставляем только дату
      weekday,
      shifts,
    });

    start.setUTCDate(start.getUTCDate() + 1); // Переход к следующему дню (UTC)
  }

  return days;
}

module.exports = { generateDaysInRange };
