'use client';

import { useEffect } from 'react';
import { 
  Box, 
  Button, 
  Container, 
  Heading, 
  Text, 
  VStack
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { FiCalendar, FiUsers, FiRepeat, FiShield, FiBell, FiPieChart, FiArrowRight, FiCheck } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { appColors } from '@/lib/theme';

// Create motion components
const MotionBox = motion(Box);
const MotionHeading = motion(Heading);
const MotionText = motion(Text);

// Custom Image component since Chakra's isn't imported
const Image = ({ src, alt, ...props }: { src: string, alt: string, [key: string]: any }) => (
  <Box as="img" src={src} alt={alt} {...props} />
);

export default function HomePage() {
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      try {
        const { state } = JSON.parse(authData);
        if (state?.isAuthenticated) {
          router.push('/dashboard');
        }
      } catch (err) {
        console.error('Error parsing auth data:', err);
      }
    }
  }, [router]);

  const features = [
    {
      title: 'Enterprise-Grade Security',
      description: 'Role-based access control with fine-grained permissions for Administrators, Managers, and Employees.',
      icon: FiShield,
      delay: 0.1,
    },
    {
      title: 'Smart Recurring Tasks',
      description: 'Automate routine work with customizable recurring tasks — daily, weekly, monthly, or custom patterns.',
      icon: FiRepeat,
      delay: 0.2,
    },
    {
      title: 'Team Collaboration',
      description: 'Seamlessly assign tasks, share progress updates, and collaborate across departments.',
      icon: FiUsers,
      delay: 0.3,
    },
    {
      title: 'Real-time Notifications',
      description: 'Stay informed with instant notifications for task assignments, updates, and approaching deadlines.',
      icon: FiBell,
      delay: 0.4,
    },
    {
      title: 'Advanced Task Management',
      description: 'Prioritize, categorize, and track tasks with customizable statuses and due dates.',
      icon: FiCalendar,
      delay: 0.5,
    },
    {
      title: 'Visual Analytics Dashboard',
      description: 'Make data-driven decisions with comprehensive productivity metrics and visualizations.',
      icon: FiPieChart,
      delay: 0.6,
    },
  ];

  const testimonials = [
    {
      name: 'Sarah Johnson',
      role: 'Project Manager',
      company: 'InnovateX Solutions',
      image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330',
      quote: 'TaskManager PRO has transformed how our team collaborates. Weve reduced project delivery times by 35% and drastically improved accountability',
    },
    {
      name: 'Michael Chen',
      role: 'CTO',
      company: 'TechForward Inc.',
      image: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d',
      quote: 'The role-based access control and enterprise security features give us confidence while managing sensitive projects across departments.',
    },
    {
      name: 'Emily Rodriguez',
      role: 'Operations Director',
      company: 'Global Industries',
      image: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2',
      quote: 'The recurring task feature alone has saved our team countless hours. No more manual task creation for routine work.',
    },
  ];

  return (
    <Box minH="100vh" bg={`linear-gradient(to bottom right, ${appColors.background.primary}, #171923, #0D1117)`} color={appColors.text.primary}>
      {/* Hero Section */}
      <Box 
        as="nav" 
        position="fixed" 
        width="100%" 
        zIndex="999"
        backdropFilter="blur(10px)"
        bgGradient={`linear(to-r, ${appColors.background.primary}CC, ${appColors.background.card}CC)`}
        borderBottom={`1px solid ${appColors.border.light}33`}
      >
        <Container maxW="container.xl" py={4}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Box display="flex" alignItems="center">
              <Image 
                src="/logo.svg"
                alt="TaskManager PRO Logo"
                height="40px"
                mr={3}
              />
              <Heading 
                size="md" 
                color="#FF5A5A"
              >
                TaskManager PRO
              </Heading>
            </Box>
            <Box display="flex">
              <Button 
                variant="ghost" 
                mr={3}
                color="#FF7A5A"
                _hover={{ bg: `#FF7A5A1A` }}
                onClick={() => router.push('/auth/login')}
              >
                Sign In
              </Button>
              <Button 
                colorScheme="red" 
                bg="#FF5A5A"
                _hover={{ bg: "#FF7A5A" }}
                onClick={() => router.push('/auth/register')}
              >
                Register
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxW="container.xl" pt={32} pb={20}>
        <Box 
          display="flex" 
          flexDirection={{ base: "column", lg: "row" }} 
          alignItems="center" 
          justifyContent="space-between"
          gap={10}
        >
          <Box as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            flex="1"
          >
            <Box 
              as="span"
              display="inline-block"
              bgColor={appColors.accent.primary}
              color="white"
              px={3} 
              py={1} 
              mb={4}
              borderRadius="full"
              fontWeight="medium"
              fontSize="xs"
              textTransform="uppercase"
            >
              #1 Task Management Solution
            </Box>
            <Heading 
              as={motion.h1}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              fontSize={{ base: '4xl', md: '5xl', lg: '6xl' }} 
              fontWeight="bold" 
              lineHeight="1.2"
              mb={4}
            >
              Power Up Your{' '}
              <Text 
                as="span" 
                bgGradient={appColors.accent.gradient}
                bgClip="text"
              >
                Team Productivity
              </Text>
            </Heading>
            <Text
              as={motion.p}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              fontSize={{ base: 'lg', md: 'xl' }} 
              mb={8}
              color={appColors.text.secondary}
            >
              TaskManager PRO helps high-performance teams organize, track, and manage their work in one place. 
              Streamline your workflow, enhance collaboration, and deliver projects on time, every time.
            </Text>
            <Box
              as={motion.div}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              display="flex"
              flexDirection={{ base: 'column', sm: 'row' }}
              gap={4}
            >
              <Button 
                size="lg" 
                colorScheme="blue" 
                onClick={() => router.push('/auth/register')}
                bgGradient={appColors.accent.gradient}
                _hover={{ bgGradient: "linear(135deg, #2563EB, #7C3AED)", transform: "translateY(-2px)" }}
                _active={{ transform: "translateY(0)" }}
                rightIcon={<FiArrowRight />}
                px={8}
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                borderColor={appColors.accent.secondary}
                color={appColors.accent.secondary}
                onClick={() => router.push('/auth/login')}
                _hover={{ bg: `${appColors.accent.secondary}1A` }}
              >
                Sign In
              </Button>
            </Box>
          </Box>
          <Box
            as={motion.div}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            display={{ base: 'none', lg: 'block' }}
            flex="1"
          >
            <Box 
              overflow="hidden" 
              borderRadius="xl" 
              boxShadow="2xl"
              border="1px solid"
              borderColor="blue.800"
              position="relative"
              height="400px"
              width="100%"
              backgroundImage="url('/dashboard-preview.png')"
              backgroundSize="cover"
              backgroundPosition="center"
            >
              {/* Using background image instead of components that might not be available */}
            </Box>
          </Box>
        </Box>
      </Container>

      {/* Features Section */}
      <Box bg="rgba(26, 32, 44, 0.8)" py={20}>
        <Container maxW="container.xl">
          <Heading
            as={motion.h2}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            textAlign="center" 
            size="xl" 
            mb={16}
            bgGradient="linear(to-r, #90CDF4, #63B3ED)" 
            bgClip="text"
          >
            Elevate Your Task Management
          </Heading>
          <Box 
            display="flex"
            flexWrap="wrap" 
            justifyContent="center"
            gap={8}
          >
            {features.map((feature, index) => (
              <Box
                key={index}
                as={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: feature.delay }}
                p={6}
                borderRadius="lg"
                bg="#2D3748"
                boxShadow="lg"
                _hover={{ 
                  transform: 'translateY(-5px)', 
                  boxShadow: 'xl',
                  borderColor: 'blue.400',
                }}
                borderLeft="4px solid"
                borderColor="#3182CE"
                sx={{ transition: "all 0.3s ease" }}
                width={{ base: "100%", md: "calc(50% - 1rem)", lg: "calc(33.333% - 1.5rem)" }}
              >
                <Box 
                  color="#90CDF4" 
                  fontSize="3xl" 
                  mb={4}
                >
                  <feature.icon />
                </Box>
                <Heading size="md" mb={3} color="white">
                  {feature.title}
                </Heading>
                <Text color="gray.300">
                  {feature.description}
                </Text>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* Testimonials Section */}
      <Box py={20}>
        <Container maxW="container.xl">
          <Heading
            as={motion.h2}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            textAlign="center" 
            size="xl" 
            mb={3}
            bgGradient="linear(to-r, #90CDF4, #63B3ED)" 
            bgClip="text"
          >
            Trusted by Teams Worldwide
          </Heading>
          <Text
            as={motion.p}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            textAlign="center" 
            color="gray.400" 
            mb={12}
            maxW="700px"
            mx="auto"
          >
            See how TaskManager PRO is helping companies increase productivity and streamline workflows.
          </Text>
          <Box 
            display="flex"
            flexWrap="wrap" 
            justifyContent="center"
            gap={8}
          >
            {testimonials.map((testimonial, index) => (
              <Box
                key={index}
                as={motion.div}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                p={6}
                borderRadius="lg"
                bg="#2D3748"
                boxShadow="lg"
                position="relative"
                width={{ base: "100%", md: "calc(33.333% - 1.5rem)" }}
              >
                <Text fontSize="xl" fontStyle="italic" mb={6} color="gray.300">
                  "{testimonial.quote}"
                </Text>
                <Box display="flex" alignItems="center">
                  <Box 
                    width="50px"
                    height="50px"
                    borderRadius="full" 
                    overflow="hidden" 
                    mr={4}
                    boxShadow="md"
                    backgroundImage={`url(${testimonial.image})`}
                    backgroundSize="cover"
                    backgroundPosition="center"
                  />
                  <Box>
                    <Text fontWeight="bold" color="white">{testimonial.name}</Text>
                    <Text fontSize="sm" color="gray.400">
                      {testimonial.role}, {testimonial.company}
                    </Text>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* CTA Section */}
      <Box py={20} bg="blue.900" bgGradient="linear(to-r, #1A365D, #2A4365)">
        <Container maxW="container.lg" textAlign="center">
          <Heading
            as={motion.h2}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            size="xl" 
            mb={4}
            color="white"
          >
            Ready to transform your team's productivity?
          </Heading>
          <Text
            as={motion.p}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            fontSize="xl" 
            mb={8}
            color="gray.300"
            maxW="700px"
            mx="auto"
          >
            Join thousands of teams using TaskManager PRO to deliver projects on time and exceed expectations.
          </Text>
          <Box
            as={motion.div}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Button 
              size="lg" 
              colorScheme="blue" 
              onClick={() => router.push('/auth/register')}
              bgGradient="linear(to-r, #3182CE, #2B6CB0)"
              _hover={{ bgGradient: "linear(to-r, #2B6CB0, #1A365D)" }}
              rightIcon={<FiArrowRight />}
              px={8}
              mx={2}
              mb={{ base: 4, sm: 0 }}
            >
              Start Free Trial
            </Button>
            <Button 
              size="lg" 
              variant="outline" 
              borderColor="white"
              color="white"
              onClick={() => router.push('/auth/login')}
              _hover={{ bg: 'rgba(255, 255, 255, 0.1)' }}
              mx={2}
            >
              Learn More
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Footer */}
      <Box py={8} bg="#111827" borderTop="1px solid" borderColor="gray.800">
        <Container maxW="container.xl">
          <Box 
            display="flex"
            flexDirection={{ base: "column", md: "row" }} 
            justifyContent="space-between" 
            alignItems={{ base: "center", md: "flex-start" }}
          >
            <Box mb={{ base: 8, md: 0 }}>
              <Heading 
                size="md" 
                mb={2}
                bgGradient="linear(to-r, #3182CE, #63B3ED)" 
                bgClip="text"
              >
                TaskManager PRO
              </Heading>
              <Text color="gray.500" fontSize="sm">
                © {new Date().getFullYear()} TaskManager PRO. All rights reserved.
              </Text>
            </Box>
            <Box display="flex" gap={8} flexDirection={{ base: "column", sm: "row" }} alignItems={{ base: "center", sm: "flex-start" }}>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="bold" color="gray.300">Product</Text>
                <Text color="gray.500" fontSize="sm">Features</Text>
                <Text color="gray.500" fontSize="sm">Pricing</Text>
                <Text color="gray.500" fontSize="sm">Integrations</Text>
              </VStack>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="bold" color="gray.300">Company</Text>
                <Text color="gray.500" fontSize="sm">About Us</Text>
                <Text color="gray.500" fontSize="sm">Careers</Text>
                <Text color="gray.500" fontSize="sm">Contact</Text>
              </VStack>
              <VStack align="flex-start" spacing={2}>
                <Text fontWeight="bold" color="gray.300">Resources</Text>
                <Text color="gray.500" fontSize="sm">Blog</Text>
                <Text color="gray.500" fontSize="sm">Documentation</Text>
                <Text color="gray.500" fontSize="sm">Support</Text>
              </VStack>
            </Box>
          </Box>
        </Container>
      </Box>
      
      <style jsx global>{`
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(49, 130, 206, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(49, 130, 206, 0); }
          100% { box-shadow: 0 0 0 0 rgba(49, 130, 206, 0); }
        }
      `}</style>
    </Box>
  );
} 