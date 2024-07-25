const { addCreateTodos, createTodosList, updateTodos, deleteTodos } = require('../controller/calendarTodoController');
const { authenticate } = require('../utils/authMiddleware');
const router = require('express').Router();

router.post("/todos", authenticate, addCreateTodos);
router.put("/update-todos/:id", authenticate, updateTodos);
router.delete("/delete-todos/:id", authenticate, deleteTodos);
router.get("/todosList", authenticate, createTodosList);

module.exports = router;