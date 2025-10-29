import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  VStack,
  Heading,
  FormControl,
  FormLabel,
  Input,
  Button,
  useToast,
  Card,
  CardBody,
  Text,
  InputGroup,
  InputRightElement,
  Link
} from '@chakra-ui/react';
import axios from 'axios';

function DoctorAuthPage({ initialMode = 'signup' }) {
  const [isLogin, setIsLogin] = useState(initialMode === 'login');
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    specialization: '',
    licenseNumber: '',
    phoneNumber: ''
  });
  const navigate = useNavigate();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/doctor/signup';
      
      // Validate form data for registration
      if (!isLogin) {
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        if (!formData.name || !formData.specialization || !formData.licenseNumber) {
          throw new Error('Please fill in all required fields');
        }
      }

      const response = await axios.post(`http://localhost:5000${endpoint}`, formData);

      if (!response.data.token) {
        throw new Error('Authentication failed: No token received');
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('userRole', response.data.user.role || 'doctor');

      toast({
        title: isLogin ? 'Login Successful' : 'Registration Successful',
        description: isLogin ? 'Welcome back, Doctor!' : 'Your doctor account has been created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.response?.data?.details || error.message || 'Authentication failed',
        status: 'error',
        duration: 5000,
        isClosable: true
      });
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Box minH="100vh" display="flex" alignItems="center" justifyContent="center" bg="gray.50">
      <Card maxW="md" w="full" boxShadow="lg">
        <CardBody>
          <VStack spacing={6}>
            <Heading size="xl" color="blue.600">
              {isLogin ? 'Doctor Login' : 'Doctor Registration'}
            </Heading>
            <Text color="gray.600" fontSize="md">
              {isLogin 
                ? 'Sign in to manage your patients'
                : 'Create a doctor account to manage patients'}
            </Text>
            
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4}>
                {!isLogin && (
                  <FormControl isRequired>
                    <FormLabel>Full Name</FormLabel>
                    <Input
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      placeholder="Dr. John Smith"
                    />
                  </FormControl>
                )}

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="doctor@hospital.com"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel>Password</FormLabel>
                  <InputGroup>
                    <Input
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Enter password"
                    />
                    <InputRightElement width="4.5rem">
                      <Button h="1.75rem" size="sm" onClick={() => setShowPassword(!showPassword)}>
                        {showPassword ? 'Hide' : 'Show'}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                </FormControl>

                {!isLogin && (
                  <>
                    <FormControl isRequired>
                      <FormLabel>Specialization</FormLabel>
                      <Input
                        name="specialization"
                        value={formData.specialization}
                        onChange={handleInputChange}
                        placeholder="e.g., Cardiology, General Medicine"
                      />
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel>License Number</FormLabel>
                      <Input
                        name="licenseNumber"
                        value={formData.licenseNumber}
                        onChange={handleInputChange}
                        placeholder="Medical license number"
                      />
                    </FormControl>

                    <FormControl>
                      <FormLabel>Phone Number</FormLabel>
                      <Input
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="10-digit phone number"
                      />
                    </FormControl>
                  </>
                )}

                <Button
                  type="submit"
                  colorScheme="blue"
                  size="lg"
                  width="full"
                  mt={4}
                >
                  {isLogin ? 'Login' : 'Create Doctor Account'}
                </Button>

                <Text fontSize="sm" color="gray.600">
                  {isLogin ? "Don't have an account? " : "Already have an account? "}
                  <Link
                    color="blue.500"
                    onClick={() => setIsLogin(!isLogin)}
                    cursor="pointer"
                  >
                    {isLogin ? 'Sign up here' : 'Login here'}
                  </Link>
                </Text>

                <Text fontSize="sm" color="gray.600">
                  Are you a patient?{' '}
                  <Link
                    color="blue.500"
                    onClick={() => navigate('/signup')}
                    cursor="pointer"
                  >
                    Patient signup
                  </Link>
                </Text>
              </VStack>
            </form>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}

export default DoctorAuthPage;
