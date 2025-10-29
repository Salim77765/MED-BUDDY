import React, { useState, useEffect } from 'react';
import { Box, VStack, Heading, Text, Card, Button, IconButton, useToast } from '@chakra-ui/react';
import { BellIcon, ChatIcon } from '@chakra-ui/icons';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';

const localizer = momentLocalizer(moment);

function MedicationCalendar({ selectedPatient }) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [medications, setMedications] = useState([]);
  const toast = useToast();

  useEffect(() => {
    if (selectedPatient?.medications) {
      setMedications(selectedPatient.medications);
    } else {
      setMedications([]);
    }
  }, [selectedPatient]);

  const getMedicationsForDate = (date) => {
    if (!medications) return [];
    
    const dateStr = moment(date).format('YYYY-MM-DD');
    return medications.filter(med => {
      const startDate = moment(med.startDate).format('YYYY-MM-DD');
      const endDate = med.endDate ? moment(med.endDate).format('YYYY-MM-DD') : moment().add(1, 'year').format('YYYY-MM-DD');
      return moment(dateStr).isBetween(startDate, endDate, 'day', '[]');
    });
  };

  const handleNotificationClick = () => {
    const currentMeds = getMedicationsForDate(new Date());
    if (currentMeds.length > 0) {
      currentMeds.forEach(med => {
        toast({
          title: `Time for ${med.name}`,
          description: `Take ${med.dosage} - ${med.frequency}`,
          status: 'info',
          duration: 9000,
          isClosable: true,
        });
      });
    } else {
      toast({
        title: 'No medications scheduled',
        description: 'There are no medications scheduled for today.',
        status: 'info',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const events = medications.map(med => ({
    title: `${med.name} - ${med.dosage}`,
    start: new Date(med.startDate),
    end: med.endDate ? new Date(med.endDate) : moment().add(1, 'year').toDate(),
    allDay: true,
    resource: med
  }));

  return (
    <Card w="full" p={4}>
      <VStack spacing={4} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Heading size="md">Medication Calendar</Heading>
          <IconButton
            aria-label="Check notifications"
            icon={<BellIcon />}
            onClick={handleNotificationClick}
            colorScheme="blue"
          />
        </Box>
        
        <Box h="500px">
          <Calendar
            localizer={localizer}
            events={events}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            views={['month', 'week', 'day']}
            defaultView="month"
            onSelectEvent={(event) => {
              toast({
                title: event.resource.name,
                description: `Dosage: ${event.resource.dosage}\nFrequency: ${event.resource.frequency}`,
                status: 'info',
                duration: 5000,
                isClosable: true,
              });
            }}
          />
        </Box>
      </VStack>
    </Card>
  );
}

export default MedicationCalendar;