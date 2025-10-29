import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Box, VStack, Heading, Text, Card, CardBody, Table, Thead, Tbody, Tr, Th, Td, Button, useToast } from '@chakra-ui/react';
import axios from 'axios';

function PatientDetails() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [medications, setMedications] = useState([]);
  const toast = useToast();

  useEffect(() => {
    const fetchPatientDetails = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get(`http://localhost:5000/api/patients/${id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        setPatient(response.data);
        setMedications(response.data.medications || []);
      } catch (error) {
        console.error('Error fetching patient details:', error);
        toast({
          title: 'Error',
          description: 'Failed to fetch patient details',
          status: 'error',
          duration: 3000,
          isClosable: true
        });
      }
    };
    fetchPatientDetails();
  }, [id, toast]);

  const readInstructions = (medication) => {
    const text = `${medication.name} - ${medication.dosage} - ${medication.frequency}`;
    const utterance = new SpeechSynthesisUtterance(text);
    window.speechSynthesis.speak(utterance);
  };

  if (!patient) {
    return <Box p={8}>Loading...</Box>;
  }

  return (
    <Box p={8}>
      <VStack spacing={8} align="stretch">
        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="lg">{patient.name}'s Details</Heading>
              <Text><strong>Date of Birth:</strong> {new Date(patient.dateOfBirth).toLocaleDateString()}</Text>
              <Text><strong>Unique ID:</strong> {patient.uniqueId}</Text>
            </VStack>
          </CardBody>
        </Card>

        <Card>
          <CardBody>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Current Medications</Heading>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Medication</Th>
                    <Th>Dosage</Th>
                    <Th>Frequency</Th>
                    <Th>Start Date</Th>
                    <Th>Actions</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {medications.map((medication, index) => (
                    <Tr key={index}>
                      <Td>{medication.name}</Td>
                      <Td>{medication.dosage}</Td>
                      <Td>{medication.frequency}</Td>
                      <Td>{new Date(medication.startDate).toLocaleDateString()}</Td>
                      <Td>
                        <Button
                          size="sm"
                          colorScheme="blue"
                          onClick={() => readInstructions(medication)}
                        >
                          Read Instructions
                        </Button>
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
            </VStack>
          </CardBody>
        </Card>
      </VStack>
    </Box>
  );
}

export default PatientDetails;