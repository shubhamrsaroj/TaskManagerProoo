'use client';

import { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Heading,
  Text,
  useToast,
  Container,
  Link,
} from '@chakra-ui/react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { saveAuthData } from '@/lib/auth';
import { FiUser, FiMail, FiLock, FiBriefcase, FiArrowRight, FiEye, FiEyeOff } from 'react-icons/fi';

// Professional color scheme with bright accents and dark background
const colors = {
  background: {
    primary: '#0F172A',     // Deep blue-black
    card: '#1E293B',        // Dark blue-gray
    input: '#0F172A',       // Darker blue for inputs
  },
  accent: {
    primary: '#3B82F6',     // Bright blue
    secondary: '#60A5FA',   // Lighter blue
    success: '#10B981',     // Emerald green
    highlight: '#8B5CF6',   // Vibrant purple
    gradient: 'linear-gradient(135deg, #3B82F6, #8B5CF6)', // Blue to purple gradient
  },
  text: {
    primary: '#F1F5F9',     // Almost white
    secondary: '#CBD5E1',   // Light gray
    muted: '#64748B',       // Muted blue-gray
  },
  border: {
    light: '#334155',       // Medium blue-gray
    focus: '#60A5FA',       // Light blue for focus
  }
};

interface RegisterForm {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: string;
}

export default function RegisterPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { register, handleSubmit, watch, formState: { errors } } = useForm();
  const router = useRouter();
  const toast = useToast();

  const password = watch('password');

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const onSubmit = async (data: RegisterForm) => {
    try {
      setIsLoading(true);
      const response = await api.post('/auth/register', {
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
      });
      const { token, user } = response.data;
      
      // Save auth data
      saveAuthData(token, user);
      
      toast({
        title: 'Registration successful',
        status: 'success',
        duration: 3000,
      });
      router.push('/dashboard');
    } catch (error: any) {
      toast({
        title: 'Registration failed',
        description: error.response?.data?.message || 'Something went wrong',
        status: 'error',
        duration: 5000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box 
      minH="100vh" 
      bg={`linear-gradient(135deg, ${colors.background.primary} 0%, #1A365D 100%)`}
      color={colors.text.primary}
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
    >
      {/* Decorative background elements */}
      <Box 
        position="absolute" 
        top="-5%" 
        left="-5%" 
        width="500px" 
        height="500px" 
        borderRadius="full" 
        bg={colors.accent.highlight}
        opacity="0.07"
        zIndex={0}
      />
      <Box 
        position="absolute" 
        bottom="-10%" 
        right="-10%" 
        width="600px" 
        height="600px" 
        borderRadius="full" 
        bg={colors.accent.primary}
        opacity="0.05"
        zIndex={0}
      />
      
      <Container maxW="container.sm" py={12} position="relative" zIndex={1}>
        <Box 
          p={8} 
          bg={colors.background.card}
          borderRadius="2xl" 
          boxShadow="0 25px 50px -12px rgba(0, 0, 0, 0.25)"
          borderLeft="4px solid"
          borderColor={colors.accent.primary}
          overflow="hidden"
          position="relative"
        >
          {/* Decorative accent at top right of card */}
          <Box 
            position="absolute"
            top="0"
            right="0"
            width="150px"
            height="150px"
            bg={colors.accent.primary}
            opacity="0.1"
            borderBottomLeftRadius="full"
          />
          
          <VStack spacing={6} align="stretch">
            <VStack spacing={3} align="center">
              <Box
                width="70px"
                height="70px"
                borderRadius="full"
                bgGradient={colors.accent.gradient}
                display="flex"
                alignItems="center"
                justifyContent="center"
                mb={2}
                boxShadow="0 0 20px rgba(59, 130, 246, 0.4)"
              >
                <Box as={FiUser} size="32px" color="white" />
              </Box>
              <Heading 
                fontSize="3xl" 
                fontWeight="bold"
                bgGradient="linear(to-r, #60A5FA, #8B5CF6)"
                bgClip="text"
              >
                Create Your Account
              </Heading>
              <Text color={colors.text.secondary}>Sign up to start managing your tasks</Text>
            </VStack>
            
            <Box as="form" onSubmit={handleSubmit(onSubmit)}>
              <VStack spacing={5}>
                <FormControl isInvalid={!!errors.name}>
                  <FormLabel fontWeight="medium" color={colors.text.secondary}>
                    <Box display="flex" alignItems="center">
                      <Box as={FiUser} mr={2} color={colors.accent.primary} />
                      Full Name
                    </Box>
                  </FormLabel>
                  <Input
                    type="text"
                    bg={colors.background.input}
                    borderColor={colors.border.light}
                    color={colors.text.primary}
                    _hover={{ borderColor: colors.border.focus }}
                    _focus={{ 
                      borderColor: colors.accent.primary, 
                      boxShadow: `0 0 0 1px ${colors.accent.primary}`,
                      bg: 'rgba(15, 23, 42, 0.8)'
                    }}
                    placeholder="Enter your full name"
                    fontSize="md"
                    py={6}
                    {...register('name', {
                      required: 'Name is required',
                    })}
                  />
                  {errors.name && (
                    <Text color="#FC8181" fontSize="sm" mt={1}>
                      {errors.name.message as string}
                    </Text>
                  )}
                </FormControl>
                
                <FormControl isInvalid={!!errors.email}>
                  <FormLabel fontWeight="medium" color={colors.text.secondary}>
                    <Box display="flex" alignItems="center">
                      <Box as={FiMail} mr={2} color={colors.accent.primary} />
                      Email Address
                    </Box>
                  </FormLabel>
                  <Input
                    type="email"
                    bg={colors.background.input}
                    borderColor={colors.border.light}
                    color={colors.text.primary}
                    _hover={{ borderColor: colors.border.focus }}
                    _focus={{ 
                      borderColor: colors.accent.primary, 
                      boxShadow: `0 0 0 1px ${colors.accent.primary}`,
                      bg: 'rgba(15, 23, 42, 0.8)'
                    }}
                    placeholder="your.email@example.com"
                    fontSize="md"
                    py={6}
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                        message: 'Invalid email address',
                      },
                    })}
                  />
                  {errors.email && (
                    <Text color="#FC8181" fontSize="sm" mt={1}>
                      {errors.email.message as string}
                    </Text>
                  )}
                </FormControl>
                
                <FormControl isInvalid={!!errors.password}>
                  <FormLabel fontWeight="medium" color={colors.text.secondary}>
                    <Box display="flex" alignItems="center">
                      <Box as={FiLock} mr={2} color={colors.accent.primary} />
                      Password
                    </Box>
                  </FormLabel>
                  <Box position="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      bg={colors.background.input}
                      borderColor={colors.border.light}
                      color={colors.text.primary}
                      _hover={{ borderColor: colors.border.focus }}
                      _focus={{ 
                        borderColor: colors.accent.primary, 
                        boxShadow: `0 0 0 1px ${colors.accent.primary}`,
                        bg: 'rgba(15, 23, 42, 0.8)'
                      }}
                      placeholder="Enter a strong password"
                      fontSize="md"
                      py={6}
                      pr="2.5rem"
                      {...register('password', {
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters',
                        },
                      })}
                    />
                    <Box 
                      position="absolute" 
                      right="1rem" 
                      top="50%" 
                      transform="translateY(-50%)"
                      cursor="pointer"
                      onClick={togglePasswordVisibility}
                      color={colors.text.secondary}
                      _hover={{ color: colors.accent.primary }}
                      zIndex={2}
                    >
                      {showPassword ? (
                        <Box as={FiEyeOff} />
                      ) : (
                        <Box as={FiEye} />
                      )}
                    </Box>
                  </Box>
                  {errors.password && (
                    <Text color="#FC8181" fontSize="sm" mt={1}>
                      {errors.password.message as string}
                    </Text>
                  )}
                </FormControl>
                
                <FormControl isInvalid={!!errors.confirmPassword}>
                  <FormLabel fontWeight="medium" color={colors.text.secondary}>
                    <Box display="flex" alignItems="center">
                      <Box as={FiLock} mr={2} color={colors.accent.primary} />
                      Confirm Password
                    </Box>
                  </FormLabel>
                  <Box position="relative">
                    <Input
                      type={showConfirmPassword ? "text" : "password"}
                      bg={colors.background.input}
                      borderColor={colors.border.light}
                      color={colors.text.primary}
                      _hover={{ borderColor: colors.border.focus }}
                      _focus={{ 
                        borderColor: colors.accent.primary, 
                        boxShadow: `0 0 0 1px ${colors.accent.primary}`,
                        bg: 'rgba(15, 23, 42, 0.8)'
                      }}
                      placeholder="Confirm your password"
                      fontSize="md"
                      py={6}
                      pr="2.5rem"
                      {...register('confirmPassword', {
                        required: 'Please confirm your password',
                        validate: (value: string) =>
                          value === password || 'Passwords do not match',
                      })}
                    />
                    <Box 
                      position="absolute" 
                      right="1rem" 
                      top="50%" 
                      transform="translateY(-50%)"
                      cursor="pointer"
                      onClick={toggleConfirmPasswordVisibility}
                      color={colors.text.secondary}
                      _hover={{ color: colors.accent.primary }}
                      zIndex={2}
                    >
                      {showConfirmPassword ? (
                        <Box as={FiEyeOff} />
                      ) : (
                        <Box as={FiEye} />
                      )}
                    </Box>
                  </Box>
                  {errors.confirmPassword && (
                    <Text color="#FC8181" fontSize="sm" mt={1}>
                      {errors.confirmPassword.message as string}
                    </Text>
                  )}
                </FormControl>
                
                <FormControl isInvalid={!!errors.role}>
                  <FormLabel fontWeight="medium" color={colors.text.secondary}>
                    <Box display="flex" alignItems="center">
                      <Box as={FiBriefcase} mr={2} color={colors.accent.primary} />
                      Account Type
                    </Box>
                  </FormLabel>
                  <Box
                    position="relative"
                    width="100%"
                  >
                    <select
                      style={{
                        backgroundColor: colors.background.input,
                        borderColor: colors.border.light,
                        color: colors.text.primary,
                        padding: '1rem',
                        paddingRight: '2.5rem',
                        borderRadius: '0.5rem',
                        width: '100%',
                        appearance: 'none',
                        outline: 'none',
                        borderWidth: '1px',
                        borderStyle: 'solid',
                        fontSize: '1rem',
                        height: '3.5rem'
                      }}
                      {...register('role', {
                        required: 'Please select an account type',
                      })}
                    >
                      <option value="" style={{backgroundColor: colors.background.input}}>Select your role</option>
                      <option value="user" style={{backgroundColor: colors.background.input}}>Employee</option>
                      <option value="manager" style={{backgroundColor: colors.background.input}}>Manager</option>
                      <option value="admin" style={{backgroundColor: colors.background.input}}>Administrator</option>
                    </select>
                    <Box 
                      position="absolute" 
                      right="1rem" 
                      top="50%" 
                      transform="translateY(-50%)" 
                      pointerEvents="none"
                      color={colors.accent.primary}
                    >
                      <Box as={FiArrowRight} transform="rotate(90deg)" />
                    </Box>
                  </Box>
                  {errors.role && (
                    <Text color="#FC8181" fontSize="sm" mt={1}>
                      {errors.role.message as string}
                    </Text>
                  )}
                </FormControl>
                
                <Button
                  type="submit"
                  mt={4}
                  w="100%"
                  h="54px"
                  isLoading={isLoading}
                  bgGradient={colors.accent.gradient}
                  _hover={{ 
                    bgGradient: "linear(135deg, #2563EB, #7C3AED)",
                    transform: "translateY(-2px)",
                    boxShadow: "0 10px 25px -5px rgba(59, 130, 246, 0.5)"
                  }}
                  _active={{
                    transform: "translateY(0)",
                    boxShadow: "none"
                  }}
                  color="white"
                  fontSize="md"
                  fontWeight="bold"
                  borderRadius="lg"
                  transition="all 0.3s ease"
                  boxShadow="0 10px 15px -3px rgba(59, 130, 246, 0.3)"
                >
                  <Box display="flex" alignItems="center" justifyContent="center" width="100%">
                    Create Account
                    <Box as={FiArrowRight} ml={2} />
                  </Box>
                </Button>
              </VStack>
            </Box>
            
            <Box display="flex" justifyContent="center" mt={4} pt={4} borderTop="1px solid" borderColor="rgba(203, 213, 225, 0.1)">
              <Text color={colors.text.muted}>
                Already have an account?{' '}
                <Link 
                  color={colors.accent.secondary}
                  href="/auth/login"
                  fontWeight="medium"
                  _hover={{ 
                    textDecoration: "none", 
                    color: colors.accent.primary
                  }}
                >
                  Sign in
                </Link>
              </Text>
            </Box>
          </VStack>
        </Box>
      </Container>
    </Box>
  );
} 