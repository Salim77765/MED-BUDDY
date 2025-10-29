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
  Select,
  FormHelperText,
  Divider
} from '@chakra-ui/react';
import axios from 'axios';

function AuthPage({ initialMode = 'signup' }) {
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
      const endpoint = isLogin ? '/api/auth/login' : '/api/auth/signup';
      
      // Validate form data for registration
      if (!isLogin) {
        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }
        if (formData.phoneNumber && !formData.phoneNumber.match(/^\d{10}$/)) {
          throw new Error('Please enter a valid 10-digit phone number');
        }
      }

      const response = await axios.post(`http://localhost:5000${endpoint}`, formData);

      if (!response.data.token) {
        throw new Error('Authentication failed: No token received');
      }

      localStorage.setItem('token', response.data.token);
      localStorage.setItem('userId', response.data.user.id);
      localStorage.setItem('userRole', response.data.user.role || 'patient');

      toast({
        title: isLogin ? 'Login Successful' : 'Registration Successful',
        description: isLogin ? 'Welcome back!' : 'Your account has been created successfully.',
        status: 'success',
        duration: 3000,
        isClosable: true
      });

      // Navigate to appropriate dashboard based on role
      const dashboardPath = response.data.user.role === 'doctor' ? '/doctor/dashboard' : '/dashboard';
      navigate(dashboardPath);
    } catch (error) {
      toast({
        title: 'Error',
        description: error.response?.data?.error || error.message || 'Authentication failed',
        status: 'error',
        duration: 3000,
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
              {isLogin ? 'Welcome Back' : 'Patient Registration'}
            </Heading>
            <Text color="gray.600" fontSize="md">
              {isLogin 
                ? 'Sign in to manage your patients\' medications'
                : 'Create an account to start managing patient medications'}
            </Text>
            
            <form onSubmit={handleSubmit} style={{ width: '100%' }}>
              <VStack spacing={4}>
                {!isLogin && (
                  <>
                    <FormControl isRequired>
                      <FormLabel>Full Name</FormLabel>
                      <Input
                        name="name"
                        type="text"
                        value={formData.name}
                        onChange={handleInputChange}
                        placeholder="Dr. John Doe"
                      />
                    </FormControl>

                    

                    <FormControl isRequired>
                      <FormLabel>Phone Number</FormLabel>
                      <Input
                        name="phoneNumber"
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={handleInputChange}
                        placeholder="Enter your phone number"
                      />
                      <FormHelperText>Format: 10-digit number</FormHelperText>
                    </FormControl>
                  </>
                )}

                <FormControl isRequired>
                  <FormLabel>Email</FormLabel>
                  <Input
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="doctor@example.com"
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
                      placeholder="Enter your password"
                    />
                    <InputRightElement width="4.5rem">
                      <Button
                        h="1.75rem"
                        size="sm"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? 'Hide' : 'Show'}
                      </Button>
                    </InputRightElement>
                  </InputGroup>
                  {!isLogin && (
                    <FormHelperText>
                      Password must be at least 6 characters long
                    </FormHelperText>
                  )}
                </FormControl>

                <Button
                  type="submit"
                  colorScheme="blue"
                  w="full"
                  size="lg"
                  mt={4}
                >
                  {isLogin ? 'Sign In' : 'Create Account'}
                </Button>
              </VStack>
            </form>

            <Divider />

            <Text color="gray.600">
              {isLogin ? "Don't have an account? " : 'Already have an account? '}
              <Button
                variant="link"
                color="blue.600"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setFormData({
                    name: '',
                    email: '',
                    password: '',
                    phoneNumber: ''
                  });
                }}
              >
                {isLogin ? 'Register here' : 'Sign in here'}
              </Button>
            </Text>

            <Text color="gray.600" fontSize="sm">
              Are you a doctor?{' '}
              <Button
                variant="link"
                color="blue.600"
                fontSize="sm"
                onClick={() => navigate('/doctor/signup')}
              >
                Doctor signup
              </Button>
            </Text>
          </VStack>
        </CardBody>
      </Card>
    </Box>
  );
}

export default AuthPage;