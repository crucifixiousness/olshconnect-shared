import React, { useEffect, useContext, useState, useRef } from 'react';
import { MyContext } from '../../App';
import homepagebg from '../../asset/images/olshcohomebg.jpg';
import schoolbg from '../../asset/images/olshcodiamond.jpg';
import schoolbgg from '../../asset/images/olshcoold.jpg';
import educ from '../../asset/images/pineduc.jpg';
import educc from '../../asset/images/pineducc.jpg';
import it from '../../asset/images/pinit.jpg';
import hm from '../../asset/images/pinhm.jpg';
import crim from '../../asset/images/pincrimm.jpg';
import oad from '../../asset/images/pinoad.jpg';
import courses from '../../asset/images/courses.png';
import { Link } from "react-router-dom";
import logo from '../../asset/images/olshco-logo1.png';
import announcement from '../../asset/images/anno.png';
import { Modal, Button, Box, TextField, MenuItem, Typography, Checkbox, FormControlLabel, Grid, Snackbar, Alert, Select, FormControl, IconButton, InputAdornment, InputLabel } from "@mui/material";
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import axios from "axios";
import { regions, provinces, cities, barangays } from 'select-philippines-address';
import { sendVerificationEmail } from '../../utils/emailService';

// Honeypot detection for registration
const detectMaliciousRegistration = (fields) => {
  const suspiciousUsernames = [
    'admin', 'root', 'administrator', 'guest', 'user', 'demo',
    'sqlmap', 'hacker', 'attacker', 'malware', 'virus', 'backdoor'
  ];
  const suspiciousPasswords = [
    'admin', '123456', 'password', 'root', 'toor', 'guest',
    '123456789', 'qwerty', 'abc123', 'password123', 'admin123'
  ];
  const sqlInjectionPatterns = [
    "' OR '1'='1", "' OR 1=1--", "admin'--", "admin'/*", 
    "' UNION SELECT", "'; DROP TABLE", "'; INSERT INTO",
    "1' OR '1'='1", "1' OR 1=1#", "admin' #"
  ];
  const xssPatterns = [
    "<script>", 
    // eslint-disable-next-line no-script-url
    "javascript:", "onload=", "onerror=", "onclick=",
    "<img src=x onerror=", "<svg onload=", "alert(", "confirm("
  ];

  // Check all fields for suspicious patterns
  for (const [key, value] of Object.entries(fields)) {
    if (!value) continue;
    
    // Ensure value is a string before calling toLowerCase()
    const stringValue = String(value);
    const val = stringValue.toLowerCase();
    
    // For usernames, check for exact matches or very specific patterns
    if (key === 'userName') {
      // Check for exact matches with suspicious usernames
      if (suspiciousUsernames.includes(val)) {
        return { detected: true, type: 'Suspicious Username', pattern: value, field: key };
      }
      // Check for usernames that start with suspicious patterns
      if (suspiciousUsernames.some(susp => val.startsWith(susp + '_') || val.startsWith(susp + '1') || val.startsWith(susp + '2'))) {
        return { detected: true, type: 'Suspicious Username', pattern: value, field: key };
      }
    }
    
    // For passwords, check for exact matches
    if (key === 'password') {
      if (suspiciousPasswords.includes(val)) {
        return { detected: true, type: 'Suspicious Password', pattern: value, field: key };
      }
    }
    
    // Check for SQL injection and XSS patterns (these should remain as includes for security)
    if (sqlInjectionPatterns.some(pattern => val.includes(pattern.toLowerCase()))) {
      return { detected: true, type: 'SQL Injection Attempt', pattern: value, field: key };
    }
    if (xssPatterns.some(pattern => val.includes(pattern.toLowerCase()))) {
      return { detected: true, type: 'XSS Attempt', pattern: value, field: key };
    }
  }
  return { detected: false };
};

const Homepage = () => {
    /* eslint-disable no-unused-vars */
  const { setIsHideComponents } = useContext(MyContext);

    useEffect(() => {
        // Ensure header and sidebar are visible for this page
        setIsHideComponents(true);

        // Clean up when leaving the component
        return () => setIsHideComponents(true);
    }, [setIsHideComponents]);

    const [showModal, setShowModal] = useState(false);
    const [open, setOpen] = useState(false);
    const [verificationModal, setVerificationModal] = useState(false);
    const [verificationType, setVerificationType] = useState(''); // 'email' or 'phone'
    const [verificationCode, setVerificationCode] = useState('');
    const [isEmailVerified, setIsEmailVerified] = useState(false);
    const [phoneValidation, setPhoneValidation] = useState({ isValid: null, message: '' });
    const [guardianPhoneValidation, setGuardianPhoneValidation] = useState({ isValid: null, message: '' });
    const [verificationLoading, setVerificationLoading] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [duplicateValidation, setDuplicateValidation] = useState({
        username: { exists: false, checking: false },
        email: { exists: false, checking: false },
        contact_number: { exists: false, checking: false },
        guardian_contact_no: { exists: false, checking: false }
    });
    const usernameTimeoutRef = useRef(null);
    const emailTimeoutRef = useRef(null);
    const privacyPolicyRef = useRef(null);
    const [passwordStrength, setPasswordStrength] = useState({ score: 0, feedback: '' });
    const [currentStep, setCurrentStep] = useState(1);
    const totalSteps = 6;
    
    const handleOpen = () => {
        // Reset modal state so it always opens with a fresh form
        setIsRegistered(false);
        setIsEmailVerified(false);
        setPhoneValidation({ isValid: null, message: '' });
        setGuardianPhoneValidation({ isValid: null, message: '' });
        setVerificationType('');
        setVerificationCode('');
        setDuplicateValidation({
            username: { exists: false, checking: false },
            email: { exists: false, checking: false },
            contact_number: { exists: false, checking: false },
            guardian_contact_no: { exists: false, checking: false }
        });
        setPasswordStrength({ score: 0, feedback: '' });
        setCurrentStep(1);
        setOpen(true);
    };
    const handleClose = () => {
        setOpen(false);
        // Also reset when closing to avoid stale success screen next open
        setIsRegistered(false);
        setIsEmailVerified(false);
        setPhoneValidation({ isValid: null, message: '' });
        setGuardianPhoneValidation({ isValid: null, message: '' });
        setVerificationType('');
        setVerificationCode('');
        setDuplicateValidation({
            username: { exists: false, checking: false },
            email: { exists: false, checking: false },
            contact_number: { exists: false, checking: false },
            guardian_contact_no: { exists: false, checking: false }
        });
        setPasswordStrength({ score: 0, feedback: '' });
        setCurrentStep(1);
    };
    const handleVerificationOpen = (type) => {
        console.log('🔘 Verify button clicked for type:', type);
        console.log('📧 Email value:', formData.email);
        setVerificationType(type);
        setVerificationModal(true);
        setVerificationCode('');
        
        // Automatically send verification code when modal opens
        if (type === 'email') {
            sendVerificationCode(type);
        }
    };
    const handleVerificationClose = () => {
        setVerificationModal(false);
        setVerificationCode('');
        setVerificationType('');
    };

    const [isSidebarOpen, setIsSidebarOpen] = useState(false); // State to manage sidebar visibility

    // Toggle the sidebar visibility
    const toggleSidebar = () => {
        setIsSidebarOpen(prevState => !prevState);
    };

    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'success'
      });
    
    const handleSnackbarClose = () => {
        setSnackbar({ ...snackbar, open: false });
      };

    

    const [formData, setFormData] = useState({
        userName: '',
        password: '',
        confirmPassword: '',
        firstName: '',
        middleName: '',
        lastName: '',
        suffix: '',
        sex: '',
        birthdate: '',
        age: '',
        placeOfBirth: '',
        religion: '',
        email: '',
        number: '',
        street_text: '',
        guardianName: '',
        guardianContactNo: '',
    });

    // Address state for select-philippines-address
    const [address, setAddress] = useState({
        region: '',
        province: '',
        city: '',
        barangay: ''
    });

    // Address display names for the full address text
    const [addressNames, setAddressNames] = useState({
        region: '',
        province: '',
        city: '',
        barangay: ''
    });

    // Dropdown data state
    const [regionData, setRegionData] = useState([]);
    const [provinceData, setProvinceData] = useState([]);
    const [cityData, setCityData] = useState([]);
    const [barangayData, setBarangayData] = useState([]);

    // Load regions on component mount
    useEffect(() => {
        const loadRegions = async () => {
            try {
                const regionsList = await regions();
                setRegionData(regionsList);
            } catch (error) {
                console.error('Error loading regions:', error);
            }
        };
        loadRegions();
    }, []);

    // Load provinces when region changes
    useEffect(() => {
        const loadProvinces = async () => {
            if (address.region) {
                try {
                    const provincesList = await provinces(address.region);
                    setProvinceData(provincesList);
                } catch (error) {
                    console.error('Error loading provinces:', error);
                }
            } else {
                setProvinceData([]);
            }
        };
        loadProvinces();
    }, [address.region]);

    // Load cities when province changes
    useEffect(() => {
        const loadCities = async () => {
            if (address.province) {
                try {
                    const citiesList = await cities(address.province);
                    setCityData(citiesList);
                } catch (error) {
                    console.error('Error loading cities:', error);
                }
            } else {
                setCityData([]);
            }
        };
        loadCities();
    }, [address.province]);

    // Load barangays when city changes
    useEffect(() => {
        const loadBarangays = async () => {
            if (address.city) {
                try {
                    const barangaysList = await barangays(address.city);
                    setBarangayData(barangaysList);
                } catch (error) {
                    console.error('Error loading barangays:', error);
                }
            } else {
                setBarangayData([]);
            }
        };
        loadBarangays();
    }, [address.city]);

    // Update form data when address selections change
    useEffect(() => {
        const addressParts = [
            addressNames.barangay,
            addressNames.city,
            addressNames.province
        ].filter(Boolean); // Remove empty values
        
        const fullAddress = addressParts.join(', ');
        
        setFormData(prev => ({
            ...prev,
            street_text: fullAddress
        }));
    }, [addressNames]);

    const handleInputChange = (e) => {
        let { name, value } = e.target;
    
        // Validate password strength when password changes
        if (name === 'password') {
            setFormData({ ...formData, [name]: value });
            validatePasswordStrength(value);
            return;
        }
    
        // Check for duplicates when username changes
        if (name === 'userName') {
            setFormData({ ...formData, [name]: value });
            // Clear previous timeout
            if (usernameTimeoutRef.current) {
                clearTimeout(usernameTimeoutRef.current);
            }
            // Debounce duplicate check for username
            usernameTimeoutRef.current = setTimeout(() => {
                checkDuplicate('username', value);
            }, 500);
            return;
        }
        
        // Check for duplicates when email changes
        if (name === 'email') {
            setFormData({ ...formData, [name]: value });
            // Clear previous timeout
            if (emailTimeoutRef.current) {
                clearTimeout(emailTimeoutRef.current);
            }
            // Debounce duplicate check for email
            emailTimeoutRef.current = setTimeout(() => {
                checkDuplicate('email', value);
            }, 500);
            return;
        }
    
        if (name === 'birthdate') {
            const today = new Date();
            const selectedDate = new Date(value);
    
            // Check if the selected date is in the future
            if (selectedDate > today) {
                setSnackbar({
                    open: true,
                    message: "Birthdate cannot be in the future",
                    severity: 'error'
                });
                return; // Prevent updating the birthdate field if the date is in the future
            }
    
            // Calculate the age based on the birthdate
            let birthYear = selectedDate.getFullYear();
            let currentYear = today.getFullYear();
            let age = currentYear - birthYear;
    
            // Ensure age calculation accounts for whether the birthday has passed this year
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

            // Check age restrictions (17-50 years old)
            if (age < 17) {
                setSnackbar({
                    open: true,
                    message: "Invalid age",
                    severity: 'error'
                });
                return; // Prevent updating the birthdate field if age is less than 17
            }
            
            if (age > 50) {
                setSnackbar({
                    open: true,
                    message: "Invalid age",
                    severity: 'error'
                });
                return; // Prevent updating the birthdate field if age is more than 50
            }

            // Set the form data with the new birthdate and calculated age
            setFormData({ ...formData, birthdate: value, age: age }); 
        } 
        // Restrict non-numeric inputs for first name, middle name, last name, suffix, place of birth, and religion
        else if (['firstName', 'middleName', 'lastName', 'suffix', 'placeOfBirth', 'religion'].includes(name)) {
            const validValue = value.replace(/[^a-zA-Z\s-]/g, '');
            setFormData({ ...formData, [name]: validValue });
        }
        // Allow letters, spaces, hyphens, and periods for guardian name
        else if (name === 'guardianName') {
            const validValue = value.replace(/[^a-zA-Z\s-.]/g, '');
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
    
            // Set error for contact number if less than 11 digits  
            if (name === 'number') {
                if (validNumber.length > 0 && validNumber.length < 11) {
                    setContactNumberError("Contact number must be 11 digits");
                } else {
                    setContactNumberError("");
                }
                
                // Trigger real-time phone validation
                if (validNumber.length === 11) {
                    validatePhoneInRealTime(validNumber);
                    // Check for duplicate contact number
                    checkDuplicate('contact_number', validNumber);
                } else {
                    setPhoneValidation({ isValid: null, message: '' });
                    setDuplicateValidation(prev => ({
                        ...prev,
                        contact_number: { exists: false, checking: false }
                    }));
                }
            }
            // For guardian contact, add validation
            else if (name === 'guardianContactNo') {
                // Trigger real-time guardian phone validation
                if (validNumber.length === 11) {
                    validateGuardianPhoneInRealTime(validNumber);
                    // Check for duplicate guardian contact number
                    checkDuplicate('guardian_contact_no', validNumber);
                } else {
                    setGuardianPhoneValidation({ isValid: null, message: '' });
                    setDuplicateValidation(prev => ({
                        ...prev,
                        guardian_contact_no: { exists: false, checking: false }
                    }));
                }
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
    const [isRegistered, setIsRegistered] = useState(false);
    const [contactNumberError, setContactNumberError] = useState("");

    // Guardian phone validation function
    const validateGuardianPhoneInRealTime = async (phoneNumber) => {
        if (!phoneNumber || phoneNumber.length !== 11) {
            setGuardianPhoneValidation({ isValid: null, message: '' });
            return;
        }

        // Basic format validation first
        if (!phoneNumber.startsWith('09')) {
            setGuardianPhoneValidation({ 
                isValid: false, 
                message: 'Phone number must start with 09' 
            });
            return;
        }

        // Check for common invalid patterns (allow repeated digits but block sequences)
        const invalidPatterns = [
            /^09(0123|1234|2345|3456|4567|5678|6789|7890|8901|9012)/, // Sequential patterns
            /^09(9876|8765|7654|6543|5432|4321|3210|2109|1098|0987)/, // Reverse sequential patterns
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(phoneNumber)) {
                setGuardianPhoneValidation({ 
                    isValid: false, 
                    message: 'Phone number contains invalid pattern' 
                });
                return;
            }
        }

        // Basic validation only
        setGuardianPhoneValidation({
            isValid: true,
            message: 'Phone number format is valid'
        });
    };

    // Phone validation function
    const validatePhoneInRealTime = async (phoneNumber) => {
        if (!phoneNumber || phoneNumber.length !== 11) {
            setPhoneValidation({ isValid: null, message: '' });
            return;
        }

        // Basic format validation first
        if (!phoneNumber.startsWith('09')) {
            setPhoneValidation({ 
                isValid: false, 
                message: 'Phone number must start with 09' 
            });
            return;
        }

        // Check for common invalid patterns (allow repeated digits but block sequences)
        const invalidPatterns = [
            /^09(0123|1234|2345|3456|4567|5678|6789|7890|8901|9012)/, // Sequential patterns
            /^09(9876|8765|7654|6543|5432|4321|3210|2109|1098|0987)/, // Reverse sequential patterns
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(phoneNumber)) {
                setPhoneValidation({ 
                    isValid: false, 
                    message: 'Phone number contains invalid pattern' 
                });
                return;
            }
        }

        // Basic validation only
        setPhoneValidation({
            isValid: true,
            message: 'Phone number format is valid'
        });
    };

    // Validate password strength
    const validatePasswordStrength = (password) => {
        if (!password) {
            setPasswordStrength({ score: 0, feedback: '' });
            return;
        }

        let score = 0;
        const feedback = [];

        // Common weak passwords to block
        const weakPasswords = [
            'password', '123456', '12345678', '123456789', '1234567890',
            'qwerty', 'abc123', 'password123', 'admin', 'letmein',
            'welcome', 'monkey', '1234567', 'sunshine', 'princess',
            'azerty', 'trustno1', 'dragon', 'baseball', 'iloveyou',
            'master', 'hello', 'freedom', 'whatever', 'qazwsx',
            'login', 'starwars', 'shadow', 'superman', 'qwerty123',
            'eli123', 'test', 'guest', 'demo', 'user'
        ];

        // Check against weak passwords (case-insensitive)
        if (weakPasswords.some(weak => password.toLowerCase() === weak.toLowerCase())) {
            setPasswordStrength({ 
                score: 0, 
                feedback: 'This password is too common and has been found in data breaches. Please choose a stronger password.' 
            });
            return;
        }

        // Length check
        if (password.length < 8) {
            feedback.push('Password must be at least 8 characters long');
        } else {
            score += 1;
        }

        // Check for uppercase letter
        if (!/[A-Z]/.test(password)) {
            feedback.push('Add an uppercase letter');
        } else {
            score += 1;
        }

        // Check for lowercase letter
        if (!/[a-z]/.test(password)) {
            feedback.push('Add a lowercase letter');
        } else {
            score += 1;
        }

        // Check for number
        if (!/[0-9]/.test(password)) {
            feedback.push('Add a number');
        } else {
            score += 1;
        }

    // Check for special character
    if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
      feedback.push('Add a special character (!@#$%^&*)');
    } else {
      score += 1;
    }

        // Bonus for longer passwords
        if (password.length >= 12) {
            score += 1;
        }

        // Determine strength level
        let strengthLevel = '';
        if (score <= 2) {
            strengthLevel = 'Weak';
        } else if (score <= 4) {
            strengthLevel = 'Fair';
        } else if (score <= 5) {
            strengthLevel = 'Good';
        } else {
            strengthLevel = 'Strong';
        }

        setPasswordStrength({ 
            score, 
            feedback: feedback.length > 0 ? feedback.join(', ') : `Password strength: ${strengthLevel}`,
            strengthLevel
        });
    };

    // Check for duplicate values
    const checkDuplicate = async (field, value) => {
        if (!value || value.trim() === '') {
            setDuplicateValidation(prev => ({
                ...prev,
                [field]: { exists: false, checking: false }
            }));
            return;
        }

        // Set checking state
        setDuplicateValidation(prev => ({
            ...prev,
            [field]: { exists: false, checking: true }
        }));

        try {
            const response = await axios.post('/api/check-duplicates', {
                field: field,
                value: value
            });

            setDuplicateValidation(prev => ({
                ...prev,
                [field]: { exists: response.data.exists, checking: false }
            }));
        } catch (error) {
            console.error('Error checking duplicate:', error);
            setDuplicateValidation(prev => ({
                ...prev,
                [field]: { exists: false, checking: false }
            }));
        }
    };

    // Verification functions
    const sendVerificationCode = async (type) => {
        setVerificationLoading(true);
        try {
            // Generate OTP on frontend
            const otp = Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store OTP temporarily (in production, use backend storage)
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
            sessionStorage.setItem(`verification_${type}`, JSON.stringify({ otp, expiresAt }));
            
            const result = await sendVerificationEmail(formData.email, otp, formData.firstName);
            
            if (result.success) {
                setSnackbar({
                    open: true,
                    message: `Verification code sent to your ${type}`,
                    severity: 'success'
                });
                
                // Start resend cooldown (60 seconds)
                setResendCooldown(60);
                const cooldownInterval = setInterval(() => {
                    setResendCooldown(prev => {
                        if (prev <= 1) {
                            clearInterval(cooldownInterval);
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);
            } else {
                console.error('❌ Email sending failed:', result.message);
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('Error sending verification code:', error);
            setSnackbar({
                open: true,
                message: error.message || 'Failed to send verification code. Please try again.',
                severity: 'error'
            });
        } finally {
            setVerificationLoading(false);
        }
    };

    const verifyCode = async () => {
        if (!verificationCode || verificationCode.length !== 6) {
            setSnackbar({
                open: true,
                message: 'Please enter a valid 6-digit verification code',
                severity: 'error'
            });
            return;
        }

        setVerificationLoading(true);
        try {
            // Get stored OTP from sessionStorage
            const storedData = sessionStorage.getItem(`verification_${verificationType}`);
            
            if (!storedData) {
                throw new Error('No verification code found. Please request a new code.');
            }

            const { otp, expiresAt } = JSON.parse(storedData);
            
            if (new Date(expiresAt) < new Date()) {
                sessionStorage.removeItem(`verification_${verificationType}`);
                throw new Error('Verification code has expired. Please request a new code.');
            }

            if (otp !== verificationCode) {
                throw new Error('Invalid verification code. Please try again.');
            }

            // Code is valid, remove it from storage
            sessionStorage.removeItem(`verification_${verificationType}`);

            if (verificationType === 'email') {
                setIsEmailVerified(true);
            }

            setSnackbar({
                open: true,
                message: 'Email verified successfully!',
                severity: 'success'
            });

            handleVerificationClose();
        } catch (error) {
            console.error('Error verifying code:', error);
            setSnackbar({
                open: true,
                message: error.message || 'Verification failed. Please try again.',
                severity: 'error'
            });
        } finally {
            setVerificationLoading(false);
        }
    };

    // Step validation functions
    const validateStep = (step) => {
        switch(step) {
            case 1: // Personal Information
                if (!formData.firstName || !formData.lastName || !formData.sex || !formData.birthdate) {
                    setSnackbar({
                        open: true,
                        message: "Please fill in all required personal information fields",
                        severity: 'error'
                    });
                    return false;
                }
                return true;
            case 2: // Contact Information
                if (!formData.email || !isEmailVerified) {
                    setSnackbar({
                        open: true,
                        message: "Please verify your email address",
                        severity: 'error'
                    });
                    return false;
                }
                if (!formData.number || formData.number.length !== 11 || phoneValidation.isValid === false || duplicateValidation.contact_number.exists) {
                    setSnackbar({
                        open: true,
                        message: "Please enter a valid contact number",
                        severity: 'error'
                    });
                    return false;
                }
                return true;
            case 3: // Address Information
                if (!address.region || !address.province || !address.city || !address.barangay) {
                    setSnackbar({
                        open: true,
                        message: "Please complete your address information",
                        severity: 'error'
                    });
                    return false;
                }
                return true;
            case 4: // Guardian Information
                if (!formData.guardianName || !formData.guardianContactNo) {
                    setSnackbar({
                        open: true,
                        message: "Please fill in all guardian information fields",
                        severity: 'error'
                    });
                    return false;
                }
                if (formData.guardianContactNo.length !== 11 || guardianPhoneValidation.isValid === false || duplicateValidation.guardian_contact_no.exists) {
                    setSnackbar({
                        open: true,
                        message: "Please enter a valid guardian contact number",
                        severity: 'error'
                    });
                    return false;
                }
                return true;
            case 5: // Review & Submit (Privacy Policy)
                return true; // No validation needed, just need to check the checkbox
            case 6: // Account Details
                if (!formData.userName || duplicateValidation.username.exists) {
                    setSnackbar({
                        open: true,
                        message: "Please enter a valid username",
                        severity: 'error'
                    });
                    return false;
                }
                if (formData.password.length < 8) {
                    setSnackbar({
                        open: true,
                        message: "Password must be at least 8 characters long",
                        severity: 'error'
                    });
                    return false;
                }
                // Check password complexity
                const hasUpperCase = /[A-Z]/.test(formData.password);
                const hasLowerCase = /[a-z]/.test(formData.password);
                const hasNumber = /[0-9]/.test(formData.password);
                const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password);
                if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
                    setSnackbar({
                        open: true,
                        message: "Password must contain uppercase, lowercase, number, and special character",
                        severity: 'error'
                    });
                    return false;
                }
                if (formData.password !== formData.confirmPassword) {
                    setSnackbar({
                        open: true,
                        message: "Passwords do not match",
                        severity: 'error'
                    });
                    return false;
                }
                return true;
            default:
                return true;
        }
    };

    const handleNext = () => {
        if (validateStep(currentStep)) {
            if (currentStep < totalSteps) {
                setCurrentStep(currentStep + 1);
            }
        }
    };

    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
    
        // 🚨 HONEYPOT: Check for malicious registration attempt
        const maliciousCheck = detectMaliciousRegistration(formData);

        if (maliciousCheck.detected) {
            // Log the malicious attempt
            await axios.post('/api/login-honeypot-log', {
                timestamp: new Date().toLocaleString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false
                }).replace(/(\d+)\/(\d+)\/(\d+)/, '$3-$1-$2'),
                activityType: maliciousCheck.type,
                exploitPayload: maliciousCheck.pattern,
                honeypotPath: '/registration',
                action: 'attempt',
                vulnerabilityType: maliciousCheck.type,
                pageType: 'student_registration',
                field: maliciousCheck.field,
                ...formData // Optionally include all form data for context
            }, {
                headers: { 'Content-Type': 'application/json' }
            });

            setSnackbar({
                open: true,
                message: "Registration failed. Please try again.",
                severity: 'error'
            });
            return;
        }

        // Validate required fields
        if (!formData.userName || !formData.password || !formData.firstName || 
            !formData.lastName || !formData.sex || !formData.birthdate) {
            setSnackbar({
                open: true,
                message: "Please fill in all required fields",
                severity: 'error'
            });
            return;
        }
        // Password strength validation
        if (formData.password.length < 8) {
            setSnackbar({
                open: true,
                message: "Password must be at least 8 characters long",
                severity: 'error'
            });
            return;
        }

        // Check for weak passwords
        const weakPasswords = [
            'password', '123456', '12345678', '123456789', '1234567890',
            'qwerty', 'abc123', 'password123', 'admin', 'letmein',
            'welcome', 'monkey', '1234567', 'sunshine', 'princess',
            'azerty', 'trustno1', 'dragon', 'baseball', 'iloveyou',
            'master', 'hello', 'freedom', 'whatever', 'qazwsx',
            'login', 'starwars', 'shadow', 'superman', 'qwerty123',
            'eli123', 'test', 'guest', 'demo', 'user'
        ];

        if (weakPasswords.includes(formData.password.toLowerCase())) {
            setSnackbar({
                open: true,
                message: "This password is too common and has been found in data breaches. Please choose a stronger password.",
                severity: 'error'
            });
            return;
        }

        // Check password complexity
        const hasUpperCase = /[A-Z]/.test(formData.password);
        const hasLowerCase = /[a-z]/.test(formData.password);
        const hasNumber = /[0-9]/.test(formData.password);
        const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(formData.password);

        if (!hasUpperCase || !hasLowerCase || !hasNumber || !hasSpecialChar) {
            setSnackbar({
                open: true,
                message: "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
                severity: 'error'
            });
            return;
        }

        // Confirm password check
        if (formData.password !== formData.confirmPassword) {
            setSnackbar({
                open: true,
                message: "Passwords do not match",
                severity: 'error'
            });
            return;
        }
        // Validate contact number length
        if (formData.number.length !== 11) {
            setSnackbar({
                open: true,
                message: "Contact number must be exactly 11 digits",
                severity: 'error'
            });
            return;
        }

        // Validate contact number patterns
        const phoneNumber = formData.number;
        
        // Check for common invalid patterns (allow repeated digits but block sequences)
        const invalidPatterns = [
            /^09(0123|1234|2345|3456|4567|5678|6789|7890|8901|9012)/, // Sequential patterns
            /^09(9876|8765|7654|6543|5432|4321|3210|2109|1098|0987)/, // Reverse sequential patterns
        ];

        for (const pattern of invalidPatterns) {
            if (pattern.test(phoneNumber)) {
                setSnackbar({
                    open: true,
                    message: "Phone number contains invalid pattern",
                    severity: 'error'
                });
                return;
            }
        }
        
        // Validate guardian contact number patterns
        if (formData.guardianContactNo) {
            const guardianPhoneNumber = formData.guardianContactNo;
            
            // Check for common invalid patterns (allow repeated digits but block sequences)
            const invalidPatterns = [
                /^09(0123|1234|2345|3456|4567|5678|6789|7890|8901|9012)/, // Sequential patterns
                /^09(9876|8765|7654|6543|5432|4321|3210|2109|1098|0987)/, // Reverse sequential patterns
            ];

            for (const pattern of invalidPatterns) {
                if (pattern.test(guardianPhoneNumber)) {
                    setSnackbar({
                        open: true,
                        message: "Guardian phone number contains invalid pattern",
                        severity: 'error'
                    });
                    return;
                }
            }
        }
        if (!isEmailVerified) {
            setSnackbar({
                open: true,
                message: "Please verify your email address before submitting",
                severity: 'error'
            });
            return;
        }

        // Check for duplicates before submission
        if (duplicateValidation.username.exists) {
            setSnackbar({
                open: true,
                message: "Username already exists. Please choose a different username.",
                severity: 'error'
            });
            return;
        }

        if (duplicateValidation.email.exists) {
            setSnackbar({
                open: true,
                message: "Email already exists. Please use a different email address.",
                severity: 'error'
            });
            return;
        }

        if (duplicateValidation.contact_number.exists) {
            setSnackbar({
                open: true,
                message: "Contact number already exists. Please use a different contact number.",
                severity: 'error'
            });
            return;
        }

        if (duplicateValidation.guardian_contact_no.exists) {
            setSnackbar({
                open: true,
                message: "Guardian contact number already exists. Please use a different contact number.",
                severity: 'error'
            });
            return;
        }

        // Check for duplicate name + birthdate combination
        try {
            const nameBirthdateCheck = await axios.post('/api/check-duplicates', {
                field: 'name_birthdate',
                value: {
                    firstName: formData.firstName,
                    lastName: formData.lastName,
                    middleName: formData.middleName || '',
                    suffix: formData.suffix || '',
                    birthdate: formData.birthdate
                }
            });

            if (nameBirthdateCheck.data.exists) {
                setSnackbar({
                    open: true,
                    message: "A student with the same name and birthdate already exists. Please contact the registrar if you believe this is an error.",
                    severity: 'error'
                });
                return;
            }
        } catch (error) {
            console.error('Error checking name + birthdate duplicate:', error);
            // Continue with registration if check fails (backend will catch it)
        }

        try {
            // Clean the form data to ensure no undefined values
            const cleanFormData = {
                userName: formData.userName || null,
                password: formData.password || null,
                firstName: formData.firstName || null,
                middleName: formData.middleName || null,
                lastName: formData.lastName || null,
                suffix: formData.suffix || null,
                sex: formData.sex || null,
                birthdate: formData.birthdate || null,
                age: formData.age || null,
                placeOfBirth: formData.placeOfBirth || null,
                religion: formData.religion || null,
                email: formData.email || null,
                number: formData.number || null,
                street_text: formData.street_text || null,
                guardianName: formData.guardianName || null,
                guardianContactNo: formData.guardianContactNo || null
            };

            const response = await axios.post("/api/registerstudent", cleanFormData);
    
            setSnackbar({
                open: true,
                message: response.data.message || "Registration successful!",
                severity: 'success'
            });
            setOpen(true);
            setIsRegistered(true);
    
            // Clear form fields and verification status
            setFormData({
                userName: "",
                password: "",
                confirmPassword: "",
                firstName: "",
                middleName: "",
                lastName: "",
                suffix: "",
                sex: "",
                birthdate: "",
                age: "",
                placeOfBirth: "",
                religion: "",
                email: "",
                number: "",
                street_text: "",
                guardianName: "",
                guardianContactNo: "",
            });
            setIsEmailVerified(false);
        } catch (error) {
            console.error("Registration error:", error.response?.data || error.message);
            setSnackbar({
                open: true,
                message: error.response?.data?.message || "Registration failed. Please try again.",
                severity: 'error'
            });
        }
    };

      useEffect(() => {
        console.log(formData); // Log the state to check if it's properly populated
      }, [formData]);

      // Initialize privacy policy when step 5 is shown
      useEffect(() => {
        if (currentStep === 5 && privacyPolicyRef.current) {
          const policyElement = privacyPolicyRef.current;
          if (!policyElement) return;

          // Check if already loaded
          if (policyElement.innerHTML.trim() !== '') {
            return;
          }

          // Wait for DOM to be ready
          const timer = setTimeout(() => {
            // Try to trigger the Usercentrics script to find the element
            // The script should automatically populate elements with class 'uc-privacy-policy'
            // We'll create a new script instance that will scan for the element
            const existingDynamicScript = document.getElementById('usercentrics-ppg-dynamic');
            if (existingDynamicScript) {
              existingDynamicScript.remove();
            }

            // Create a script that will initialize the privacy policy
            const script = document.createElement('script');
            script.id = 'usercentrics-ppg-dynamic';
            script.setAttribute('privacy-policy-id', '77ae48d5-ac02-413d-98d2-3751d4baddc7');
            script.src = 'https://policygenerator.usercentrics.eu/api/privacy-policy';
            script.async = true;
            
            script.onload = () => {
              // After script loads, it should automatically populate the element
              // If not, try to manually trigger it after a short delay
              setTimeout(() => {
                if (policyElement.innerHTML.trim() === '') {
                  // Try to dispatch a custom event or check for Usercentrics API
                  if (window.UC_UI && typeof window.UC_UI.showPrivacyPolicy === 'function') {
                    try {
                      window.UC_UI.showPrivacyPolicy('77ae48d5-ac02-413d-98d2-3751d4baddc7', policyElement);
                    } catch (error) {
                      console.error('Error initializing privacy policy:', error);
                    }
                  }
                }
              }, 300);
            };

            script.onerror = () => {
              console.error('Failed to load privacy policy script');
              policyElement.innerHTML = '<p style="color: #666; text-align: center; padding: 20px;">Privacy policy is loading... If it does not appear, please refresh the page.</p>';
            };

            document.head.appendChild(script);
          }, 100);

          return () => clearTimeout(timer);
        }
      }, [currentStep]);

  return (
    <>
            <header className="d-flex align-items-center">
                <div className="container-fluid w-100">
                <div className="row d-flex align-items-center w-100">
                    <div className="col-sm-2 part1">
                    <Link to="/" className="d-flex align-items-center logo">
                        <img src={logo} alt="OLSHCO Logo" />
                        <span className="ml-2">OLSHCO</span>
                    </Link>
                    </div>
                    <div className="col-sm-6 ml-auto d-flex align-items-center part2">
                    
                    <nav>
                        <ul className="nav-list d-flex">
                        <li>
                            <a href="#home">Home</a>
                        </li>
                        <li>
                            <a href="#school">School</a>
                        </li>
                        <li>
                            <a href="#courses">Offered Course</a>
                        </li>
                        <li>
                            <a href="#announcement">Announcement</a>
                        </li>
                        <li>
                            <a href="#contact">Contact</a>
                        </li>
                        <li>
                            <Link to="/login">Login</Link>
                        </li>
                        </ul>
                    </nav>
                    </div>
                </div>
                </div>
                    {/* Sidebar */}
                    <div className={`msidebar ${isSidebarOpen ? 'show' : ''}`}>
                        
                        <ul className="nav-list">
                            <li>
                            <a href="#home">Home</a>
                            </li>
                            <li>
                            <a href="#school">School</a>
                            </li>
                            <li>
                            <a href="#courses">Offered Course</a>
                            </li>
                            <li>
                            <a href="#announcement">Announcement</a>
                            </li>
                            <li>
                            <a href="#contact">Contact</a>
                            </li>
                            <li>
                            <Link to="/login">Login</Link>
                            </li>
                        </ul>                        
                    </div>
                    <div className="part3">
                        <div className="menu-icon" onClick={toggleSidebar}>
                            &#9776; {/* Hamburger icon */}
                        </div>
                    </div>
            </header>
            <div className="homepage">
                
                {/* Section 1: Home */}
                <section id="home" className="homesec" 
                    style={{backgroundImage: `url(${homepagebg})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center',}}>
                        <div className='intro col-sm-7'>
                            <h2>Welcome to OLSHCOnnect: Your Gateway to Academic Excellence</h2>
                            <p>
                                OLSHCOnnect, the official student portal of Our Lady of the Sacred Heart College of Guimba Inc. 
                                This platform is designed to empower students by providing easy access to essential academic tools, resources, 
                                and updates. Whether you're exploring your courses, monitoring your grades, or staying updated on the latest 
                                announcements, OLSHCOnnect ensures a seamless and interactive experience.
                            </p>
                            <p>
                                If you are incoming 1st year college you can register now.
                            </p>
                            <button className="btn btn-danger btn-expanded" onClick={handleOpen} data-testid="open-modal-button">
                                REGISTER NOW!
                            </button>
                            <p>
                                Already have an account? Proceed to <a href="/login" style={{ color: '#c70202', textDecoration: 'none' }}>Login</a> to continue to enrollment.
                            </p>

                            {/* Modal */}
                            <Modal 
                                open={open} 
                                onClose={handleClose}
                                aria-labelledby="registration-modal-title"
                                data-testid="registration-modal"
                            >
                                <Box
                                    sx={{
                                        position: "absolute",
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: "90%",
                                        maxWidth: "600px",
                                        margin: "50px auto",
                                        backgroundColor: "white",
                                        borderRadius: "10px",
                                        padding: 4,
                                        boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                        maxHeight: "90vh", // Restrict the height of the modal
                                        overflowY: "auto", // Enable scrolling
                                    }}
                                    data-testid="modal-content"
                                >
                                    {/* Close Button */}
                                    <div className="registration-details">
                                        <Button
                                            onClick={handleClose}
                                            data-testid="modal-close-button"
                                            sx={{
                                                position: "absolute",
                                                top: "10px",
                                                right: "10px",
                                                minWidth: "30px",
                                                minHeight: "30px",
                                                padding: "5px",
                                                fontSize: "1.2rem",
                                                color: "#c70202",
                                                '&:hover': {
                                                    backgroundColor: 'rgba(199, 2, 2, 0.1)',
                                                },
                                            }}
                                        >
                                            &times;
                                        </Button>
                                    </div>

                                    <Typography variant="h5" sx={{ 
                                        textAlign: "center", 
                                        marginBottom: "20px",
                                        color: '#c70202',
                                        fontWeight: 'bold'
                                    }}>
                                        Registration Form
                                    </Typography>

                                    {/* Step Indicator */}
                                    {!isRegistered && (
                                        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 1 }}>
                                            {[1, 2, 3, 4, 5, 6].map((step) => (
                                                <Box key={step} sx={{ display: 'flex', alignItems: 'center' }}>
                                                    <Box
                                                        sx={{
                                                            width: 35,
                                                            height: 35,
                                                            borderRadius: '50%',
                                                            backgroundColor: currentStep >= step ? '#c70202' : '#e0e0e0',
                                                            color: currentStep >= step ? 'white' : '#666',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontWeight: 'bold',
                                                            fontSize: '14px'
                                                        }}
                                                    >
                                                        {step}
                                                    </Box>
                                                    {step < totalSteps && (
                                                        <Box
                                                            sx={{
                                                                width: 30,
                                                                height: 2,
                                                                backgroundColor: currentStep > step ? '#c70202' : '#e0e0e0',
                                                                mx: 0.5
                                                            }}
                                                        />
                                                    )}
                                                </Box>
                                            ))}
                                        </Box>
                                    )}

                                    {!isRegistered ? (    
                                        <form onSubmit={handleSubmit} data-testid="registration-form">
                                            {/* Step 1: Personal Information */}
                                            {currentStep === 1 && (
                                                <div className="registration-section">
                                                    <Typography variant="h6" className="section-title" sx={{ mb: 2, color: '#c70202', fontWeight: 'bold' }}>
                                                        Step 1: Personal Information
                                                    </Typography>
                                                    <div className="mb-3">
                                                        <Grid container spacing={2}>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="First Name"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="firstName"
                                                                    data-testid="input-firstName"
                                                                    value={formData.firstName}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Middle Name"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="middleName"
                                                                    data-testid="input-middleName"
                                                                    value={formData.middleName}
                                                                    onChange={handleInputChange}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Last Name"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="lastName"
                                                                    data-testid="input-lastName"
                                                                    value={formData.lastName}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Suffix"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="suffix"
                                                                    data-testid="input-suffix"
                                                                    value={formData.suffix}
                                                                    onChange={handleInputChange}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <FormControl fullWidth margin="normal" required>
                                                                    <h6>Sex</h6>
                                                                    <Select
                                                                        name="sex"
                                                                        data-testid="input-sex"
                                                                        value={formData.sex}
                                                                        onChange={handleInputChange}
                                                                        displayEmpty
                                                                        label="Sex"
                                                                    >
                                                                        <MenuItem value=""><em>Select Sex</em></MenuItem>
                                                                        <MenuItem value="Male">Male</MenuItem>
                                                                        <MenuItem value="Female">Female</MenuItem>
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField                                    
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="birthdate"
                                                                    label="Birthday"
                                                                    data-testid="input-birthdate"
                                                                    type="date"
                                                                    value={formData.birthdate ? formData.birthdate.split('/').reverse().join('-') : ''}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                    InputLabelProps={{ shrink: true }}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Age"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="age"
                                                                    data-testid="input-age"
                                                                    value={formData.age}
                                                                    onChange={handleInputChange}
                                                                    disabled
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Place of Birth"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="placeOfBirth"
                                                                    data-testid="input-placeOfBirth"
                                                                    value={formData.placeOfBirth}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Religion"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="religion"
                                                                    data-testid="input-religion"
                                                                    value={formData.religion}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 2: Contact Information */}
                                            {currentStep === 2 && (
                                                <div className="registration-section">
                                                    <Typography variant="h6" className="section-title" sx={{ mb: 2, color: '#c70202', fontWeight: 'bold' }}>
                                                        Step 2: Contact Information
                                                    </Typography>
                                                    <div className="mb-3">
                                                        <Grid container spacing={2}>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Email"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="email"
                                                                    data-testid="input-email"
                                                                    type="email"
                                                                    value={formData.email}
                                                                    onChange={handleInputChange}
                                                                    error={duplicateValidation.email.exists}
                                                                    helperText={
                                                                        duplicateValidation.email.checking 
                                                                            ? 'Checking availability...' 
                                                                            : duplicateValidation.email.exists 
                                                                                ? 'Email already exists' 
                                                                                : ''
                                                                    }
                                                                    required
                                                                    InputProps={{
                                                                        endAdornment: (
                                                                            <Button
                                                                                size="small"
                                                                                variant={isEmailVerified ? "contained" : "outlined"}
                                                                                color={isEmailVerified ? "success" : "primary"}
                                                                                onClick={() => handleVerificationOpen('email')}
                                                                                disabled={!formData.email || verificationLoading}
                                                                                sx={{ ml: 1, minWidth: '100px' }}
                                                                            >
                                                                                {isEmailVerified ? '✓ Verified' : 'Verify'}
                                                                            </Button>
                                                                        )
                                                                    }}
                                                                />
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Contact Number"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="number"
                                                                    data-testid="input-number"
                                                                    value={formData.number}
                                                                    onChange={handleInputChange}
                                                                    required
                                                                    error={!!contactNumberError || phoneValidation.isValid === false || duplicateValidation.contact_number.exists}
                                                                    helperText={
                                                                        contactNumberError || 
                                                                        (duplicateValidation.contact_number.exists ? 'Contact number already exists' : '') ||
                                                                        (phoneValidation.isValid === false ? phoneValidation.message : '') ||
                                                                        (phoneValidation.isValid === true ? '✓ ' + phoneValidation.message : '')
                                                                    }
                                                                    InputProps={{
                                                                        endAdornment: phoneValidation.isValid === true && (
                                                                            <span style={{ color: 'green', fontSize: '20px', marginLeft: '8px' }}>
                                                                                ✓
                                                                            </span>
                                                                        )
                                                                    }}
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 3: Address Information */}
                                            {currentStep === 3 && (
                                                <div className="registration-section">
                                                    <Typography variant="h6" className="section-title" sx={{ mb: 2, color: '#c70202', fontWeight: 'bold' }}>
                                                        Step 3: Address Information
                                                    </Typography>
                                                    <div className="mb-3">
                                                        <Grid container spacing={2}>
                                                            <Grid item xs={12}>
                                                                <FormControl fullWidth margin="normal" required>
                                                                    <InputLabel>Select Region</InputLabel>
                                                                    <Select
                                                                        name="region"
                                                                        data-testid="input-region"
                                                                        value={address.region}
                                                                        onChange={(e) => {
                                                                            const selectedRegion = regionData.find(r => r.region_code === e.target.value);
                                                                            setAddress({ ...address, region: e.target.value, province: '', city: '', barangay: '' });
                                                                            setAddressNames({ ...addressNames, region: selectedRegion ? selectedRegion.region_name : '', province: '', city: '', barangay: '' });
                                                                        }}
                                                                        displayEmpty
                                                                        label="Select Region"
                                                                    >
                                                                        <MenuItem value=""><em>Select Region</em></MenuItem>
                                                                        {regionData.map((region) => (
                                                                            <MenuItem key={region.region_code} value={region.region_code}>
                                                                                {region.region_name}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <FormControl fullWidth margin="normal" required>
                                                                    <InputLabel>Select Province</InputLabel>
                                                                    <Select
                                                                        name="province"
                                                                        data-testid="input-province"
                                                                        value={address.province}
                                                                        onChange={(e) => {
                                                                            const selectedProvince = provinceData.find(p => p.province_code === e.target.value);
                                                                            setAddress({ ...address, province: e.target.value, city: '', barangay: '' });
                                                                            setAddressNames({ ...addressNames, province: selectedProvince ? selectedProvince.province_name : '', city: '', barangay: '' });
                                                                        }}
                                                                        displayEmpty
                                                                        label="Select Province"
                                                                    >
                                                                        <MenuItem value=""><em>Select Province</em></MenuItem>
                                                                        {provinceData.map((province) => (
                                                                            <MenuItem key={province.province_code} value={province.province_code}>
                                                                                {province.province_name}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <FormControl fullWidth margin="normal" required>
                                                                    <InputLabel>Select City</InputLabel>
                                                                    <Select
                                                                        name="city"
                                                                        data-testid="input-city"
                                                                        value={address.city}
                                                                        onChange={(e) => {
                                                                            const selectedCity = cityData.find(c => c.city_code === e.target.value);
                                                                            setAddress({ ...address, city: e.target.value, barangay: '' });
                                                                            setAddressNames({ ...addressNames, city: selectedCity ? selectedCity.city_name : '', barangay: '' });
                                                                        }}
                                                                        displayEmpty
                                                                        label="Select City"
                                                                    >
                                                                        <MenuItem value=""><em>Select City</em></MenuItem>
                                                                        {cityData.map((city) => (
                                                                            <MenuItem key={city.city_code} value={city.city_code}>
                                                                                {city.city_name}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <FormControl fullWidth margin="normal" required>
                                                                    <InputLabel>Select Barangay</InputLabel>
                                                                    <Select
                                                                        name="barangay"
                                                                        data-testid="input-barangay"
                                                                        value={address.barangay}
                                                                        onChange={(e) => {
                                                                            const selectedBarangay = barangayData.find(b => b.brgy_code === e.target.value);
                                                                            setAddress({ ...address, barangay: e.target.value });
                                                                            setAddressNames({ ...addressNames, barangay: selectedBarangay ? selectedBarangay.brgy_name : '' });
                                                                        }}
                                                                        displayEmpty
                                                                        label="Select Barangay"
                                                                    >
                                                                        <MenuItem value=""><em>Select Barangay</em></MenuItem>
                                                                        {barangayData.map((barangay) => (
                                                                            <MenuItem key={barangay.brgy_code} value={barangay.brgy_code}>
                                                                                {barangay.brgy_name}
                                                                            </MenuItem>
                                                                        ))}
                                                                    </Select>
                                                                </FormControl>
                                                            </Grid>
                                                            <Grid item xs={12}>
                                                                <TextField
                                                                    label="Full Address (Auto-generated)"
                                                                    fullWidth
                                                                    margin="normal"
                                                                    name="street_text"
                                                                    data-testid="input-street_text"
                                                                    id="street-text"
                                                                    value={formData.street_text}
                                                                    InputProps={{
                                                                        readOnly: true,
                                                                    }}
                                                                    placeholder="Select province, city, and barangay to generate address"
                                                                />
                                                            </Grid>
                                                        </Grid>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 4: Guardian Information */}
                                            {currentStep === 4 && (
                                                <div className="registration-section">
                                                    <Typography variant="h6" className="section-title" sx={{ mb: 2, color: '#c70202', fontWeight: 'bold' }}>
                                                        Step 4: Guardian Information
                                                    </Typography>
                                                    <div className="mb-3">
                                                        <TextField
                                                            label="Guardian Name"
                                                            fullWidth
                                                            margin="normal"
                                                            name="guardianName"
                                                            data-testid="input-guardianName"
                                                            value={formData.guardianName}
                                                            onChange={handleInputChange}
                                                            required
                                                        />
                                                        <TextField
                                                            label="Guardian Contact"
                                                            fullWidth
                                                            margin="normal"
                                                            name="guardianContactNo"
                                                            data-testid="input-guardianContactNo"
                                                            value={formData.guardianContactNo}
                                                            onChange={handleInputChange}
                                                            required
                                                            error={guardianPhoneValidation.isValid === false || duplicateValidation.guardian_contact_no.exists}
                                                            helperText={
                                                                duplicateValidation.guardian_contact_no.exists 
                                                                    ? 'Guardian contact number already exists' 
                                                                    : guardianPhoneValidation.isValid === false 
                                                                        ? guardianPhoneValidation.message 
                                                                        : guardianPhoneValidation.isValid === true 
                                                                            ? '✓ ' + guardianPhoneValidation.message 
                                                                            : ''
                                                            }
                                                            InputProps={{
                                                                endAdornment: guardianPhoneValidation.isValid === true && (
                                                                    <span style={{ color: 'green', fontSize: '20px', marginLeft: '8px' }}>
                                                                        ✓
                                                                    </span>
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 5: Privacy Policy & Submit */}
                                            {currentStep === 5 && (
                                                <div className="registration-section">
                                                    <Typography variant="h6" className="section-title" sx={{ mb: 2, color: '#c70202', fontWeight: 'bold' }}>
                                                        Step 5: Review & Submit
                                                    </Typography>
                                                    <div className="mb-3">
                                                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#333' }}>
                                                            Privacy Policy
                                                        </Typography>
                                                        <Box
                                                            sx={{
                                                                maxHeight: '300px',
                                                                overflowY: 'auto',
                                                                border: '1px solid #e0e0e0',
                                                                borderRadius: '8px',
                                                                padding: '15px',
                                                                marginBottom: '20px',
                                                                backgroundColor: '#f9f9f9',
                                                                '&::-webkit-scrollbar': {
                                                                    width: '8px',
                                                                },
                                                                '&::-webkit-scrollbar-track': {
                                                                    background: '#f1f1f1',
                                                                    borderRadius: '4px',
                                                                },
                                                                '&::-webkit-scrollbar-thumb': {
                                                                    background: '#c70202',
                                                                    borderRadius: '4px',
                                                                },
                                                                '&::-webkit-scrollbar-thumb:hover': {
                                                                    background: '#a00000',
                                                                },
                                                            }}
                                                        >
                                                            <div 
                                                                ref={privacyPolicyRef}
                                                                className="uc-privacy-policy"
                                                                id="uc-privacy-policy-container"
                                                            ></div>
                                                        </Box>
                                                        <FormControlLabel
                                                            control={
                                                                <Checkbox 
                                                                    required 
                                                                    sx={{
                                                                        color: '#c70202',
                                                                        '&.Mui-checked': {
                                                                            color: '#c70202',
                                                                        },
                                                                    }}
                                                                />
                                                            }
                                                            label="I agree with the Privacy Policy"
                                                            sx={{ mt: 2 }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Step 6: Account Details */}
                                            {currentStep === 6 && (
                                                <div className="registration-section">
                                                    <Typography variant="h6" className="section-title" sx={{ mb: 2, color: '#c70202', fontWeight: 'bold' }}>
                                                        Step 6: Account Details
                                                    </Typography>
                                                    <div className="mb-3">
                                                        <TextField
                                                            label="Username"
                                                            fullWidth
                                                            margin="normal"
                                                            name="userName"
                                                            data-testid="input-userName"
                                                            value={formData.userName}
                                                            onChange={handleInputChange}
                                                            error={duplicateValidation.username.exists}
                                                            helperText={
                                                                duplicateValidation.username.checking 
                                                                    ? 'Checking availability...' 
                                                                    : duplicateValidation.username.exists 
                                                                        ? 'Username already exists' 
                                                                        : ''
                                                            }
                                                            required
                                                        />
                                                        <TextField
                                                            type={showPassword ? 'text' : 'password'}
                                                            label="Password"
                                                            fullWidth
                                                            margin="normal"
                                                            name="password"
                                                            data-testid="input-password"
                                                            value={formData.password}
                                                            onChange={handleInputChange}
                                                            error={(passwordStrength.score > 0 && passwordStrength.score <= 2) || (passwordStrength.feedback && passwordStrength.feedback.includes('data breaches'))}
                                                            helperText={
                                                                formData.password && passwordStrength.feedback 
                                                                    ? passwordStrength.feedback 
                                                                    : 'Password must be at least 8 characters with uppercase, lowercase, number, and special character'
                                                            }
                                                            required
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <IconButton
                                                                            aria-label="toggle password visibility"
                                                                            onClick={() => setShowPassword(prev => !prev)}
                                                                            edge="end"
                                                                        >
                                                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                )
                                                            }}
                                                        />
                                                        <TextField
                                                            type={showConfirmPassword ? 'text' : 'password'}
                                                            label="Confirm Password"
                                                            fullWidth
                                                            margin="normal"
                                                            name="confirmPassword"
                                                            data-testid="input-confirmPassword"
                                                            value={formData.confirmPassword}
                                                            onChange={handleInputChange}
                                                            required
                                                            error={Boolean(formData.confirmPassword) && formData.password !== formData.confirmPassword}
                                                            helperText={Boolean(formData.confirmPassword) && formData.password !== formData.confirmPassword ? 'Passwords do not match' : ''}
                                                            InputProps={{
                                                                endAdornment: (
                                                                    <InputAdornment position="end">
                                                                        <IconButton
                                                                            aria-label="toggle confirm password visibility"
                                                                            onClick={() => setShowConfirmPassword(prev => !prev)}
                                                                            edge="end"
                                                                        >
                                                                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                                                        </IconButton>
                                                                    </InputAdornment>
                                                                )
                                                            }}
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {/* Navigation Buttons */}
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3, gap: 2 }}>
                                                <Button
                                                    variant="outlined"
                                                    onClick={handleBack}
                                                    disabled={currentStep === 1}
                                                    sx={{
                                                        borderColor: '#c70202',
                                                        color: '#c70202',
                                                        '&:hover': {
                                                            borderColor: '#a00000',
                                                            backgroundColor: 'rgba(199, 2, 2, 0.1)',
                                                        },
                                                        minWidth: '120px',
                                                        height: '45px',
                                                        fontWeight: 'bold'
                                                    }}
                                                >
                                                    Back
                                                </Button>
                                                {currentStep < totalSteps ? (
                                                    <Button
                                                        variant="contained"
                                                        onClick={handleNext}
                                                        sx={{
                                                            bgcolor: '#c70202',
                                                            '&:hover': {
                                                                bgcolor: '#a00000',
                                                            },
                                                            minWidth: '120px',
                                                            height: '45px',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        Next
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        variant="contained"
                                                        type="submit"
                                                        disabled={formData.password !== formData.confirmPassword || !formData.password || !formData.confirmPassword}
                                                        sx={{
                                                            bgcolor: '#c70202',
                                                            '&:hover': {
                                                                bgcolor: '#a00000',
                                                            },
                                                            '&:disabled': {
                                                                bgcolor: '#ccc',
                                                                color: '#666'
                                                            },
                                                            minWidth: '120px',
                                                            height: '45px',
                                                            fontWeight: 'bold'
                                                        }}
                                                    >
                                                        Register
                                                    </Button>
                                                )}
                                            </Box>
                                        </form>
                                    ) : (
                                        <div style={{ textAlign: 'center', padding: '20px' }}>
                                            <h3>Registration Successful!</h3>
                                            <p>You can now proceed to login.</p>
                                            <Button variant="contained" color="primary" onClick={handleClose}>
                                                Close
                                            </Button>
                                        </div>
                                    )}
                                </Box>
                                </Modal>

                                {/* Verification Modal */}
                                <Modal 
                                    open={verificationModal} 
                                    onClose={handleVerificationClose}
                                    aria-labelledby="verification-modal-title"
                                >
                                    <Box
                                        sx={{
                                            position: "absolute",
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: "90%",
                                            maxWidth: "400px",
                                            margin: "50px auto",
                                            backgroundColor: "white",
                                            borderRadius: "10px",
                                            padding: 4,
                                            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
                                        }}
                                    >
                                        <Button
                                            onClick={handleVerificationClose}
                                            sx={{
                                                position: "absolute",
                                                top: "10px",
                                                right: "10px",
                                                minWidth: "30px",
                                                minHeight: "30px",
                                                padding: "5px",
                                                fontSize: "1.2rem",
                                                color: "#c70202",
                                                '&:hover': {
                                                    backgroundColor: 'rgba(199, 2, 2, 0.1)',
                                                },
                                            }}
                                        >
                                            &times;
                                        </Button>

                                        <div style={{ textAlign: "center", marginBottom: "30px" }}>
                                            <div style={{ 
                                                background: 'linear-gradient(135deg, #c70202 0%, #a00000 100%)', 
                                                borderRadius: '50%', 
                                                width: '60px', 
                                                height: '60px', 
                                                margin: '0 auto 20px', 
                                                display: 'flex', 
                                                alignItems: 'center', 
                                                justifyContent: 'center' 
                                            }}>
                                                <span style={{ color: 'white', fontSize: '24px' }}>
                                                    📧
                                                </span>
                                            </div>
                                            <Typography variant="h5" sx={{ 
                                                color: '#c70202',
                                                fontWeight: 'bold',
                                                marginBottom: '10px'
                                            }}>
                                                Verify Email Address
                                            </Typography>
                                            <Typography variant="body1" sx={{ 
                                                color: '#666',
                                                fontSize: '16px',
                                                lineHeight: '1.6'
                                            }}>
                                                We've sent a 6-digit verification code to your email address.
                                            </Typography>
                                        </div>

                                        <div style={{ 
                                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)', 
                                            border: '2px solid #c70202', 
                                            borderRadius: '12px', 
                                            padding: '20px', 
                                            margin: '20px 0',
                                            textAlign: 'center'
                                        }}>
                                            <Typography variant="body2" sx={{ 
                                                color: '#c70202', 
                                                fontWeight: '600', 
                                                marginBottom: '15px',
                                                fontSize: '12px',
                                                letterSpacing: '1px',
                                                textTransform: 'uppercase'
                                            }}>
                                                Enter Verification Code
                                            </Typography>
                                            <TextField
                                                label=""
                                                fullWidth
                                                value={verificationCode}
                                                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                                placeholder="000000"
                                                inputProps={{ 
                                                    maxLength: 6, 
                                                    style: { 
                                                        textAlign: 'center', 
                                                        fontSize: '2rem', 
                                                        letterSpacing: '0.5em',
                                                        fontWeight: 'bold',
                                                        color: '#c70202'
                                                    } 
                                                }}
                                                sx={{ 
                                                    '& .MuiOutlinedInput-root': {
                                                        '& fieldset': {
                                                            border: '2px solid #c70202',
                                                            borderRadius: '8px'
                                                        },
                                                        '&:hover fieldset': {
                                                            border: '2px solid #a00000'
                                                        },
                                                        '&.Mui-focused fieldset': {
                                                            border: '2px solid #a00000'
                                                        }
                                                    }
                                                }}
                                            />
                                        </div>

                                        <Button 
                                            variant="contained" 
                                            fullWidth
                                            onClick={verifyCode}
                                            disabled={verificationLoading || verificationCode.length !== 6}
                                            sx={{ 
                                                mb: 2,
                                                background: 'linear-gradient(135deg, #c70202 0%, #a00000 100%)',
                                                '&:hover': {
                                                    background: 'linear-gradient(135deg, #a00000 0%, #8b0000 100%)',
                                                },
                                                height: '50px',
                                                fontWeight: 'bold',
                                                fontSize: '16px',
                                                borderRadius: '8px',
                                                boxShadow: '0 4px 15px rgba(199, 2, 2, 0.3)',
                                                '&:disabled': {
                                                    background: '#ccc',
                                                    boxShadow: 'none'
                                                }
                                            }}
                                        >
                                            {verificationLoading ? '⏳ Verifying...' : '✅ Verify Code'}
                                        </Button>

                                        <Button 
                                            variant="outlined" 
                                            fullWidth
                                            onClick={() => {
                                                console.log('🔄 Send Code button clicked');
                                                console.log('Verification type:', verificationType);
                                                sendVerificationCode(verificationType);
                                            }}
                                            disabled={verificationLoading || resendCooldown > 0}
                                            sx={{ 
                                                borderColor: '#c70202',
                                                color: '#c70202',
                                                height: '45px',
                                                fontWeight: '600',
                                                borderRadius: '8px',
                                                borderWidth: '2px',
                                                '&:hover': {
                                                    borderColor: '#a00000',
                                                    color: '#a00000',
                                                    borderWidth: '2px',
                                                    backgroundColor: 'rgba(199, 2, 2, 0.05)'
                                                },
                                                '&:disabled': {
                                                    borderColor: '#ccc',
                                                    color: '#ccc'
                                                }
                                            }}
                                        >
                                            {resendCooldown > 0 ? `⏰ Resend in ${resendCooldown}s` : '📧 Send Code'}
                                        </Button>
                                    </Box>
                                </Modal>

                                <Snackbar
                                    open={snackbar.open}
                                    autoHideDuration={4000}
                                    onClose={handleSnackbarClose}
                                    anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                                    >
                                    <Alert 
                                        onClose={handleSnackbarClose} 
                                        severity={snackbar.severity}
                                        variant="filled"
                                        sx={{ width: '100%' }}
                                    >
                                        {snackbar.message}
                                    </Alert>
                                </Snackbar>                            
                        </div>                     
                </section>

                {/* Section 2: School */}
                <section id="school" className="section"
                style={{backgroundImage: `url(${schoolbgg})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden', opacity: 0.9,}}>
                    <header className="header-bar">
                        <div >
                            <h1>Our School</h1>
                        </div>
                    </header>
                    <img src={schoolbg} alt="School Background" style={{width: '100%', height: '80%', objectFit: 'contain', position: 'absolute', zIndex: -1, marginTop: '100px',}}/>
                </section>

                {/* Section 3: Offered Course */}
                <section id="courses" className="section"
                style={{backgroundImage: `url(${courses})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', zIndex: 1}}>
                    <header className="header-bar">
                        <div >
                            <h1>Courses We Offer</h1>
                        </div>
                    </header>
                    <div className="course-grid">
                        {/* BSIT */}
                        <div className="course-item bsit">
                        <img
                            src={it}
                            alt="Bachelor of Science in Information Technology"
                        />
                        <h3>BS Information Technology</h3>
                        </div>

                        {/* BSHM */}
                        <div className="course-item bshm">
                        <img
                            src={hm}
                            alt="Bachelor of Science in Hospitality Management"
                        />
                        <h3>BS Hospitality Management</h3>
                        </div>

                        {/* BEED */}
                        <div className="course-item beed">
                        <img
                            src={educ}
                            alt="Bachelor of Elementary Education"
                        />
                        <h3>Bachelor of Elementary Education</h3>
                        </div>

                        {/* BSEd */}
                        <div className="course-item bsed">
                        <img
                            src={educc}
                            alt="Bachelor of Secondary Education"
                        />
                        <h3>Bachelor of Secondary Education</h3>
                        </div>

                        {/* BSCrim */}
                        <div className="course-item bscrim">
                        <img
                            src={crim}
                            alt="Bachelor of Science in Criminology"
                        />
                        <h3>BS Criminology</h3>
                        </div>

                        {/* BSOAd */}
                        <div className="course-item bsoad">
                        <img
                            src={oad}
                            alt="Bachelor of Science in Office Administration"
                        />
                        <h3>BS Office Administration</h3>
                        </div>
                    </div>
                </section>

                {/* Section 4: Announcement */}
                <section id="announcement" className="section"
                style={{backgroundImage: `url(${announcement})`, backgroundPosition: 'center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat', height: '100vh', width: '100vw', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative'}}>
                    
                    <header className="header-bar">
                        <div >
                            <h1>Announcements</h1>
                        </div>
                    </header>

                    <div className="announcements-container d-flex flex-wrap">
                        <div className="announcement-card">
                        <h3>No Tuition Fee Increase</h3>
                        <p>June 22, 2021</p>
                        <p>PS-GS & JUNIOR HIGH SCHOOL (Enroll Now!) click Read more to register</p>
                        <button className="btn btn-primary">Read More</button>
                        </div>

                        <div className="announcement-card">
                        <h3>No Tuition Fee Increase</h3>
                        <p>June 22, 2021</p>
                        <p>SENIOR HIGH SCHOOL - ABM / HUMSS / STEM / TECHVOC (Enroll Now!) click Read more to register</p>
                        <button className="btn btn-primary">Read More</button>
                        </div>

                        <div className="announcement-card">
                        <h3>Upcoming Events</h3>
                        <p>June 28, 2021</p>
                        <p>OLSHCO ENROLLMENT IS ONGOING!</p>
                        <button className="btn btn-primary">Read More</button>
                        </div>
                    </div>
                </section>                
            </div>

            <footer id="contact" className="footer-section" style={{
                backgroundColor: '#1a1a1a',
                color: 'white',
                padding: '40px 0',
                textAlign: 'center',
                marginTop: '0'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '0 20px' }}>
                    <h2 style={{ 
                        color: '#c70202', 
                        marginBottom: '20px',
                        fontSize: '2.5rem',
                        fontWeight: 'bold'
                    }}>
                        Contact Us
                    </h2>
                    
                    <p style={{ 
                        fontSize: '1.1rem', 
                        marginBottom: '30px',
                        color: '#cccccc'
                    }}>
                        Have questions or need assistance? Feel free to reach out to us:
                    </p>
                    
                    <div style={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        flexWrap: 'wrap',
                        gap: '40px',
                        marginBottom: '30px'
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ color: '#c70202', marginBottom: '10px' }}>📧 Email</h4>
                            <p style={{ margin: '0', color: '#cccccc' }}>olshco.acesschools.ph</p>
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ color: '#c70202', marginBottom: '10px' }}>📞 Phone</h4>
                            <p style={{ margin: '0', color: '#cccccc' }}>0956-2774029</p>
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                            <h4 style={{ color: '#c70202', marginBottom: '10px' }}>📍 Location</h4>
                            <p style={{ margin: '0', color: '#cccccc' }}>Guimba, Nueva Ecija</p>
                        </div>
                    </div>
                    
                    <div style={{ 
                        borderTop: '1px solid #333', 
                        paddingTop: '20px',
                        marginTop: '20px'
                    }}>
                        <p style={{ 
                            margin: '0 0 10px 0', 
                            fontSize: '1rem',
                            color: '#cccccc'
                        }}>
                            © 2024 OUR LADY OF THE SACRED HEART COLLEGE OF GUIMBA, INC.
                        </p>
                        <p style={{ 
                            margin: '0', 
                            fontSize: '0.9rem',
                            color: '#999999'
                        }}>
                            Created by BSIT-3B: Von Mamaid, Dianne Paderan, Aileen Rigor, Lorence Gamboa
                        </p>
                    </div>
                </div>
            </footer>
    </>
  );
};

export default Homepage;
