'use client';

import React, { useState, useEffect } from 'react';
import {
  Box,
  Heading,
  Text,
  VStack,
  Button,
  useToast,
  Container,
} from '@chakra-ui/react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { FiEdit2, FiTrash2, FiCheck, FiClock, FiCalendar, FiUser, FiRepeat, FiAward, FiTrendingUp } from 'react-icons/fi';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

// Use a minimal implementation focused on fixing all errors

// Utility components
const Flex = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Box display="flex" {...props}>{children}</Box>
);

const HStack = ({ children, spacing = 2, ...props }: { children: React.ReactNode, spacing?: number, [key: string]: any }) => (
  <Flex {...props}>
    {React.Children.map(children, (child, i) => (
      <Box key={i} mr={i < React.Children.count(children) - 1 ? spacing : 0}>
        {child}
      </Box>
    ))}
  </Flex>
);

const SimpleGrid = (props: any) => {
  const { children, templateColumns, gap, ...rest } = props;
  return (
    <Box 
      display="grid" 
      gridTemplateColumns={templateColumns || "repeat(1, 1fr)"} 
      gap={gap || 4} 
      {...rest}
    >
      {children}
    </Box>
  );
};

const Center = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => (
  <Box display="flex" alignItems="center" justifyContent="center" {...props}>
    {children}
  </Box>
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

const Spinner = ({ size, ...props }: { size?: string, [key: string]: any }) => (
  <Center {...props}>
    <Box 
      animation="spin 1s linear infinite" 
      width={size === "xl" ? "40px" : "20px"} 
      height={size === "xl" ? "40px" : "20px"} 
      borderRadius="50%" 
      borderWidth="3px" 
      borderColor="blue.500" 
      borderTopColor="transparent"
      sx={{
        "@keyframes spin": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" }
        }
      }}
    />
  </Center>
);

// Aliases
const Grid = SimpleGrid;
const GridItem = Box;
const Stack = HStack;
const Divider = () => <Box my={4} height="1px" bg="gray.600" />;

// Simple hook implementations
const useDisclosure = () => {
  const [isOpen, setIsOpen] = useState(false);
  const onOpen = () => setIsOpen(true);
  const onClose = () => setIsOpen(false);
  return { isOpen, onOpen, onClose };
};

// Modal system
const Modal = (props: any) => {
  const { isOpen, onClose, children, size, ...rest } = props;
  
  // Size mapping
  const sizeMap: Record<string, string> = {
    sm: '300px',
    md: '500px',
    lg: '800px',
    xl: '1000px'
  };
  
  // Default to md if size is not provided
  const maxWidth = size ? sizeMap[size] || sizeMap.md : sizeMap.md;
  
  if (!isOpen) return null;
  
  return (
    <Box position="fixed" top={0} left={0} width="100%" height="100%" bg="rgba(0,0,0,0.7)" zIndex={1000} {...rest}>
      <Flex justifyContent="center" alignItems="center" height="100%">
        <Box 
          bg="gray.800" 
          p={4} 
          borderRadius="md" 
          maxWidth={maxWidth}
          width="100%" 
          maxHeight="90vh" 
          overflow="auto"
        >
          {children}
        </Box>
      </Flex>
    </Box>
  );
};

const ModalOverlay = () => null;
const ModalContent = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <Box {...props}>{children}</Box>;
const ModalHeader = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <Heading size="md" mb={4} {...props}>{children}</Heading>;
const ModalFooter = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <Flex justifyContent="flex-end" mt={4} {...props}>{children}</Flex>;
const ModalBody = ({ children, ...props }: { children: React.ReactNode, [key: string]: any }) => <Box {...props}>{children}</Box>;
const ModalCloseButton = () => (
  <Button 
    position="absolute" 
    top="8px" 
    right="12px" 
    size="sm" 
    variant="ghost"
  >
    ✕
  </Button>
);

// Simple date utility
const formatRelativeTime = (date: Date) => {
  const now = new Date();
  const diffInDays = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  if (diffInDays < 0) {
    return `${Math.abs(diffInDays)} days overdue`;
  } else if (diffInDays === 0) {
    return 'due today';
  } else if (diffInDays === 1) {
    return 'due tomorrow';
  } else {
    return `due in ${diffInDays} days`;
  }
};

// Simplified components
const TaskForm = ({ initialData, onSuccess, isEditMode }: { 
  initialData?: any, 
  onSuccess: () => void, 
  isEditMode?: boolean 
}) => {
  return (
    <Box>
      <Text>Task form placeholder</Text>
      <Button onClick={onSuccess} colorScheme="blue" mt={4}>
        {isEditMode ? 'Update Task' : 'Create Task'}
      </Button>
    </Box>
  );
};

const ConfirmDialog = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  onConfirm: () => void, 
  title: string, 
  message: string 
}) => isOpen ? (
  <Modal isOpen={isOpen} onClose={onClose}>
    <ModalContent p={5}>
      <ModalHeader>{title}</ModalHeader>
      <ModalBody>
        <Text>{message}</Text>
      </ModalBody>
      <ModalFooter>
        <Button colorScheme="gray" mr={3} onClick={onClose}>
          Cancel
        </Button>
        <Button colorScheme="red" onClick={onConfirm}>
          Delete
        </Button>
      </ModalFooter>
    </ModalContent>
  </Modal>
) : null;

// Data interfaces
interface TaskData {
  _id: string;
  title: string;
  description: string;
  status: 'todo' | 'in-progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate: string;
  createdAt: string;
  updatedAt: string;
  assignedTo: {
    _id: string;
    name: string;
    email: string;
  };
  createdBy: {
    _id: string;
    name: string;
    email: string;
  };
  isRecurring: boolean;
  recurringType?: string;
  recurringInterval?: number;
}

interface MotivationData {
  messages: {
    general: string;
    priority: string;
    time: string;
    points: string;
  };
  stats: {
    totalAssigned: number;
    completedTasks: number;
    completionRate: number;
    userRank: number | null;
    userPoints: number;
  };
  task: {
    title: string;
    priority: string;
    dueDate: string;
    daysUntilDue: number;
  };
}

// Motivational Content Component
function MotivationalContent({ motivation, router }: { motivation: MotivationData, router: any }) {
  // Get a random color for the motivation box
  const colors = ["blue.600", "purple.600", "teal.600", "cyan.700"];
  const randomColor = colors[Math.floor(Math.random() * colors.length)];
  
  return (
    <Box borderRadius="md" bg={randomColor} p={4} mb={4}>
      <Text fontWeight="bold" fontSize="md" mb={2}>
        {motivation.messages.general}
      </Text>
      <Text fontSize="sm" mb={3}>
        {motivation.messages.priority}
      </Text>
      <Text fontSize="sm" mb={3}>
        {motivation.messages.time}
      </Text>
      
      <Divider />
      
      <Box display="flex" alignItems="center" mb={2}>
        <Box as={FiAward} mr={2} />
        <Text fontSize="sm" fontWeight="bold">
          {motivation.messages.points}
        </Text>
      </Box>
      
      <SimpleGrid templateColumns="repeat(2, 1fr)" gap={3} mt={4}>
        <GridItem>
          <Box bg="rgba(0,0,0,0.2)" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="xs" opacity={0.8}>YOUR POINTS</Text>
            <Text fontSize="xl" fontWeight="bold">{motivation.stats.userPoints}</Text>
          </Box>
        </GridItem>
        
        <GridItem>
          <Box bg="rgba(0,0,0,0.2)" p={2} borderRadius="md" textAlign="center">
            <Text fontSize="xs" opacity={0.8}>COMPLETION RATE</Text>
            <Text fontSize="xl" fontWeight="bold">{motivation.stats.completionRate}%</Text>
          </Box>
        </GridItem>
      </SimpleGrid>
      
      {motivation.stats.userRank && (
        <Box display="flex" alignItems="center" mt={3} justifyContent="center">
          <Box as={FiTrendingUp} mr={2} />
          <Text fontSize="sm">
            Your current rank: <strong>#{motivation.stats.userRank}</strong>
          </Text>
        </Box>
      )}
      
      <Button 
        size="sm" 
        colorScheme="whiteAlpha" 
        width="full" 
        mt={4}
        onClick={() => router.push('/dashboard/leaderboard')}
      >
        View Leaderboard
      </Button>
    </Box>
  );
}

// Main component
export default function TaskDetailsPage() {
  const router = useRouter();
  const toast = useToast();
  const [task, setTask] = useState<TaskData | null>(null);
  const [motivation, setMotivation] = useState<MotivationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isCurrentUserAssigned, setIsCurrentUserAssigned] = useState(false);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const [shouldRefresh, setShouldRefresh] = useState(false);
  const [motivationLoading, setMotivationLoading] = useState(false);
  const [id, setId] = useState<string>('');

  useEffect(() => {
    // Extract ID from URL in client component
    if (typeof window !== 'undefined') {
      const pathParts = window.location.pathname.split('/');
      const taskId = pathParts[pathParts.length - 1];
      setId(taskId);
      if (taskId) {
        fetchTaskData(taskId);
      }
    }
  }, []);

  useEffect(() => {
    // Check if current user is assigned to the task
    if (task) {
      const user = getUser();
      if (user && task.assignedTo && user._id === task.assignedTo._id) {
        setIsCurrentUserAssigned(true);
        fetchMotivationData();
      }
    }
  }, [task]);

  const fetchTaskData = async (taskId: string) => {
    try {
      setLoading(true);
      const response = await api.get(`/tasks/${taskId}`);
      setTask(response.data);
      setError(null);
    } catch (error: any) {
      setError(error?.response?.data?.message || 'Error fetching task');
    } finally {
      setLoading(false);
    }
  };

  const fetchMotivationData = async () => {
    try {
      setMotivationLoading(true);
      const response = await api.get(`/tasks/${id}/motivation`);
      setMotivation(response.data);
    } catch (error) {
      console.error('Error fetching motivation data:', error);
      // Don't set an error state here, as this is an enhancement
    } finally {
      setMotivationLoading(false);
    }
  };

  const handleDeleteClick = () => {
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    try {
      await api.delete(`/tasks/${id}`);
      toast({
        title: 'Task deleted',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      router.push('/dashboard/tasks');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Could not delete task',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDeleteDialogOpen(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      await api.put(`/tasks/${id}`, { status: newStatus });
      toast({
        title: 'Status updated',
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
      fetchTaskData(id);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'Could not update status',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const handleTaskUpdate = () => {
    fetchTaskData(id);
    onClose();
  };

  if (loading) {
    return (
      <Box textAlign="center" py={10}>
        <Spinner size="xl" />
        <Text mt={4}>Loading task details...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={5} borderWidth="1px" borderRadius="lg" bg="red.50">
        <Heading size="md" color="red.500" mb={2}>
          Error
        </Heading>
        <Text>{error}</Text>
        <Button mt={3} onClick={() => router.push('/dashboard/tasks')}>
          Back to Tasks
        </Button>
      </Box>
    );
  }

  if (!task) {
    return <Box>Task not found</Box>;
  }

  // Simplify to a basic view for now
  return (
    <Box p={5}>
      <Heading size="lg" mb={4}>{task.title}</Heading>
      <Text mb={4}>{task.description}</Text>
      
      <Flex justifyContent="space-between" mb={4}>
        <Badge colorScheme={task.status === 'completed' ? 'green' : task.status === 'in-progress' ? 'blue' : 'red'}>
          {task.status.toUpperCase()}
        </Badge>
        <Badge colorScheme={task.priority === 'high' ? 'red' : task.priority === 'medium' ? 'orange' : 'green'}>
          {task.priority.toUpperCase()}
        </Badge>
      </Flex>
      
      <Divider />
      
      <Box mt={4}>
        <Heading size="md" mb={3}>Task Details</Heading>
        <SimpleGrid templateColumns="repeat(2, 1fr)" gap={4}>
          <Box>
            <Text fontWeight="bold">Due Date</Text>
            <Text>{new Date(task.dueDate).toLocaleDateString()}</Text>
          </Box>
          <Box>
            <Text fontWeight="bold">Assigned To</Text>
            <Text>{task.assignedTo?.name}</Text>
          </Box>
        </SimpleGrid>
      </Box>
      
      {task.status !== 'completed' && (
        <Box mt={6}>
          <Heading size="sm" mb={3}>Task Actions</Heading>
          <HStack spacing={3}>
            {task.status === 'todo' && (
              <Button
                leftIcon={<Box as={FiCheck} />}
                colorScheme="blue"
                size="sm"
                onClick={() => handleStatusChange('in-progress')}
              >
                Start Task
              </Button>
            )}
            <Button
              leftIcon={<Box as={FiCheck} />}
              colorScheme="green"
              size="sm"
              onClick={() => handleStatusChange('completed')}
            >
              Mark Completed
            </Button>
            <Button
              leftIcon={<Box as={FiEdit2} />}
              colorScheme="gray"
              size="sm"
              onClick={onOpen}
            >
              Edit
            </Button>
            <Button
              leftIcon={<Box as={FiTrash2} />}
              colorScheme="red"
              size="sm"
              onClick={handleDeleteClick}
            >
              Delete
            </Button>
          </HStack>
        </Box>
      )}
      
      {/* Motivation Section - Show only for the assigned user */}
      {isCurrentUserAssigned && task.status !== 'completed' && (
        <Box mt={6}>
          <Divider />
          <Heading size="sm" mb={3} display="flex" alignItems="center">
            <Box as={FiAward} mr={2} />
            Your Motivation Center
          </Heading>
          
          {motivationLoading ? (
            <Box textAlign="center" py={3}>
              <Spinner size="sm" />
              <Text mt={2} fontSize="sm">Loading motivation...</Text>
            </Box>
          ) : motivation ? (
            <MotivationalContent motivation={motivation} router={router} />
          ) : (
            <Text fontSize="sm" color="gray.400">
              Complete tasks to earn points and unlock achievements!
            </Text>
          )}
        </Box>
      )}
      
      {/* Edit Task Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent bg="gray.800" color="white" p={4}>
          <ModalHeader>Edit Task</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <TaskForm
              initialData={task}
              onSuccess={handleTaskUpdate}
              isEditMode={true}
            />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="blue" mr={3} onClick={onClose}>
              Cancel
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Task"
        message="Are you sure you want to delete this task? This action cannot be undone."
      />
    </Box>
  );
} 