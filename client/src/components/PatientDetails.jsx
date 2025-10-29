import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Box, VStack, Heading, Text, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td, Button, useToast, FormControl, FormLabel, Input, Textarea, Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure } from '@chakra-ui/react';
import axios from 'axios';
import MedicationCalendar from './MedicationCalendar';
import ChatbotComponent from './ChatbotComponent';

function PatientDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [patientDetails, setPatientDetails] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dischargeSummary, setDischargeSummary] = useState('');
  const [medications, setMedications] = useState(null);
  const [processingDischargeSummary, setProcessingDischargeSummary] = useState(false);
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [newReminder, setNewReminder] = useState({
    medicationId: '',
    time: '09:00',
    enabled: true
  });

  // Function to speak text using Web Speech API
  const speakReminder = (text) => {
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();

    // Create and configure speech utterance
    const speech = new SpeechSynthesisUtterance(text);
    speech.rate = 0.9; // Slightly slower for better clarity
    speech.pitch = 1;
    speech.volume = 1;
    
    // Speak the text
    window.speechSynthesis.speak(speech);
  };

  // Function to show reminder notification
  const showReminder = (medication) => {
    const message = `Time to take ${medication.name} - ${medication.dosage}. ${medication.instructions}`;
    
    // Show visual notification
    toast({
      title: 'Medication Reminder',
      description: message,
      status: 'info',
      duration: null,
      isClosable: true,
      position: 'top-right'
    });
    
    // Speak the reminder
    speakReminder(message);
  };

  useEffect(() => {
    console.log('PatientDetails mounted with ID:', id); // Debug log
    
    // Check if ID is valid
    if (!id || id === 'undefined') {
      console.error('Invalid patient ID:', id);
      toast({
        title: 'Error',
        description: 'Invalid patient ID. Please select a patient from the list.',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
      navigate('/dashboard');
      return;
    }
    
    fetchPatientDetails();
    // Set up an interval to periodically refresh the data
    const refreshInterval = setInterval(fetchPatientDetails, 5000);
    
    // Cleanup interval on component unmount
    return () => clearInterval(refreshInterval);
  }, [id]);

  useEffect(() => {
    // Check for reminders every minute
    const checkReminders = () => {
      if (!patientDetails?.medications) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      
      patientDetails.medications.forEach(medication => {
        medication.reminders.forEach(reminder => {
          if (!reminder.enabled) return;
          
          const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number);
          
          if (currentHour === reminderHour && currentMinute === reminderMinute) {
            showReminder(medication);
          }
        });
      });
    };

    // Check immediately and then every minute
    checkReminders();
    const interval = setInterval(checkReminders, 60000);
    
    return () => clearInterval(interval);
  }, [patientDetails, toast]);

  const fetchPatientDetails = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      const url = `http://localhost:5000/api/patients/${encodeURIComponent(id)}`;
      console.log('Fetching patient details from:', url); // Debug log
      
      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      console.log('Patient details received:', response.data); // Debug log
      setPatientDetails(response.data);
    } catch (error) {
      console.error('Error fetching patient details:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast({
          title: 'Error',
          description: error.response?.data?.error || 'Failed to fetch patient details',
          status: 'error',
          duration: 5000,
          isClosable: true
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const processDischargeSummary = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    if (!dischargeSummary.trim()) {
      toast({
        title: 'Missing Information',
        description: 'Please enter the discharge summary or medication details',
        status: 'warning',
        duration: 3000,
        isClosable: true
      });
      return;
    }

    setProcessingDischargeSummary(true);
    try {
      // Fix the URL by ensuring no special characters are in the path
      const url = `http://localhost:5000/api/patients/${encodeURIComponent(id)}/process-summary`;
      console.log('Processing discharge summary for patient ID:', id); // Debug log
      console.log('Making request to:', url); // Debug log
      console.log('Discharge summary:', dischargeSummary); // Debug log
      
      const response = await axios.post(
        url,
        { dischargeSummary },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('Discharge summary response:', response.data); // Debug log
      setMedications(response.data.medications);
      toast({
        title: 'Success',
        description: 'Discharge summary processed successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
      
      // Refresh patient data to get updated medications
      await fetchPatientDetails();
      
      // Clear the discharge summary input
      setDischargeSummary('');
    } catch (error) {
      console.error('Error processing discharge summary:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.details || 'Failed to process discharge summary';
      console.error('Error details:', {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message
      }); // Debug log
      toast({
        title: 'Error',
        description: errorMessage,
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    } finally {
      setProcessingDischargeSummary(false);
    }
  };

  const addReminder = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await axios.post(`http://localhost:5000/api/medications/${newReminder.medicationId}/reminders`, {
        time: newReminder.time,
        enabled: newReminder.enabled
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      fetchPatientDetails(); // Refresh patient data
      onClose();
      
      toast({
        title: 'Success',
        description: 'Reminder added successfully',
        status: 'success',
        duration: 3000,
        isClosable: true
      });
    } catch (error) {
      console.error('Error adding reminder:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to add reminder',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    }
  };

  const toggleReminder = async (medicationId, reminderId, enabled) => {
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    try {
      await axios.patch(`http://localhost:5000/api/medications/${medicationId}/reminders/${reminderId}`, {
        enabled: !enabled
      }, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      fetchPatientDetails(); // Refresh patient data
    } catch (error) {
      console.error('Error toggling reminder:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        toast({
          title: 'Error',
          description: 'Failed to update reminder',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    }
  };

  if (isLoading) {
    return <Text>Loading...</Text>;
  }

  if (!patientDetails) {
    return <Text>Patient not found</Text>;
  }

  return (
    <Box p={4}>
      <VStack spacing={6} align="stretch">
        {/* Patient Info Card */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="lg">{patientDetails.name}</Heading>
              <Text><strong>Date of Birth:</strong> {new Date(patientDetails.dateOfBirth).toLocaleDateString()}</Text>
              <Text><strong>Unique ID:</strong> {patientDetails.uniqueId}</Text>
            </VStack>
          </CardBody>
        </Card>

        {/* Discharge Summary Section */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Process Discharge Summary</Heading>
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
                isLoading={processingDischargeSummary}
                w="full"
              >
                Process Summary
              </Button>
            </VStack>
          </CardBody>
        </Card>

        {/* Medications Table */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Medications</Heading>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Medication</Th>
                    <Th>Dosage</Th>
                    <Th>Frequency</Th>
                    <Th>Start Date</Th>
                    <Th>End Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {patientDetails.medications?.map((medication, index) => (
                    <Tr key={index}>
                      <Td>{medication.name}</Td>
                      <Td>{medication.dosage}</Td>
                      <Td>{medication.frequency}</Td>
                      <Td>{new Date(medication.startDate).toLocaleDateString()}</Td>
                      <Td>{medication.endDate ? new Date(medication.endDate).toLocaleDateString() : 'Ongoing'}</Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => {
                            setNewReminder(prev => ({ ...prev, medicationId: medication._id }));
                            onOpen();
                          }}
                        >
                          Add Reminder
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </VStack>
          </CardBody>
        </Card>

        {/* Calendar Section */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Medication Calendar</Heading>
              <MedicationCalendar selectedPatient={patientDetails} />
            </VStack>
          </CardBody>
        </Card>

        {/* Chatbot Section */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Medication Assistant</Heading>
              <ChatbotComponent medications={patientDetails?.medications || []} />
            </VStack>
          </CardBody>
        </Card>

        {/* Reminders Table */}
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Reminders</Heading>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Medication</Th>
                    <Th>Time</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {patientDetails.medications?.map(medication =>
                    medication.reminders?.map((reminder, rIndex) => (
                      <Tr key={`${medication._id}-${rIndex}`}>
                        <Td>{medication.name}</Td>
                        <Td>{reminder.time}</Td>
                        <Td>{reminder.enabled ? 'Active' : 'Disabled'}</Td>
                        <Td>
                          <Button
                            size="sm"
                            colorScheme={reminder.enabled ? 'red' : 'green'}
                            onClick={() => toggleReminder(medication._id, reminder._id, reminder.enabled)}
                          >
                            {reminder.enabled ? 'Disable' : 'Enable'}
                          </Button>
                        </Td>
                      </Tr>
                    ))
                  )}
                </Tbody>
              </Table>
            </VStack>
          </CardBody>
        </Card>
      </VStack>

      {/* Add Reminder Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Add New Reminder</ModalHeader>
          <ModalBody>
            <FormControl>
              <FormLabel>Time</FormLabel>
              <Input
                type="time"
                value={newReminder.time}
                onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
              />
            </FormControl>
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={addReminder}>
              Add
            </Button>
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}

export default PatientDetails;