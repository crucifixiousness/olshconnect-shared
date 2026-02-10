      <Modal open={open} onClose={handleClose}>
        <Box
          sx={{
            position: "relative",
            width: "90%",
            maxWidth: "600px",
            margin: "50px auto",
            backgroundColor: "white",
            borderRadius: "10px",
            padding: "20px",
            boxShadow: 24,
            maxHeight: "90vh",
            overflowY: "auto",
          }}
        >
          <Button
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: "10px",
              right: "10px",
              minWidth: "30px",
              minHeight: "30px",
              padding: "5px",
              fontSize: "1rem",
              backgroundColor: "transparent",
              color: "#000",
              border: "none",
              cursor: "pointer",
            }}
          >
            &times;
          </Button>

          <h2 style={{ textAlign: "center", marginBottom: "20px" }}>
            Edit Profile
          </h2>
          {!isEnrolled ? (
          <form onSubmit={handleEnroll}>
            <h4>Program</h4>
            <div className="mb-3">
              <FormControl fullWidth margin="normal" required>
                  <Select
                      name="program"
                      value={formData.program}
                      onChange={handleInputChange}
                      >
                      <MenuItem value="BEEd">Bacherlor of Elementary Education</MenuItem>
                      <MenuItem value="BSEd">Bacherlor of Secondary Education</MenuItem>
                      <MenuItem value="BSHM">Bacherlor of Science in Hospitality Management</MenuItem>
                      <MenuItem value="BSIT">Bacherlor of Science in Information Technolgy</MenuItem>
                      <MenuItem value="BSCrim">Bacherlor of Science in Criminology</MenuItem>
                  </Select>
              </FormControl>
            </div>
            <h4>Year Level</h4>
            <div className="mb-3">
              <FormControl fullWidth margin="normal" required>
                  <Select
                      name="yearLevel"
                      value={formData.yearLevel}
                      onChange={handleInputChange}
                      >
                      <MenuItem value="1st">1st Year</MenuItem>
                      <MenuItem value="2nd">2nd Year</MenuItem>
                      <MenuItem value="3rd">3rd Year</MenuItem>
                      <MenuItem value="4th">4th Year</MenuItem>
                  </Select>
              </FormControl>
            </div>
            <h4>Documents</h4>
            <div className="mb-3">
                <label htmlFor="idpic">Picture:</label>
                <input
                    type="file"
                    accept=".jpeg, .jpg"
                    className="form-control"
                    id="idpic"
                    name="idpic"
                    onChange={(e) => setFormData({ ...formData, idpic: e.target.files[0] })}
                    required
                    style={{ marginBottom: "20px" }}
                />
            </div>
            <div className="mb-3">
                <label htmlFor="birthCertificateDoc">Birth Certificate:</label>
                <input
                    type="file"
                    accept=".pdf, .jpeg, .jpg, .png"
                    className="form-control"
                    name="birthCertificateDoc"
                    onChange={(e) => setFormData({ ...formData, birthCertificateDoc: e.target.files[0] })}
                    required
                    style={{ marginBottom: "20px" }}
                />
            </div>
            <div className="mb-3">
                <label htmlFor="form137Doc">Form 137:</label>
                <input
                    type="file"
                    accept=".pdf, .jpeg, .jpg, .png"
                    className="form-control"
                    name="form137Doc"
                    onChange={(e) => setFormData({ ...formData, form137Doc: e.target.files[0] })}
                    required
                    style={{ marginBottom: "20px" }}
                />
            </div>                    
            <div style={{ textAlign: "center", marginTop: "20px" }}>
              <Button variant="contained" color="primary" type="submit">
                Enroll
              </Button>
            </div>
          </form>
          ) : (
          <Typography
              variant="h6"
              align="center"
              sx={{ color: "green", fontWeight: "bold", mt: 4 }}
              >
              {statusMessage.message}
          </Typography>
          )}
        </Box>
      </Modal>

const [studentData, setStudentData] = useState(null);
const [loading, setLoading] = useState(true);
const [open, setOpen] = useState(false); // Modal open/close state
const [formData, setFormData] = useState({});
const [isEditing, setIsEditing] = useState(false); // Flag to check if editing is in progress
const navigate = useNavigate();
const [formDataa, setFormDataa] = useState({
  idpic: '',
  birthCertificateDoc: '',
  form137Doc: '',
});

const token = localStorage.getItem('token'); 

const fetchStudentData = async () => {
  try {
    const response = await axios.get("http://localhost:4000/student/profile", {
      headers: { Authorization: `Bearer ${token}` },
    });
    setStudentData(response.data);
    setFormData(response.data); // Initialize formData with student data
    setLoading(false);
  } catch (error) {
    console.error("Error fetching student data:", error);
    setLoading(false);
  }
};

useEffect(() => {
  if (!token) {
    navigate("/login");
  } else {
    fetchStudentData();
  }
}, [token, navigate, fetchStudentData]);

const handleOpen = () => {
  setOpen(true);
  setIsEditing(true); // Set editing flag
};

const handleClose = () => {
  setOpen(false);
  setIsEditing(false);
};

const handleInputChange = (e) => {
  const { name, value } = e.target;

  if (name === 'birthdate') {
      const today = new Date();
      const selectedDate = new Date(value);

      // Check if the selected date is in the future
      if (selectedDate > today) {
          alert('Birthdate cannot be in the future');
          return; // Prevent updating the birthdate field if the date is in the future
      }

      // Calculate the age based on the birthdate
      const birthYear = selectedDate.getFullYear();
      const currentYear = today.getFullYear();
      let age = currentYear - birthYear;

      // Adjust age calculation if the birthday hasn't passed this year
      const birthMonth = selectedDate.getMonth();
      const currentMonth = today.getMonth();
      const birthDay = selectedDate.getDate();
      const currentDay = today.getDate();

      if (
          currentMonth < birthMonth ||
          (currentMonth === birthMonth && currentDay < birthDay)
      ) {
          age -= 1;
      }

      // Update form data with the new birthdate and calculated age
      setFormData({ ...formData, birthdate: value, age: age });
  } 
  // Restrict non-numeric inputs for first name, middle name, last name, suffix, place of birth, religion, and guardian name
  else if (['firstName', 'middleName', 'lastName', 'suffix', 'placeOfBirth', 'religion', 'guardianName'].includes(name)) {
      const validValue = value.replace(/[^a-zA-Z\s-]/g, '');
      setFormData({ ...formData, [name]: validValue });
  } 
  // Allow only numbers for the contact number, guardian contact, and age
  else if (name === 'number' || name === 'guardianContactNo') {
      let validNumber = value.replace(/[^0-9]/g, ''); // Remove non-numeric characters

      // Ensure the number starts with "09" and restrict to 11 digits
      if (validNumber.length > 11) {
          validNumber = validNumber.slice(0, 11); // Restrict to 11 digits
      }

      if (validNumber.length === 1 && validNumber !== '0') {
          validNumber = ''; // If the first digit is not 0, clear the field
      }

      if (validNumber.length === 2 && validNumber !== '09') {
          validNumber = '09'; // Ensure the number starts with "09"
      }

      setFormData({ ...formData, [name]: validNumber });

  } 
  // For other fields, no restriction
  else {
      setFormData({ ...formData, [name]: value });
  }
};

const [statusMessage, setStatusMessage] = useState({ message: "", type: "" });
const [isVisible, setIsVisible] = useState(false);
const [isEnrolled, setIsEnrolled] = useState(false);


const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    const response = await axios.put("http://localhost:4000/student/profile", formData, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setStudentData(response.data); // Update studentData with the latest data
    setOpen(false); // Close the modal
    setIsEditing(false);
    fetchStudentData(); // Reset editing flag
  } catch (error) {
    console.error('Error updating student data:', error);
  }
}

if (loading) {
  return <p>Loading your profile...</p>;
};

const handleFileChange = (e) => {
  const { name, files } = e.target;
  if (files && files[0]) {
      setFormDataa((prevFormData) => ({
          ...prevFormData,
          [name]: files[0],
      }));
  }
};

const handleEnroll = async (e) => {
    e.preventDefault();

    try {
        const formDataToSend = new FormData();
        Object.keys(formDataa).forEach((key) => {
            formDataToSend.append(key, formData[key]);
        });

        const response = await axios.post("http://localhost:4000/enroll", formDataToSend, {
            headers: { "Content-Type": "multipart/form-data" },
        });

        // Show success message
        setStatusMessage({ message: "Enrollment successful!", type: "success" });
        setIsVisible(true);
        setOpen(true);
        setIsEnrolled(true);

        // Clear form fields
        setFormDataa({
            programs: "",
            yearLevel: "",
            idpic: "",
            birthCertificateDoc: '',
            form137Doc: '',
        });
    } catch (error) {
        console.error(error);

        // Show error message
        setStatusMessage({ message: "Enrollment failed. Please try again.", type: "error" });
        setIsVisible(true);
    } finally {
        // Hide the notification after 3 seconds
        setTimeout(() => {
            setIsVisible(false);
            setOpen(false);
        }, 4000);
    }
};