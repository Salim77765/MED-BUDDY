import React from 'react';
import { useSpeechSynthesis } from 'react-speech-kit';
import { Button, VStack, Text } from '@chakra-ui/react';

const TextToSpeech = ({ text, label }) => {
  const { speak, speaking, supported } = useSpeechSynthesis();

  if (!supported) {
    return <Text color="red.500">Text to speech is not supported in your browser.</Text>;
  }

  return (
    <VStack spacing={4} align="stretch">
      <Button
        colorScheme="blue"
        isLoading={speaking}
        onClick={() => speak({ text })}
        leftIcon={<i className="fas fa-volume-up" />}
      >
        {label || 'Read Instructions'}
      </Button>
    </VStack>
  );
};

export default TextToSpeech;
