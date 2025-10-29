import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// OpenAI configuration
const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
let openaiApiKey;

// Initialize OpenAI with error handling
try {
  if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    throw new Error('OPENAI_API_KEY is not set or is using placeholder value');
  }
  openaiApiKey = process.env.OPENAI_API_KEY;
  console.log('OpenAI configuration initialized successfully');
} catch (error) {
  console.error('Error initializing OpenAI:', error);
}

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define schemas
const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['doctor', 'patient'], required: true },
  specialization: String,
  licenseNumber: String,
  phoneNumber: String,
  doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  dateOfBirth: Date,
  uniqueId: String,
  medications: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Medication' }],
  createdAt: { type: Date, default: Date.now }
});

const medicationSchema = new mongoose.Schema({
  patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  dosage: { type: String, required: true },
  frequency: { type: String, required: true },
  startDate: { type: Date, required: true },
  endDate: Date,
  instructions: String,
  reminders: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    time: { type: String, required: true },
    enabled: { type: Boolean, default: true }
  }]
});

// Add a pre-save hook to ensure reminders are generated
medicationSchema.pre('save', function(next) {
  // Only generate reminders if this is a new medication or reminders array is empty
  if (this.isNew || this.reminders.length === 0) {
    const reminders = generateReminders(this.frequency);
    this.reminders = reminders;
  }
  next();
});

const User = mongoose.model('User', userSchema);
const Medication = mongoose.model('Medication', medicationSchema);

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Helper function to get patient with medications
const getPatientWithMedications = async (id) => {
  const patient = await User.findById(id).populate('medications');
  if (!patient) {
    throw new Error('Patient not found');
  }
  return patient;
};

// Auth routes
app.post('/api/auth/doctor/signup', async (req, res) => {
  try {
    const { name, email, password, specialization, licenseNumber, phoneNumber } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, email, and password are required'
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: 'Invalid email format',
        details: 'Please enter a valid email address'
      });
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        error: 'Email already registered',
        details: 'This email is already associated with an account'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role: 'doctor',
      specialization,
      licenseNumber,
      phoneNumber
    });

    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, role: 'doctor' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      message: 'Doctor registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Signup error:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: 'Server error',
      details: error.message || 'Could not complete registration'
    });
  }
});

// Patient signup (simple registration with email/password)
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password, phoneNumber, dateOfBirth } = req.body;
    
    // Validate input
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create new patient
    const newPatient = new User({
      name,
      email,
      password: hashedPassword,
      phoneNumber,
      dateOfBirth,
      role: 'patient'
    });

    await newPatient.save();

    // Generate JWT token
    const token = jwt.sign(
      { userId: newPatient._id, role: 'patient' },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.status(201).json({
      token,
      user: {
        id: newPatient._id,
        name: newPatient.name,
        email: newPatient.email,
        role: 'patient'
      }
    });
  } catch (error) {
    console.error('Error in patient signup:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

app.post('/api/auth/patient/signup', async (req, res) => {
  try {
    const { name, dateOfBirth, uniqueId, doctorId, password } = req.body;

    // Validate required fields
    if (!name || !dateOfBirth || !uniqueId || !doctorId || !password) {
      return res.status(400).json({
        error: 'All fields are required',
        details: 'Name, date of birth, unique ID, doctor ID, and password must be provided'
      });
    }

    // Validate date format
    const dateObj = new Date(dateOfBirth);
    if (isNaN(dateObj.getTime())) {
      return res.status(400).json({
        error: 'Invalid date format',
        details: 'Date of birth must be a valid date'
      });
    }

    // Check if uniqueId already exists
    const existingPatient = await User.findOne({ uniqueId });
    if (existingPatient) {
      return res.status(400).json({
        error: 'Unique ID already exists',
        details: 'Please use a different unique ID'
      });
    }

    // Validate doctorId exists
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(400).json({
        error: 'Invalid doctor ID',
        details: 'The specified doctor does not exist'
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const patient = new User({
      name,
      dateOfBirth,
      uniqueId,
      password: hashedPassword,
      role: 'patient',
      doctorId
    });

    await patient.save();
    res.json({ user: { id: patient._id, name, dateOfBirth, uniqueId } });
  } catch (error) {
    console.error('Patient registration error:', error);
    res.status(500).json({
      error: 'Failed to register patient',
      details: error.message
    });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(400).json({ error: 'Invalid password' });

    const token = jwt.sign({ userId: user._id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    res.json({ token, user: { id: user._id, name: user.name, email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Protected routes
app.get('/api/patients', verifyToken, async (req, res) => {
  try {
    // Get the doctor's ID from the token
    const doctorId = req.user.userId;

    // Verify that the user is a doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({
        error: 'Unauthorized',
        details: 'Only doctors can view patient lists'
      });
    }

    // Find all patients assigned to this doctor
    const patients = await User.find({ 
      role: 'patient',
      doctorId: doctorId 
    })
    .select('-password')
    .populate('medications');
    
    res.json(patients);
  } catch (error) {
    console.error('Error fetching patients:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

app.get('/api/patients/:id', verifyToken, async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    console.log('Fetching patient with ID:', id);

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId:', id);
      return res.status(400).json({ error: 'Invalid patient ID format' });
    }

    const patient = await getPatientWithMedications(id);
    res.json(patient);
  } catch (error) {
    console.error('Error fetching patient:', error);
    res.status(500).json({ error: 'Failed to fetch patient details', details: error.message });
  }
});

// Add new patient (doctor only)
app.post('/api/patients', verifyToken, async (req, res) => {
  try {
    const doctorId = req.user.userId;
    
    // Verify that the user is a doctor
    const doctor = await User.findById(doctorId);
    if (!doctor || doctor.role !== 'doctor') {
      return res.status(403).json({
        error: 'Unauthorized',
        details: 'Only doctors can add patients'
      });
    }

    const { name, dateOfBirth, uniqueId, email, password } = req.body;

    // Validate required fields
    if (!name || !dateOfBirth || !uniqueId) {
      return res.status(400).json({
        error: 'Missing required fields',
        details: 'Name, date of birth, and unique ID are required'
      });
    }

    // Check if uniqueId already exists
    const existingPatient = await User.findOne({ uniqueId });
    if (existingPatient) {
      return res.status(400).json({
        error: 'Unique ID already exists',
        details: 'Please use a different unique ID'
      });
    }

    // Create default password if not provided
    const patientPassword = password || 'patient123';
    const hashedPassword = await bcrypt.hash(patientPassword, 10);

    // Create new patient
    const patient = new User({
      name,
      dateOfBirth,
      uniqueId,
      email: email || `${uniqueId}@patient.local`,
      password: hashedPassword,
      role: 'patient',
      doctorId: doctorId
    });

    await patient.save();

    // Return patient without password
    const patientResponse = {
      id: patient._id,
      name: patient.name,
      dateOfBirth: patient.dateOfBirth,
      uniqueId: patient.uniqueId,
      email: patient.email,
      doctorId: patient.doctorId
    };

    res.status(201).json(patientResponse);
  } catch (error) {
    console.error('Error adding patient:', error);
    res.status(500).json({
      error: 'Server error',
      details: error.message
    });
  }
});

app.post('/api/medications', verifyToken, async (req, res) => {
  try {
    const { patientId, medication } = req.body;
    const newMedication = new Medication({ patientId, ...medication });
    await newMedication.save();
    res.json(newMedication);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/process-discharge', verifyToken, async (req, res) => {
  try {
    const { dischargeSummary, patientId } = req.body;
    console.log('Received discharge summary request:', { patientId, summaryLength: dischargeSummary?.length });

    // Check if OpenAI API key is available
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.error('OpenAI not initialized');
      return res.status(500).json({
        error: 'Server configuration error',
        details: 'AI service is not properly configured. Please add your OpenAI API key to the .env file.',
        type: 'SERVER_ERROR'
      });
    }

    // Input validation
    if (!dischargeSummary?.trim() || !patientId) {
      console.error('Invalid input: Missing discharge summary or patient ID');
      return res.status(400).json({
        error: 'Invalid input',
        details: 'Discharge summary and patient ID are required',
        type: 'VALIDATION_ERROR'
      });
    }

    // Validate discharge summary length
    if (dischargeSummary.length > 10000) {
      console.error('Discharge summary too long');
      return res.status(400).json({
        error: 'Invalid input',
        details: 'Discharge summary is too long. Please limit to 10000 characters.',
        type: 'VALIDATION_ERROR'
      });
    }

    // Verify patient exists
    const patient = await User.findById(patientId);
    if (!patient) {
      console.error('Patient not found:', patientId);
      return res.status(404).json({
        error: 'Patient not found',
        details: 'The specified patient does not exist',
        type: 'VALIDATION_ERROR'
      });
    }

    console.log('Using OpenAI for processing...');
    
    const prompt = `Extract medication information from this medical text. Format each medication exactly like this:

MEDICATION:
- Name: Amoxicillin
- Dosage: 500mg
- Frequency: Three times daily
- Duration: 7 days
- Instructions: Take with food

Here's the text to analyze:
${dischargeSummary}`;

    // Call OpenAI API
    let response;
    try {
      response = await axios.post(
        OPENAI_API_URL,
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a medical assistant that extracts medication information from discharge summaries."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          }
        }
      );
    } catch (aiError) {
      console.error('OpenAI error:', aiError);
      console.error('OpenAI error response:', aiError.response?.data);
      console.error('OpenAI error status:', aiError.response?.status);
      
      let errorMessage = 'Failed to get response from AI service. Please try again later.';
      let errorDetails = aiError.message;
      
      if (aiError.response?.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded or insufficient credits';
        errorDetails = 'Your OpenAI API key has hit the rate limit or does not have sufficient credits. Please check your OpenAI account billing or wait a moment before trying again.';
      } else if (aiError.response?.data?.error?.message) {
        errorDetails = aiError.response.data.error.message;
      }
      
      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
        status: aiError.response?.status,
        type: 'AI_SERVICE_ERROR'
      });
    }

    let result;
    try {
      console.log('Processing OpenAI response...');
      result = response.data.choices[0].message.content;
      
      if (!result?.trim()) {
        console.error('Empty AI response received');
        throw new Error('Empty or invalid AI response');
      }

      const responseText = result.trim();
      console.log('Received AI response:', responseText);

      // Process AI response into structured data
      console.log('Processing AI response into structured data...');
      const medications = responseText
        .split('MEDICATION:')
        .filter(section => section.trim())
        .map(section => {
          const lines = section.split('\n').filter(line => line.trim());
          const medicationData = {};

          lines.forEach(line => {
            const match = line.match(/^- ([^:]+): (.+)$/);
            if (match) {
              const [, key, value] = match;
              medicationData[key.toLowerCase()] = value.trim();
            }
          });

          // Log the extracted medication data
          console.log('Extracted medication data:', medicationData);

          // Validate required fields
          const requiredFields = ['name', 'dosage', 'frequency'];
          const missingFields = requiredFields.filter(field => !medicationData[field]);
          
          if (missingFields.length > 0) {
            console.error('Missing fields in medication:', missingFields);
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
          }

          const med = {
            name: medicationData.name,
            dosage: medicationData.dosage,
            frequency: medicationData.frequency,
            duration: medicationData.duration || 'Duration not specified',
            instructions: medicationData.instructions || '',
            startDate: new Date(),
            reminders: generateReminders(medicationData.frequency)
          };
          
          console.log('Processed medication:', med);
          return med;
        });

      if (!medications || medications.length === 0) {
        console.error('No medications parsed from AI response');
        throw new Error('No valid medications could be parsed');
      }

      // Save medications to database
      console.log('Saving medications to database...');
      const savedMedications = await Promise.all(
        medications.map(async (med) => {
          const medication = new Medication({
            patientId,
            ...med
          });
          return medication.save();
        })
      );

      // Format medications for response
      const formattedMedications = medications.map(med => ({
        ...med,
        startDate: med.startDate.toISOString()
      }));

      console.log('Successfully processed medications');
      res.json({
        medications: formattedMedications,
        structuredMedications: savedMedications
      });

    } catch (error) {
      console.error('Processing error:', error);
      res.status(500).json({
        error: 'Processing error',
        details: error.message || 'Could not process the medication information. Please check the format and try again.',
        type: 'PROCESSING_ERROR'
      });
    }
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({
      error: 'Server error',
      details: 'An unexpected error occurred while processing your request.',
      type: 'SERVER_ERROR'
    });
  }
});

// Process discharge summary endpoint
app.post('/api/patients/:id/process-summary', verifyToken, async (req, res) => {
  try {
    const id = decodeURIComponent(req.params.id);
    const { dischargeSummary } = req.body;

    console.log('Processing discharge summary for patient:', id);
    console.log('Discharge summary:', dischargeSummary);

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid ObjectId:', id);
      return res.status(400).json({ error: 'Invalid patient ID format' });
    }

    // Validate patient exists
    const patient = await User.findById(id);
    if (!patient) {
      console.log('Patient not found:', id);
      return res.status(404).json({ error: 'Patient not found' });
    }

    // Prepare prompt for OpenAI API
    const prompt = `Extract medication information from the following discharge summary. For each medication, provide:
    1. Name of medication
    2. Dosage
    3. Frequency (be specific about timing, e.g., "three times a day", "after breakfast", "before bed")
    4. Duration (if specified)
    
    Format the response as a JSON array of medications. Example format:
    [
      {
        "name": "Amoxicillin",
        "dosage": "500mg",
        "frequency": "three times a day",
        "startDate": "current date",
        "endDate": "7 days from now"
      }
    ]

    Important: For frequency, use specific timing patterns like:
    - "once daily"
    - "twice daily"
    - "three times a day"
    - "four times a day"
    - "every morning"
    - "every night"
    - "every evening"
    - "before breakfast"
    - "after breakfast"
    - "before lunch"
    - "after lunch"
    - "before dinner"
    - "after dinner"

    Discharge Summary:
    ${dischargeSummary}`;

    console.log('Sending request to OpenAI...');

    // Check if OpenAI API key is available
    if (!openaiApiKey || openaiApiKey === 'your_openai_api_key_here') {
      console.error('OpenAI not initialized');
      return res.status(500).json({
        error: 'AI service not available',
        details: 'The AI service is not properly configured. Please check the OPENAI_API_KEY in environment variables.'
      });
    }

    // Get response from OpenAI
    let medicationsText;
    try {
      const response = await axios.post(
        OPENAI_API_URL,
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a medical assistant that extracts medication information from discharge summaries and returns JSON format."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          }
        }
      );
      medicationsText = response.data.choices[0].message.content;
      console.log('Received response from OpenAI:', medicationsText);
    } catch (aiError) {
      console.error('OpenAI error:', aiError);
      console.error('OpenAI error response:', aiError.response?.data);
      console.error('OpenAI error status:', aiError.response?.status);
      
      let errorMessage = 'Failed to get response from AI service. Please try again later.';
      let errorDetails = aiError.message;
      
      if (aiError.response?.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded or insufficient credits';
        errorDetails = 'Your OpenAI API key has hit the rate limit or does not have sufficient credits. Please check your OpenAI account billing or wait a moment before trying again.';
      } else if (aiError.response?.data?.error?.message) {
        errorDetails = aiError.response.data.error.message;
      }
      
      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
        status: aiError.response?.status
      });
    }

    let medications;
    try {
      // Clean the response text to ensure it's valid JSON
      const cleanedText = medicationsText.replace(/```json\n?|\n?```/g, '').trim();
      medications = JSON.parse(cleanedText);
      
      if (!Array.isArray(medications)) {
        throw new Error('Response is not an array');
      }
    } catch (error) {
      console.error('Error parsing OpenAI response:', error);
      console.error('Raw response:', medicationsText);
      return res.status(500).json({ 
        error: 'Failed to parse medication information',
        details: error.message,
        rawResponse: medicationsText
      });
    }

    // Process each medication
    const currentDate = new Date();
    const processedMedications = medications.map(med => {
      // Ensure all required fields are present
      if (!med.name || !med.dosage || !med.frequency) {
        throw new Error(`Missing required fields in medication: ${JSON.stringify(med)}`);
      }

      return {
        patientId: id,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        startDate: currentDate,
        endDate: new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        instructions: `Take ${med.dosage} ${med.frequency}`
      };
    });

    console.log('Processed medications:', processedMedications);

    // Save medications to database - reminders will be automatically generated by the pre-save hook
    const savedMedications = await Medication.create(processedMedications);
    console.log('Saved medications with auto-generated reminders:', savedMedications);

    // Update patient with new medications
    await User.findByIdAndUpdate(id, {
      $set: { medications: savedMedications.map(med => med._id) }
    });

    res.json({
      message: 'Discharge summary processed successfully',
      medications: savedMedications
    });
  } catch (error) {
    console.error('Error processing discharge summary:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: 'Failed to process discharge summary',
      details: error.message || 'An unexpected error occurred while processing the discharge summary.'
    });
  }
});

// Helper function to generate reminders based on frequency
function generateReminders(frequency) {
  // Convert frequency to lowercase for easier matching
  const freq = frequency.toLowerCase();
  
  // Default times for different frequencies
  const reminderTimes = {
    'once daily': ['09:00'],
    'twice daily': ['09:00', '21:00'],
    'three times a day': ['09:00', '14:00', '21:00'],
    'four times a day': ['09:00', '13:00', '17:00', '21:00'],
    'every morning': ['09:00'],
    'every night': ['21:00'],
    'every evening': ['18:00'],
    'before breakfast': ['08:00'],
    'after breakfast': ['10:00'],
    'before lunch': ['12:00'],
    'after lunch': ['14:00'],
    'before dinner': ['19:00'],
    'after dinner': ['21:00']
  };

  // Extract number and time period from frequency
  const matches = freq.match(/(\d+)\s*times?\s*(daily|a day)/i);
  if (matches) {
    const times = parseInt(matches[1]);
    // If it's a custom number of times per day not in our predefined list
    if (!reminderTimes[freq]) {
      // Calculate evenly spaced times throughout the day
      const startHour = 9; // Start at 9 AM
      const endHour = 21; // End at 9 PM
      const interval = Math.floor((endHour - startHour) / (times - 1));
      
      return Array.from({ length: times }, (_, i) => {
        const hour = startHour + (i * interval);
        return {
          time: `${hour.toString().padStart(2, '0')}:00`,
          enabled: true
        };
      });
    }
  }

  // Use predefined times if available, otherwise default to once daily
  const times = reminderTimes[freq] || reminderTimes['once daily'];
  return times.map(time => ({
    time,
    enabled: true
  }));
}

// Function to schedule a reminder
function scheduleReminder(medication, hours, minutes) {
  const now = new Date();
  let reminderTime = new Date(now);
  reminderTime.setHours(hours, minutes, 0, 0);

  // If the time has already passed today, schedule for tomorrow
  if (reminderTime < now) {
    reminderTime.setDate(reminderTime.getDate() + 1);
  }

  const timeUntilReminder = reminderTime - now;
  console.log(`Scheduling reminder for ${medication.name} at ${hours}:${minutes}, in ${timeUntilReminder}ms`);

  setTimeout(() => {
    console.log(`REMINDER: Time to take ${medication.name} - ${medication.dosage}`);
    // Schedule next reminder for tomorrow
    scheduleReminder(medication, hours, minutes);
  }, timeUntilReminder);
}

// Handle prescription queries
app.post('/api/chat/prescription', verifyToken, async (req, res) => {
  try {
    const { question, medications } = req.body;

    console.log('Processing prescription query:', question);
    console.log('Context medications:', medications);

    // Create a context string from medications
    const medicationContext = medications.map(med => 
      `- ${med.name} (${med.dosage}): Take ${med.frequency}. ${med.instructions}`
    ).join('\n');

    // Prepare prompt for OpenAI API
    const prompt = `You are a helpful medical assistant chatbot. Answer the following question about these prescribed medications:

Current Medications:
${medicationContext}

Patient Question: ${question}

Important guidelines for your response:
1. Only answer questions about the medications listed above
2. If asked about side effects, always advise to consult a healthcare provider
3. Keep responses clear, concise, and easy to understand
4. If you cannot answer based on the information provided, say so
5. Never recommend medications or changes to the prescription
6. For questions about timing, refer to the specific schedule provided
7. Include reminders about medication safety when relevant

Please provide your response:`;

    console.log('Sending request to OpenAI with prompt:', prompt);

    // Call OpenAI API
    let response;
    try {
      response = await axios.post(
        OPENAI_API_URL,
        {
          model: "gpt-3.5-turbo",
          messages: [
            {
              role: "system",
              content: "You are a helpful medical assistant chatbot that answers questions about prescribed medications."
            },
            {
              role: "user",
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openaiApiKey}`
          }
        }
      );
    } catch (aiError) {
      console.error('OpenAI error:', aiError);
      console.error('OpenAI error response:', aiError.response?.data);
      console.error('OpenAI error status:', aiError.response?.status);
      
      let errorMessage = 'Failed to get response from AI service. Please try again later.';
      let errorDetails = aiError.message;
      
      if (aiError.response?.status === 429) {
        errorMessage = 'OpenAI API rate limit exceeded or insufficient credits';
        errorDetails = 'Your OpenAI API key has hit the rate limit or does not have sufficient credits. Please check your OpenAI account billing or wait a moment before trying again.';
      } else if (aiError.response?.data?.error?.message) {
        errorDetails = aiError.response.data.error.message;
      }
      
      return res.status(500).json({
        error: errorMessage,
        details: errorDetails,
        status: aiError.response?.status,
        type: 'AI_SERVICE_ERROR'
      });
    }
    
    const answer = response.data.choices[0].message.content;
    
    console.log('Received response from OpenAI:', answer);

    res.json({ answer });
  } catch (error) {
    console.error('Error processing chat query:', error);
    res.status(500).json({ 
      error: 'Failed to process query',
      details: error.message
    });
  }
});

// Add reminder to medication
app.post('/api/medications/:id/reminders', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { time, enabled = true } = req.body;

    console.log('Adding reminder for medication:', id);
    console.log('Reminder details:', { time, enabled });

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      console.log('Invalid medication ID:', id);
      return res.status(400).json({ error: 'Invalid medication ID format' });
    }

    // Find and update the medication
    const medication = await Medication.findById(id);
    if (!medication) {
      console.log('Medication not found:', id);
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Add the new reminder
    medication.reminders.push({ time, enabled });
    await medication.save();

    console.log('Reminder added successfully');
    res.json(medication);
  } catch (error) {
    console.error('Error adding reminder:', error);
    res.status(500).json({ error: 'Failed to add reminder', details: error.message });
  }
});

// Update reminder
app.put('/api/medications/:id/reminders/:reminderId', verifyToken, async (req, res) => {
  try {
    const { id, reminderId } = req.params;
    const { time, enabled } = req.body;

    console.log('Updating reminder:', { medicationId: id, reminderId, time, enabled });

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid medication ID format' });
    }

    // Find and update the medication
    const medication = await Medication.findById(id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Find and update the specific reminder
    const reminder = medication.reminders.id(reminderId);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Update reminder fields
    if (time !== undefined) reminder.time = time;
    if (enabled !== undefined) reminder.enabled = enabled;

    await medication.save();
    console.log('Reminder updated successfully');
    res.json(medication);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder', details: error.message });
  }
});

// Delete reminder
app.delete('/api/medications/:id/reminders/:reminderId', verifyToken, async (req, res) => {
  try {
    const { id, reminderId } = req.params;

    console.log('Deleting reminder:', { medicationId: id, reminderId });

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid medication ID format' });
    }

    // Find the medication
    const medication = await Medication.findById(id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Remove the reminder
    medication.reminders.pull(reminderId);
    await medication.save();

    console.log('Reminder deleted successfully');
    res.json(medication);
  } catch (error) {
    console.error('Error deleting reminder:', error);
    res.status(500).json({ error: 'Failed to delete reminder', details: error.message });
  }
});

// Toggle reminder status
app.patch('/api/medications/:id/reminders/:reminderId', verifyToken, async (req, res) => {
  try {
    const { id, reminderId } = req.params;
    const { enabled } = req.body;

    console.log('Toggling reminder:', { medicationId: id, reminderId, enabled });

    // Validate MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid medication ID format' });
    }

    // Find the medication
    const medication = await Medication.findById(id);
    if (!medication) {
      return res.status(404).json({ error: 'Medication not found' });
    }

    // Find and update the specific reminder
    const reminder = medication.reminders.id(reminderId);
    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    // Update reminder enabled status
    reminder.enabled = enabled;

    // If enabling the reminder, schedule it
    if (enabled) {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      scheduleReminder(medication, hours, minutes);
    }

    await medication.save();
    console.log('Reminder updated successfully');
    res.json(medication);
  } catch (error) {
    console.error('Error updating reminder:', error);
    res.status(500).json({ error: 'Failed to update reminder', details: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));