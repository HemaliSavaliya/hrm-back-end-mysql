const connection = require("../config/config");

// add applicantList html mathi perfect work kare che
// module.exports.addApplicantList = async (req, res) => {
//     try {
//         const newApplicantList = new ApplicantList({
//             applicantName: req.body.applicantName,
//             applicantEmail: req.body.applicantEmail,
//             jobTitle: req.body.jobTitle,
//             phoneNumber: req.body.phoneNumber,
//             cv: req.body.cv,
//         });

//         const savedApplicantList = await newApplicantList.save();
//         res.status(200).json(savedApplicantList);
//     } catch (error) {
//         console.error("Error Adding Applicant List", error);
//         res.status(500).json({ error: "Internal Server Error" });
//     }
// }

module.exports.applicantList = async (req, res) => {
  try {
    const sql = "SELECT * FROM hrm_applicant_list";

    connection.query(sql, (err, results) => {
      if (err) {
        console.error("Error Fetching Applicant List", err);
        return res.status(500).json({ error: "Internal Server Error" });
      }

      if (results.length > 0) {
        res.status(200).json(results);
      } else {
        res.status(404).json({ error: "No Applicant List Found!" });
      }
    });
  } catch (error) {
    console.error("Error Fetching Applicant List", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};
