// Создаём наши вспомогательные функции (можно вынести в отдельный файл)
function createSkeletonSchedule(year, month) {
  const daysInMonth = new Date(year, month, 0).getDate();
  const days = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const jsDate = new Date(year, month - 1, d);
    const weekday = jsDate.getDay();
    let shifts;
    if (weekday === 5 || weekday === 6) {
      shifts = [
        { shiftName: "B-Shift (8 AM - 8 PM)", roles: createEmptyRoles() },
        { shiftName: "С-Shift (8 PM - 8 AM)", roles: createEmptyRoles() },
      ];
    } else {
      shifts = [
        { shiftName: "B-Shift (4 PM - 12 AM)", roles: createEmptyRoles() },
        { shiftName: "C-Shift (12 AM - 8 AM)", roles: createEmptyRoles() },
      ];
    }
    days.push({ date: d, weekday, shifts });
  }

  return {
    year,
    month,
    days,
  };
}

function createEmptyRoles() {
  return [
    { roleName: "1st", user: null },
    { roleName: "2nd", user: null },
    { roleName: "neuro", user: null },
  ];
}

module.exports = { createSkeletonSchedule };
