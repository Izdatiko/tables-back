const { createEmptyRoles } = require("./createEmptyRole");

function createSkeletonSchedule(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate(); // Количество дней в месяце
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    // Создаём объект даты в UTC
    const jsDate = new Date(Date.UTC(year, month - 1, d));
    const weekday = jsDate.getUTCDay(); // День недели (0 = воскресенье)

    // Определяем смены в зависимости от дня недели
    let shifts;
    if (weekday === 5 || weekday === 6) {
      // Пятница или суббота
      shifts = [
        { shiftName: "B-Shift (8 AM - 8 PM)", roles: createEmptyRoles() },
        { shiftName: "C-Shift (8 PM - 8 AM)", roles: createEmptyRoles() },
      ];
    } else {
      // Будние дни
      shifts = [
        { shiftName: "B-Shift (4 PM - 10 PM)", roles: createEmptyRoles() },
        { shiftName: "C-Shift (10 PM - 8 AM)", roles: createEmptyRoles() },
      ];
    }

    // Добавляем корректно отформатированную дату
    days.push({ date: jsDate.toISOString(), weekday, shifts });
  }

  return {
    year,
    month,
    days,
  };
}

module.exports = { createSkeletonSchedule };
