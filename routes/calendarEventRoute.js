const { addCalendarEvent, calendarEventList, deleteCalendarEvent, updateCalendarEvent } = require('../controller/calendarEventController');
const { authenticate } = require('../utils/authMiddleware');
const router = require('express').Router();

router.post("/add-calendar-event", authenticate, addCalendarEvent);
router.put("/update-calendar-event/:id", authenticate, updateCalendarEvent);
router.delete("/delete-calendar-event/:id", authenticate, deleteCalendarEvent);
router.get("/calendar-event-list", authenticate, calendarEventList);

module.exports = router;