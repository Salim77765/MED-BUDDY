import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, VStack, Heading, FormControl, FormLabel, Input, Button, useToast, Card, CardBody, Text } from '@chakra-ui/react';
import axios from 'axios';

function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: ''
  });
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/doctor/signup';
      const response = await axios.post(`http://localhost:5000${endpoint}`, formData);

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('doctorId', response.data.user.id);

      toast({
        title: isLogin ? 'Login Successful' : 'Registration Successful',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      navigate('/');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || 'Authentication failed',
        status: 'error',
        duration: 3000,
        isClosable: true
      });
    }
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
      <Card maxW="md" w="full">
        <CardBody>
          <VStack spacing={6}>
            <Heading size="xl">{isLogin ? 'Login' : 'Patient Registration'}</Heading>
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4}>
                {!isLogin && (
                  <FormControl isRequired>
                    <FormLabel>Name</FormLabel>
                    <Input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </FormControl>
                )}
                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </FormControl>
                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <Input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </FormControl>
                <Button type="submit" colorScheme="blue" w="full">
                  {isLogin ? 'Login' : 'Register'}
                </Button>
              </VStack>
            </form>
            <Text>
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Button variant="link" onClick={() => setIsLogin(!isLogin)}>
                {isLogin ? 'Register here' : 'Login here'}
              </Button>
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}

export default AuthPage;