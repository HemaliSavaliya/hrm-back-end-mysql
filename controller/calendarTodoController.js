const connection = require("../config/config");

module.exports.addCreateTodos = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { name, color } = req.body;

            // Insert new Todo into the database
            const addTodo = "INSERT INTO hrm_calendartodo (companyId, name, color) VALUES (?, ?, ?)";

            connection.query(addTodo, [req.user.companyId, name, color], (err, result) => {
                if (err) {
                    console.error("Error adding new Todo", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ success: true, message: "Calendar Todo Added successfully" });
            });
        } else {
            // User is not an admin, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error Creating Calendar todos", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.updateTodos = async (req, res) => {
    try {
        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            const { name, color } = req.body;

            const todoId = req.params.id;

            // Update the calendar Todo in the database
            const updateTodoQuery = "UPDATE hrm_calendartodo SET name = ?, color = ? WHERE id = ?";

            connection.query(updateTodoQuery, [name, color, todoId], (err, result) => {
                if (err) {
                    console.error("Error updating the calendar todo", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ success: true, message: "Calendar Todo updated successfully" });
            });
        } else {
            // User is not an admin and HR, deny access
            res.status(403).json({ error: "Access Denied" });
        }
    } catch (error) {
        console.error("Error updating calendar todos", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.deleteTodos = async (req, res) => {
    try {
        const calendarTodoId = req.params.id;

        // Check if the user making the request is an admin
        if (req.user && (req.user.role === "Admin" || req.user.role === "HR")) {
            // Update calendar status to "Deleted" in the database
            const deleteTodoQuery = "UPDATE hrm_calendartodo SET deleted = true WHERE id= ?";

            connection.query(deleteTodoQuery, [calendarTodoId], (err, result) => {
                if (err) {
                    console.error("Error deleting Calendar Todo", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                res.status(200).json({ message: "Calendar Todo marked as deleted" });
            });
        } else {
            // User is not an admin and HR, deny access
            res.status(403).json({ error: 'Access Denied' });
        }
    } catch (error) {
        console.error("Error deleting todos", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.createTodosList = async (req, res) => {
    try {
        const sql = "SELECT * FROM hrm_calendartodo WHERE deleted = false AND companyId = ?";

        connection.query(sql, [req.user.companyId], (err, results) => {
            if (err) {
                console.error("Error Fetching Calendar Todo", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            if (results.length > 0) {
                res.status(200).json(results);
            } else {
                return res.status(404).json({ error: "No Calendar Todo Found!" });
            }
        });
    } catch (error) {
        console.error("Error Fetching Calendar Todos", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}