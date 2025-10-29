import React, { useState, useEffect } from 'react';
import { ChakraProvider, Box, Container, VStack, Heading, Text, Button, FormControl, FormLabel, Input, Textarea, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td, SimpleGrid, useToast, Flex, Spacer, useColorMode } from '@chakra-ui/react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import Calendar from 'react-calendar';
import axios from 'axios';
import PatientDetails from './components/PatientDetails';
import AuthPage from './pages/AuthPage';
import DoctorAuthPage from './pages/DoctorAuthPage';
import MedicationCalendar from './components/MedicationCalendar';

const NavigationHeader = () => {
  const navigate = useNavigate();
  const { colorMode, toggleColorMode } = useColorMode();
  
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    navigate('/login');
  };

  return (
    <Flex p={4} bg={colorMode === 'light' ? 'gray.100' : 'gray.700'} mb={4}>
      <Heading size="md">MedAssist</Heading>
      <Spacer />
      <Flex gap={4}>
        <Button onClick={toggleColorMode}>
          {colorMode === 'light' ? 'Dark' : 'Light'} Mode
        </Button>
        {localStorage.getItem('token') && (
          <Button onClick={handleLogout} colorScheme="red">
            Logout
          </Button>
        )}
      </Flex>
    </Flex>
  );
};

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (!token) {
      navigate('/login');
    }
  }, [token, navigate]);

  return token ? children : null;
};

function App() {
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [medications, setMedications] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [newPatient, setNewPatient] = useState({
    name: '',
    dateOfBirth: '',
    uniqueId: '',
    doctorId: localStorage.getItem('doctorId') || ''
  });
  const toast = useToast();
  const navigate = useNavigate();

  const processDischargeSummary = async () => {
    // Validate input
    if (!dischargeSummary.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter the medication details in your own words. For example: "Patient needs to take 500mg of Amoxicillin three times daily for 7 days"',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
      return;
    }

    if (!selectedPatient) {
      toast({
        title: 'Patient Not Selected',
        description: 'Please select a patient before entering medication details',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      // Send request to process discharge summary
      const response = await axios.post('http://localhost:5000/api/process-discharge', 
        {
          dischargeSummary: dischargeSummary,
          patientId: selectedPatient._id
        },
        {
          headers: { 
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
            'doctor-id': localStorage.getItem('doctorId')
          }
        }
      );

      const { medications, structuredMedications } = response.data;

      // Update state with processed medications
      setMedications(medications);
      
      // Update patient with new medications
      const updatedPatient = {
        ...selectedPatient,
        medications: structuredMedications
      };
      setSelectedPatient(updatedPatient);

      // Clear form and show success message
      setDischargeSummary('');
      toast({
        title: 'Success',
        description: 'Medications have been processed and saved successfully',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });

      // Navigate to patient details
      navigate(`/patient/${selectedPatient._id}`);

    } catch (error) {
      console.error('Error processing discharge summary:', error);
      
      // Handle different types of errors
      const errorType = error.response?.data?.type;
      let errorTitle = 'Error';
      let errorMessage = error.response?.data?.details || 
                        error.response?.data?.error || 
                        'Failed to process the discharge summary';

      switch (errorType) {
        case 'VALIDATION_ERROR':
          errorTitle = 'Invalid Input';
          break;
        case 'NO_MEDICATIONS_ERROR':
          errorTitle = 'No Medications Found';
          errorMessage = 'No medication information was found in the text. Please ensure the discharge summary contains clear medication details.';
          break;
        case 'AI_PROCESSING_ERROR':
          errorTitle = 'AI Processing Error';
          errorMessage = 'Could not process the medication information. Please check the format and try again.';
          break;
        case 'PROCESSING_ERROR':
          errorTitle = 'Processing Error';
          errorMessage = 'Failed to extract medication details. Please ensure the text is properly formatted.';
          break;
        default:
          if (!error.response) {
            errorTitle = 'Connection Error';
            errorMessage = 'Network error. Please check your connection and try again.';
          }
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addPatient = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'http://localhost:5000/api/patients',
        newPatient,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );

      // Add the new patient to the list
      setPatients(prev => [...prev, response.data]);
      
      // Clear the form
      setNewPatient({
        name: '',
        dateOfBirth: '',
        uniqueId: ''
      });

      toast({
        title: 'Success',
        description: 'Patient added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.details || 'Failed to add patient',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const token = localStorage.getItem('token');
        const userRole = localStorage.getItem('userRole');
        
        if (!token) {
          navigate('/login');
          return;
        }

        // Only fetch patients if the user is a doctor
        if (userRole !== 'doctor') {
          console.log('User is not a doctor, skipping patient fetch');
          return;
        }

        const response = await axios.get('http://localhost:5000/api/patients', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        setPatients(response.data || []);
      } catch (error) {
        console.error('Error fetching patients:', error);
        toast({
          title: 'Error',
          description: error.response?.data?.details || 'Failed to fetch patients',
          status: 'error',
          duration: 3000,
          isClosable: true
        });

        // If unauthorized, redirect to login
        if (error.response?.status === 401 || error.response?.status === 403) {
          localStorage.clear();
          navigate('/login');
        }
      }
    };

    fetchPatients();
  }, [navigate, toast]);

  return (
    <ChakraProvider>
      <Box>
        <NavigationHeader />
        <Container maxW="container.xl" py={5}>
          <Routes>
            {/* Redirect root to signup */}
            <Route path="/" element={<Navigate to="/signup" replace />} />
            
            {/* Patient Auth routes */}
            <Route path="/signup" element={<AuthPage initialMode="signup" />} />
            <Route path="/login" element={<AuthPage initialMode="login" />} />

            {/* Doctor Auth routes */}
            <Route path="/doctor/signup" element={<DoctorAuthPage initialMode="signup" />} />
            <Route path="/doctor/login" element={<DoctorAuthPage initialMode="login" />} />

            {/* Protected dashboard route */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <VStack spacing={8}>
                  <Heading size="xl">Medication Management Assistant</Heading>
                  <Text fontSize="lg" color="gray.600">
                    Welcome to your medication management dashboard
                  </Text>

                  {/* Patient Dashboard Message */}
                  {localStorage.getItem('userRole') === 'patient' && (
                    <Card w="full" bg="blue.50">
                      <CardBody>
                        <VStack spacing={3}>
                          <Heading size="md" color="blue.700">Welcome, Patient!</Heading>
                          <Text color="gray.700">
                            You can view your medications, set reminders, and chat with our AI assistant about your prescriptions.
                          </Text>
                          <Text color="gray.600" fontSize="sm">
                            To view your medications, please contact your doctor or navigate to your patient profile.
                          </Text>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}

                  {/* Add New Patient Section - Only for Doctors */}
                  {localStorage.getItem('userRole') === 'doctor' && (
                    <Card w="full">
                      <CardBody>
                        <VStack spacing={4}>
                          <Heading size="md">Add New Patient</Heading>
                          <FormControl isRequired>
                            <FormLabel>Patient Name</FormLabel>
                            <Input
                              value={newPatient.name}
                              onChange={(e) => setNewPatient({ ...newPatient, name: e.target.value })}
                              placeholder="Enter patient name"
                            />
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>Date of Birth</FormLabel>
                            <Input
                              type="date"
                              value={newPatient.dateOfBirth}
                              onChange={(e) => setNewPatient({ ...newPatient, dateOfBirth: e.target.value })}
                            />
                          </FormControl>
                          <FormControl isRequired>
                            <FormLabel>Unique ID</FormLabel>
                            <Input
                              value={newPatient.uniqueId}
                              onChange={(e) => setNewPatient({ ...newPatient, uniqueId: e.target.value })}
                              placeholder="Enter patient's unique ID"
                            />
                          </FormControl>
                          <Button colorScheme="blue" onClick={addPatient} w="full">
                            Add Patient
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}

                  {/* Patient List Section - Only for Doctors */}
                  {localStorage.getItem('userRole') === 'doctor' && (
                    <Card w="full">
                      <CardBody>
                        <VStack spacing={4}>
                          <Heading size="md">Your Patients</Heading>
                          {patients.length === 0 ? (
                            <Text color="gray.500">No patients found. Add a new patient to get started.</Text>
                          ) : (
                            <Table variant="simple">
                              <Thead>
                                <Tr>
                                  <Th>Name</Th>
                                  <Th>Email</Th>
                                  <Th>Phone</Th>
                                  <Th>Actions</Th>
                                </Tr>
                              </Thead>
                              <Tbody>
                                {patients.map(patient => (
                                  <Tr key={patient._id}>
                                    <Td>{patient.name}</Td>
                                    <Td>{patient.email}</Td>
                                    <Td>{patient.phoneNumber}</Td>
                                    <Td>
                                      <Button
                                        colorScheme="blue"
                                        size="sm"
                                        onClick={() => {
                                          console.log('Navigating to patient:', patient);
                                          if (!patient._id && !patient.id) {
                                            toast({
                                              title: 'Error',
                                              description: 'Patient ID is missing',
                                              status: 'error',
                                              duration: 3000,
                                              isClosable: true
                                            });
                                            return;
                                          }
                                          setSelectedPatient(patient);
                                          const patientId = patient._id || patient.id;
                                          navigate(`/patient/${patientId}`);
                                        }}
                                      >
                                        View Details
                                      </Button>
                                    </Td>
                                </Tr>
                              ))}
                            </Tbody>
                          </Table>
                        )}
                      </VStack>
                    </CardBody>
                  </Card>
                  )}

                  {/* Medication Processing Section */}
                  {selectedPatient && (
                    <Card w="full">
                      <CardBody>
                        <VStack spacing={4}>
                          <Heading size="md">Process Medication</Heading>
                          <FormControl>
                            <FormLabel>Enter Discharge Summary or Medication Details</FormLabel>
                            <Textarea
                              value={dischargeSummary}
                              onChange={(e) => setDischargeSummary(e.target.value)}
                              placeholder="Enter the discharge summary or medication details..."
                              rows={6}
                            />
                          </FormControl>
                          <Button
                            colorScheme="blue"
                            onClick={processDischargeSummary}
                            isLoading={isLoading}
                            w="full"
                          >
                            Process Summary
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}

                  {/* Display Processed Medications */}
                  {medications && (
                    <Card w="full">
                      <CardBody>
                        <VStack spacing={4}>
                          <Heading size="md">Medication Instructions</Heading>
                          <Text whiteSpace="pre-line">{medications}</Text>
                          <Button
                            colorScheme="green"
                            onClick={() => {
                              const utterance = new SpeechSynthesisUtterance(medications);
                              window.speechSynthesis.speak(utterance);
                            }}
                          >
                            Read Instructions Aloud
                          </Button>
                        </VStack>
                      </CardBody>
                    </Card>
                  )}
                </VStack>
              </ProtectedRoute>
            } />

            {/* Patient details routes */}
            <Route path="/patient/:id" element={
              localStorage.getItem('token') ? (
                <PatientDetails />
              ) : (
                <Navigate to="/signup" replace />
              )
            } />
            <Route path="/patients/:id" element={
              localStorage.getItem('token') ? (
                <PatientDetails />
              ) : (
                <Navigate to="/signup" replace />
              )
            } />
          </Routes>
        </Container>
      </Box>
    </ChakraProvider>
  );
}

export default App;