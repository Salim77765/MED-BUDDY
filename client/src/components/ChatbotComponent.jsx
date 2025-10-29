import React, { useState, useEffect } from 'react';
import { Box, VStack, Text, Button, Input, useToast, Spinner } from '@chakra-ui/react';
import axios from 'axios';

const ChatbotComponent = ({ medications, currentTime }) => {
  const [speaking, setSpeaking] = useState(false);
  const [currentMedications, setCurrentMedications] = useState([]);
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useToast();

  useEffect(() => {
    // Filter medications that need to be taken at the current time
    if (medications) {
      const now = currentTime || new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      const currentMeds = medications.filter(med => {
        return med.reminders.some(reminder => {
          if (!reminder.enabled) return false;
          const [reminderHour, reminderMinute] = reminder.time.split(':').map(Number);
          return reminderHour === currentHour && 
                 Math.abs(reminderMinute - currentMinute) <= 30; // Within 30 minutes window
        });
      });

      setCurrentMedications(currentMeds);

      // Automatically announce medications if there are any due
      if (currentMeds.length > 0) {
        announceReminders();
      }
    }
  }, [medications, currentTime]);

  const announceReminders = () => {
    if (!currentMedications.length) {
      toast({
        title: 'No medications',
        description: 'There are no medications to take at this time.',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    const message = generateAnnouncementMessage();
    const utterance = new SpeechSynthesisUtterance(message);
    
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = (event) => {
      console.error('Speech synthesis error:', event);
      setSpeaking(false);
      toast({
        title: 'Error',
        description: 'Failed to read medication instructions',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    };

    window.speechSynthesis.speak(utterance);
  };

  const generateAnnouncementMessage = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    let message = `It's ${timeStr}. Here are your medications to take now:\n`;
    
    currentMedications.forEach((med, index) => {
      message += `${index + 1}. ${med.name}: ${med.dosage}. ${med.instructions}\n`;
    });

    return message;
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
    setSpeaking(false);
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim()) {
      toast({
        title: 'Error',
        description: 'Please enter a question',
        status: 'warning',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Authentication token not found');
      }

      const response = await axios.post('http://localhost:5000/api/chat/prescription', {
        question: question.trim(),
        medications
      }, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      setAnswer(response.data.answer);
      
      // Read out the answer
      const utterance = new SpeechSynthesisUtterance(response.data.answer);
      utterance.onstart = () => setSpeaking(true);
      utterance.onend = () => setSpeaking(false);
      window.speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Error getting answer:', error);
      toast({
        title: 'Error',
        description: error.message === 'Authentication token not found' 
          ? 'Please log in again to continue'
          : 'Failed to get answer. Please try again.',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box p={4} borderWidth="1px" borderRadius="lg">
      <VStack spacing={4} align="stretch">
        <Text fontSize="lg" fontWeight="bold">
          Medication Assistant
        </Text>
        
        {currentMedications.length > 0 ? (
          currentMedications.map((med, index) => (
            <Box key={index} p={3} borderWidth="1px" borderRadius="md">
              <Text><strong>{med.name}</strong></Text>
              <Text>Dosage: {med.dosage}</Text>
              <Text>Instructions: {med.instructions}</Text>
            </Box>
          ))
        ) : (
          <Text>No medications due at this time</Text>
        )}

        <Button
          onClick={speaking ? stopSpeaking : announceReminders}
          colorScheme={speaking ? "red" : "blue"}
        >
          {speaking ? "Stop Speaking" : "Read Instructions"}
        </Button>

        <Box borderTopWidth="1px" pt={4} mt={4}>
          <Text fontSize="md" fontWeight="bold" mb={2}>
            Ask about your medications
          </Text>
          <Input
            placeholder="e.g., When should I take my next dose?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleQuestionSubmit()}
            mb={2}
          />
          <Button
            onClick={handleQuestionSubmit}
            colorScheme="teal"
            isLoading={loading}
            loadingText="Getting answer..."
            width="100%"
          >
            Ask Question
          </Button>
          
          {loading && <Spinner mt={2} />}
          
          {answer && (
            <Box mt={4} p={3} borderWidth="1px" borderRadius="md" bg="gray.50">
              <Text fontWeight="bold">Answer:</Text>
              <Text>{answer}</Text>
            </Box>
          )}
        </Box>
      </VStack>
    </Box>
  );
};

export default ChatbotComponent;