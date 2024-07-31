const connection = require("../config/config");
const multer = require('multer');
const ftp = require("basic-ftp");

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'upload/profile');
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    }
});

const upload = multer({ storage: storage });

// Function to upload file to FTP server
async function uploadProfileToFTP(localFilePath, remoteFilePath) {
    const client = new ftp.Client();

    try {
        await client.access({
            host: process.env.FTP_HOST_NAME,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
        });

        await client.uploadFrom(localFilePath, remoteFilePath);
    } catch (error) {
        console.error(`Error uploading ${localFilePath}:`, error);
        throw error;
    } finally {
        client.close();
    }
}

// Function to download file to FTP server
async function downloadFileFromFTP(res, filename) {
    // Create a client to connect to the FTP server
    const client = new ftp.Client();
    
    // Retrieve the remote file path
    const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/profile/${filename}`;

    try {
        // Connect to the FTP server using credentials
        await client.access({
            host: process.env.FTP_HOST_NAME,
            user: process.env.FTP_USER,
            password: process.env.FTP_PASSWORD,
        });

        // Download the file to the temporary local file path
        await client.downloadTo(res, remoteFilePath);
    } catch (ftpError) {
        console.error(`Error fetching profile image from FTP: ${ftpError}`);
        res.status(500).json({ error: "Error fetching profile image from FTP" });
    } finally {
        // Ensure the FTP client is closed
        client.close();
    }
}

module.exports.profile = async (req, res) => {
    try {
        // Multer middleware to process the file upload
        upload.single("profileImage")(req, res, async function (err) {
            if (err) {
                console.error("Error uploading profile image", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            // Update employee data for add profile image into the database
            let sql;
            if (req.body.role === 'Admin') {
                sql = `UPDATE hrm_admins SET profileImage = ? WHERE id = ?`;
            } else {
                sql = `UPDATE hrm_employees SET profileImage = ? WHERE id = ?`;
            }

            connection.query(sql, [req.file.filename || null, req.body.id, req.body.role], async (err, result) => {
                if (err) {
                    console.error("Error adding profile image", err);
                    return res.status(500).json({ error: "Internal Server Error" });
                }

                const localFilePath = `./upload/profile/${req.file.filename}`;
                const remoteFilePath = `/domains/stackholic.com/public_html/HRM_Images/upload/profile/${req.file.filename}`

                await uploadProfileToFTP(localFilePath, remoteFilePath);

                res.status(200).json({ message: "Profile image added successfully" })
            })
        });
    } catch (error) {
        console.error("Error uploading profile", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.resetProfileImage = async (req, res) => {
    try {
        let updateProfileImage;
        if (req.body.role === 'Admin') {
            updateProfileImage = `UPDATE hrm_admins SET profileImage = null WHERE id = ?`;
        } else {
            updateProfileImage = `UPDATE hrm_employees SET profileImage = null WHERE id = ?`;
        }

        connection.query(updateProfileImage, [req.body.id, req.body.role], (err, result) => {
            if (err) {
                console.error("Error deleting profile image", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            res.status(200).json({ message: "Profile image deleted successfully" });
        });
    } catch (error) {
        console.error("Reset the Profile image failed", error);
        return res.status(500).json({ error: "Internal Server Error" });
    }
}

module.exports.getProfileImage = async (req, res) => {
    try {
        // Get the user ID from the request parameters
        const userId = req.params.id;

        // Determine the role of the logged-in user (assuming role is stored in req.user.role)
        const userRole = req.params.role; // Assuming role is stored in req.user.role

        // Query the database to get the profile image filename from the user ID
        let sql;
        if (userRole === 'Admin') {
            // Query the admin table for admin's profile image
            sql = `SELECT profileImage FROM hrm_admins WHERE id = ?`;
        } else {
            // For HR and employee roles, query the employee table
            sql = `SELECT profileImage FROM hrm_employees WHERE id = ?`;
        }

        connection.query(sql, [userId], async (err, result) => {
            if (err) {
                console.error("Error fetching profile image", err);
                return res.status(500).json({ error: "Internal Server Error" });
            }

            // Get the filename of the profile image from the database result
            const profileImageFile = result[0]?.profileImage;

            if (!profileImageFile) {
                return res.status(404).json({ error: "Profile image not found" });
            }

            await downloadFileFromFTP(res, profileImageFile);
        });
    } catch (error) {
        console.error(`Error fetching profile image: ${error}`);
        return res.status(500).json({ error: "Internal Server Error" });
    }
};