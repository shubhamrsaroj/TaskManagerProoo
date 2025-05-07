'use client';

import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Container, 
  Heading, 
  Text, 
  VStack
} from '@chakra-ui/react';
import { FiAward, FiStar, FiTarget } from 'react-icons/fi';
import { getUser } from '@/lib/auth';
import api from '@/lib/api';

// Custom component implementations to replace unavailable Chakra components
const Spinner = ({ size, color, ...props }: { size?: string, color?: string, [key: string]: any }) => (
  <Box 
    as="div" 
    display="inline-block"
    border="4px solid rgba(0, 0, 0, 0.1)"
    borderLeftColor={color || "#3182CE"}
    borderRadius="50%"
    width={size === "xl" ? "40px" : "20px"}
    height={size === "xl" ? "40px" : "20px"}
    animation="spin 1s linear infinite"
    {...props}
    sx={{
      "@keyframes spin": {
        "0%": { transform: "rotate(0deg)" },
        "100%": { transform: "rotate(360deg)" }
      }
    }}
  />
);

const Flex = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Box display="flex" {...props}>{children}</Box>
);

const Badge = ({ colorScheme, children, ...props }: { colorScheme: string, children: React.ReactNode, [key: string]: any }) => (
  <Box 
    display="inline-block" 
    bg={`${colorScheme}.500`} 
    color="white" 
    px={2} 
    py={1} 
    borderRadius="md" 
    fontSize="xs" 
    fontWeight="bold"
    {...props}
  >
    {children}
  </Box>
);

const Icon = ({ as, ...props }: { as: any, [key: string]: any }) => {
  const IconComponent = as;
  return <IconComponent {...props} />;
};

const Divider = () => <Box height="1px" bg="gray.600" my={4} />;

const Table = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Box as="table" width="100%" {...props}>{children}</Box>
);

const Tbody = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Box as="tbody" {...props}>{children}</Box>
);

const Tr = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Box as="tr" display="table-row" {...props}>{children}</Box>
);

const Td = ({ children, isNumeric, ...props }: { children: React.ReactNode, isNumeric?: boolean, [key: string]: any }) => (
  <Box 
    as="td" 
    display="table-cell" 
    p={3} 
    borderBottomWidth="1px" 
    borderColor="gray.700"
    textAlign={isNumeric ? "right" : "left"}
    {...props}
  >
    {children}
  </Box>
);

// Use a simple trophy icon
const FiTrophy = ({ ...props }) => <FiAward {...props} />;

interface LeaderboardUser {
  _id: string;
  name: string;
  points: number;
  achievements: string[];
}

interface LeaderboardData {
  topUsers: LeaderboardUser[];
  currentUserRank: number;
  currentUserPoints: number;
}

// Achievement badges with descriptions
const achievementInfo: Record<string, { icon: React.ReactElement, label: string, description: string }> = {
  'first_task': { 
    icon: <Icon as={FiStar} />, 
    label: 'First Steps', 
    description: 'Completed your first task' 
  },
  'five_tasks': { 
    icon: <Icon as={FiTarget} />, 
    label: 'Go-Getter', 
    description: 'Completed 5 tasks' 
  },
  // You can add more achievements here
};

export default function LeaderboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const user = getUser();
    if (user) {
      setUserData(user);
      fetchLeaderboardData();
    }
  }, []);

  const fetchLeaderboardData = async () => {
    try {
      setLoading(true);
      const response = await api.get('/tasks/leaderboard/rankings');
      setLeaderboardData(response.data);
      setError(null);
    } catch (error: any) {
      console.error('Error fetching leaderboard data:', error);
      setError(error.response?.data?.message || 'Failed to fetch leaderboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6}>Productivity Leaderboard</Heading>
        <Box textAlign="center" py={10}>
          <Spinner size="xl" color="blue.500" />
          <Text mt={4}>Loading leaderboard data...</Text>
        </Box>
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6}>Productivity Leaderboard</Heading>
        <Box p={5} borderRadius="md" borderWidth="1px" bg="red.50">
          <Heading size="md" color="red.500" mb={2}>Error</Heading>
          <Text>{error}</Text>
        </Box>
      </Container>
    );
  }

  if (!leaderboardData) {
    return (
      <Container maxW="container.xl" py={8}>
        <Heading size="lg" mb={6}>Productivity Leaderboard</Heading>
        <Box p={5} borderRadius="md" borderWidth="1px" bg="gray.50">
          <Text>No leaderboard data available yet.</Text>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8}>
      <Heading size="lg" mb={6} display="flex" alignItems="center">
        <Icon as={FiTrophy} mr={2} color="yellow.400" />
        Productivity Leaderboard
      </Heading>

      {/* User's stats */}
      <Box 
        p={5} 
        mb={6} 
        borderRadius="lg" 
        borderWidth="1px" 
        bg="gray.800" 
        color="white"
        borderLeft="4px solid"
        borderLeftColor="yellow.400"
      >
        <Heading size="md" mb={4}>Your Performance</Heading>
        
        <Flex justifyContent="space-between" alignItems="center">
          <Box>
            <Text fontSize="sm" color="gray.400">YOUR RANK</Text>
            <Flex alignItems="center">
              <Text fontSize="3xl" fontWeight="bold" mr={2}>
                #{leaderboardData.currentUserRank}
              </Text>
              {leaderboardData.currentUserRank <= 3 && (
                <Badge colorScheme="yellow" fontSize="xs" p={1}>
                  TOP PERFORMER
                </Badge>
              )}
            </Flex>
          </Box>
          
          <Box textAlign="right">
            <Text fontSize="sm" color="gray.400">YOUR POINTS</Text>
            <Text fontSize="3xl" fontWeight="bold">
              {leaderboardData.currentUserPoints}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Top performers */}
      <Box p={5} borderRadius="lg" borderWidth="1px" bg="gray.800" color="white">
        <Heading size="md" mb={4}>Top Performers</Heading>
        
        <Table variant="simple">
          <Tbody>
            {leaderboardData.topUsers.map((user, index) => {
              const isCurrentUser = userData && userData._id === user._id;
              const rankBadges = {
                0: { icon: FiTrophy, color: 'yellow.400', label: '1st Place' },
                1: { icon: FiTrophy, color: 'gray.400', label: '2nd Place' },
                2: { icon: FiTrophy, color: 'orange.400', label: '3rd Place' }
              };
              
              return (
                <Tr 
                  key={user._id} 
                  bg={isCurrentUser ? 'blue.900' : undefined}
                  borderRadius={isCurrentUser ? 'md' : undefined}
                >
                  <Td width="50px" pl={2}>
                    {index < 3 ? (
                      <Icon 
                        as={rankBadges[index as keyof typeof rankBadges].icon} 
                        color={rankBadges[index as keyof typeof rankBadges].color} 
                        boxSize={5} 
                      />
                    ) : (
                      <Text fontWeight="bold" pl={2}>#{index + 1}</Text>
                    )}
                  </Td>
                  <Td fontWeight={isCurrentUser ? 'bold' : 'normal'}>
                    {user.name}
                    {isCurrentUser && (
                      <Badge ml={2} colorScheme="blue">YOU</Badge>
                    )}
                  </Td>
                  <Td>
                    {user.achievements.length > 0 && (
                      <Flex gap={1}>
                        {user.achievements.map((achievement, i) => (
                          achievementInfo[achievement] ? (
                            <Badge 
                              key={i} 
                              colorScheme="purple" 
                              display="flex" 
                              alignItems="center" 
                              gap={1}
                              title={achievementInfo[achievement].description}
                            >
                              {achievementInfo[achievement].icon}
                              {achievementInfo[achievement].label}
                            </Badge>
                          ) : null
                        ))}
                      </Flex>
                    )}
                  </Td>
                  <Td isNumeric fontWeight="bold" fontSize="lg">
                    {user.points} <Text as="span" fontSize="xs" color="gray.400">pts</Text>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
        
        <Divider />
        
        <Box p={3} bg="gray.700" borderRadius="md">
          <Heading size="xs" mb={2} color="gray.300">How to Earn Points</Heading>
          <VStack spacing={2} align="stretch">
            <Text fontSize="xs">• Complete low priority tasks: <strong>5 points</strong></Text>
            <Text fontSize="xs">• Complete medium priority tasks: <strong>10 points</strong></Text>
            <Text fontSize="xs">• Complete high priority tasks: <strong>15 points</strong></Text>
            <Text fontSize="xs">• Complete tasks before deadline: <strong>+5 bonus points</strong></Text>
          </VStack>
        </Box>
      </Box>
    </Container>
  );
} 