'use client';

import React, { useState, useEffect } from 'react';
import { Box, Container, Heading, Button, VStack, Text } from '@chakra-ui/react';
import { FiEdit, FiTrash2, FiPlus, FiFilter, FiSearch, FiChevronDown } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from 'react-query';
import api from '@/lib/api';
import { useAuthStore } from '@/store/auth';
import { toast, Toaster } from 'react-hot-toast';
import { getUser } from '@/lib/auth';

// Task interface
interface Task {
  _id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'completed';
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
  recurringType: string;
  recurringDays: number[];
  recurringDate: number;
  recurringInterval: number;
  recurringEndDate: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
}

// Store user interface
interface StoreUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

export default function TasksPage() {
  // Create a client
  const queryClientInstance = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClientInstance}>
      <TasksPageContent />
    </QueryClientProvider>
  );
}

function TasksPageContent() {
  // Store local state
  const [userData, setUserData] = useState<StoreUser | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const queryClient = useQueryClient();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  
  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [priorityFilter, setPriorityFilter] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('dueDate');
  const [sortOrder, setSortOrder] = useState<string>('asc');
  
  // Highlight animation state
  const [highlightAssignee, setHighlightAssignee] = useState(false);
  
  // Focus and highlight the dropdown when modal opens
  useEffect(() => {
    if (isOpen) {
      // Trigger highlight animation
      setHighlightAssignee(true);
      
      // Remove highlight after a few seconds
      const highlightTimer = setTimeout(() => {
        setHighlightAssignee(false);
      }, 2000);
      
      // Use a small delay to ensure the modal is fully rendered
      setTimeout(() => {
        const assigneeSelect = document.querySelector('select[name="assignedTo"]');
        if (assigneeSelect) {
          console.log('Auto focusing assignee select');
          (assigneeSelect as HTMLSelectElement).focus();
          // Don't force click - just focus and let browser handle native behaviors
        }
      }, 500);
      
      // Clean up timers
      return () => {
        clearTimeout(highlightTimer);
      };
    }
  }, [isOpen]);
  
  // Safely access the store
  useEffect(() => {
    // Get user from localStorage instead of direct store access
    try {
      // Get user data from our custom auth system first
      const authUser = getUser ? getUser() : null;  
      
      // Fallback to localStorage if needed
      if (!authUser) {
        const authData = localStorage.getItem('auth-storage');
        if (authData) {
          const { state } = JSON.parse(authData);
          if (state.user) {
            console.log('Loading user from localStorage:', {
              id: state.user.id,
              role: state.user.role,
              data: state.user
            });
            setUserData(state.user);
          }
        }
      } else {
        console.log('Loading user from auth system:', {
          id: authUser._id,
          role: authUser.role,
          data: authUser
        });
        setUserData({
          id: authUser._id,
          name: authUser.name,
          email: authUser.email,
          role: authUser.role
        });
      }
    } catch (err) {
      console.error('Error accessing auth data:', err);
    }
  }, []);
  
  // Get tasks with filters
  const { data: tasks, isLoading } = useQuery<Task[]>(
    ['tasks', searchTerm, statusFilter, priorityFilter, assigneeFilter, sortBy, sortOrder],
    async () => {
      const params: Record<string, string> = {};
      
      if (searchTerm) params.search = searchTerm;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (assigneeFilter) params.assignedTo = assigneeFilter;
      params.sortBy = sortBy;
      params.sortOrder = sortOrder;
      
      const response = await api.get('/tasks', { params });
      return response.data;
    },
    {
      keepPreviousData: true,
    }
  );

  // Get users for assigning tasks
  const { data: users, isLoading: isLoadingUsers } = useQuery<User[]>(
    'users',
    async () => {
      try {
        // For admin/manager, get all users
        if (userData?.role === 'admin' || userData?.role === 'manager') {
          const response = await api.get('/users');
          console.log('Users fetched from API:', response.data);
          return response.data;
        } 
        // For regular users, use the assignees endpoint that has basic user info
        else if (userData) {
          const response = await api.get('/users/assignees');
          console.log('Assignees fetched from API:', response.data);
          return response.data;
        }
        return [];
      } catch (error) {
        console.error("Error fetching users:", error);
        // Return current user as fallback
        if (userData) {
          return [{ 
            _id: userData.id, 
            name: userData.name || 'Current User', 
            email: userData.email || '', 
            role: userData.role || 'user' 
          }];
        }
        return [];
      }
    },
    {
      enabled: !!userData, // Only run the query if user is available
      onSuccess: (data) => {
        console.log('Users query successful, count:', data?.length);
        // Validate that all user objects have proper ObjectId format
        data?.forEach(user => {
          console.log('User in data:', user);
          if (user._id && !/^[0-9a-fA-F]{24}$/.test(String(user._id))) {
            console.warn('User with invalid _id format:', user);
          }
        });
      }
    }
  );

  // Create/update task mutation
  const taskMutation = useMutation(
    async (formData: any) => {
      try {
        // Log user role and task details for debugging
        console.log('Task operation debug:', {
          operation: selectedTask ? 'update' : 'create',
          taskId: selectedTask?._id,
          currentUserId: userData?.id,
          currentUserRole: userData?.role,
          formData
        });
        
        // Validate required fields client-side before sending to API
        if (!formData.title || !formData.description || !formData.dueDate) {
          throw new Error('Please fill in all required fields');
        }
        
        if (selectedTask) {
          // For update operations, also fetch the current task to compare
          const currentTask = await api.get(`/tasks/${selectedTask._id}`);
          console.log('Current task from server:', currentTask.data);
          console.log('Task creator ID:', currentTask.data.createdBy._id);
          console.log('Current user can update?', 
            userData?.role === 'admin' || 
            userData?.role === 'manager' || 
            currentTask.data.createdBy._id === userData?.id);
            
          return api.put(`/tasks/${selectedTask._id}`, formData);
        } else {
          return api.post('/tasks', formData);
        }
      } catch (error) {
        console.error('Task operation failed:', error);
        throw error;
      }
    },
    {
      onSuccess: (response) => {
        console.log('Task operation success response:', response.data);
        toast.success(selectedTask ? 'Task updated successfully' : 'Task created successfully');
        queryClient.invalidateQueries(['tasks']);
        setIsOpen(false);
      },
      onError: (error: any) => {
        console.error('Task mutation error:', error);
        let errorMessage = 'Failed to save task';
        
        // Extract error message if available
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        console.error('Error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          message: errorMessage,
          headers: error.response?.headers
        });
        
        toast.error(errorMessage);
      }
    }
  );

  // Delete task mutation
  const deleteMutation = useMutation(
    async (taskId: string) => {
      return api.delete(`/tasks/${taskId}`);
    },
    {
      onSuccess: () => {
        toast.success('Task deleted successfully');
        queryClient.invalidateQueries(['tasks']);
      },
      onError: () => {
        toast.error('Failed to delete task');
      }
    }
  );

  const handleEditTask = (task: Task) => {
    setSelectedTask(task);
    setIsOpen(true);
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setIsOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Debug info
    console.log('Form submission', {
      selectedTask: selectedTask ? selectedTask._id : 'new task',
      formData: Object.fromEntries(formData.entries()),
      currentUserRole: userData?.role,
      currentUserId: userData?.id
    });
    
    const taskData: any = {
      title: formData.get('title'),
      description: formData.get('description'),
      dueDate: formData.get('dueDate'),
      priority: formData.get('priority'),
      status: formData.get('status') || 'todo'
    };
    
    // Get the assignedTo value and ensure it's the correct format (_id format is expected by API)
    let assignedToValue = formData.get('assignedTo');
    console.log('Raw assignedTo value from form:', assignedToValue);
    
    // If no assignee was selected or it's empty, default to current user
    if (!assignedToValue && userData?.id) {
      assignedToValue = userData.id;
      console.log('No assignee selected, defaulting to current user:', assignedToValue);
    }
    
    if (assignedToValue) {
      // Make sure we're using a valid MongoDB ObjectId
      const assigneeId = String(assignedToValue).trim();
      console.log('Assigning task to user ID:', assigneeId);
      
      taskData.assignedTo = assigneeId;
    } else {
      toast.error('Please select a user to assign this task to.');
      return; // Don't proceed with form submission
    }
    
    // Handle recurring task fields
    const isRecurring = formData.get('isRecurring') === 'on';
    taskData.isRecurring = isRecurring;
    
    if (isRecurring) {
      taskData.recurringType = formData.get('recurringType');
      
      // Process based on recurring type
      switch (taskData.recurringType) {
        case 'weekly':
          // Get all selected days for weekly recurrence
          const recurringDays: number[] = [];
          form.querySelectorAll('input[name="recurringDays"]:checked').forEach((checkbox) => {
            recurringDays.push(parseInt((checkbox as HTMLInputElement).value));
          });
          taskData.recurringDays = recurringDays.length > 0 ? recurringDays : [0]; // Default to Sunday if none selected
          break;
          
        case 'monthly':
          taskData.recurringDate = parseInt(formData.get('recurringDate') as string);
          break;
          
        case 'custom':
          taskData.recurringInterval = parseInt(formData.get('recurringInterval') as string);
          break;
          
        case 'daily':
        default:
          // Daily recurring tasks don't need additional settings
          taskData.recurringInterval = 1;
          break;
      }
      
      // Add end date if provided
      const endDate = formData.get('recurringEndDate');
      if (endDate) {
        taskData.recurringEndDate = endDate;
      }
    }
    
    // Log the data being sent to the API
    console.log('Submitting task data:', taskData);
    
    try {
      taskMutation.mutate(taskData);
    } catch (error) {
      console.error('Error submitting task:', error);
      toast.error('There was a problem updating the task.');
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    setSearchTerm(form.search.value);
  };

  const handleFilterToggle = () => {
    setIsFilterOpen(!isFilterOpen);
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setPriorityFilter('');
    setAssigneeFilter('');
    setSortBy('dueDate');
    setSortOrder('asc');
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'red.500';
      case 'medium': return 'orange.500';
      case 'low': return 'green.500';
      default: return 'gray.500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'green.500';
      case 'in-progress': return 'blue.500';
      case 'todo': return 'gray.500';
      default: return 'gray.500';
    }
  };

  return (
    <Container maxW="container.xl" py={8}>
      <Toaster position="top-right" />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <Heading size="lg">Tasks</Heading>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <Button leftIcon={<FiFilter />} onClick={handleFilterToggle}>
            Filters
          </Button>
          <Button leftIcon={<FiPlus />} colorScheme="blue" onClick={handleNewTask}>
            Create Task
          </Button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <Box mb={6}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem' }}>
          <input
            type="text"
            name="search"
            placeholder="Search tasks..."
            defaultValue={searchTerm}
            style={{
              flex: 1,
              padding: '0.5rem',
              borderRadius: '0.375rem',
              border: '1px solid #E2E8F0',
              color: '#000000',
              backgroundColor: '#FFFFFF'
            }}
          />
          <Button type="submit" leftIcon={<FiSearch />}>
            Search
          </Button>
        </form>

        {isFilterOpen && (
          <Box p={4} borderWidth="1px" borderRadius="lg" mb={4} boxShadow="lg" 
            sx={{
              background: 'linear-gradient(to bottom right, #1A202C, #171923, #0D1117)',
              borderColor: '#4A5568'
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#E2E8F0' }}>
                  Status
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #4A5568',
                    backgroundColor: '#2D3748',
                    color: '#E2E8F0'
                  }}
                >
                  <option key="status-all" value="">All Status</option>
                  <option key="status-todo" value="todo">To Do</option>
                  <option key="status-in-progress" value="in-progress">In Progress</option>
                  <option key="status-completed" value="completed">Completed</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#E2E8F0' }}>
                  Priority
                </label>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #4A5568',
                    backgroundColor: '#2D3748',
                    color: '#E2E8F0'
                  }}
                >
                  <option key="priority-all" value="">All Priorities</option>
                  <option key="priority-low" value="low">Low</option>
                  <option key="priority-medium" value="medium">Medium</option>
                  <option key="priority-high" value="high">High</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#E2E8F0' }}>
                  Assigned To
                </label>
                <select
                  value={assigneeFilter}
                  onChange={(e) => setAssigneeFilter(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #4A5568',
                    backgroundColor: '#2D3748',
                    color: '#E2E8F0'
                  }}
                >
                  <option key="assignee-all" value="">All Assignees</option>
                  {users?.map((user) => (
                    <option key={user._id} value={user._id}>
                      {user.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#E2E8F0' }}>
                  Sort By
                </label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #4A5568',
                    backgroundColor: '#2D3748',
                    color: '#E2E8F0'
                  }}
                >
                  <option key="sort-dueDate" value="dueDate">Due Date</option>
                  <option key="sort-createdAt" value="createdAt">Created Date</option>
                  <option key="sort-priority" value="priority">Priority</option>
                  <option key="sort-status" value="status">Status</option>
                  <option key="sort-title" value="title">Title</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#E2E8F0' }}>
                  Sort Order
                </label>
                <select
                  value={sortOrder}
                  onChange={(e) => setSortOrder(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.5rem',
                    borderRadius: '0.375rem',
                    border: '1px solid #4A5568',
                    backgroundColor: '#2D3748',
                    color: '#E2E8F0'
                  }}
                >
                  <option key="order-asc" value="asc">Ascending</option>
                  <option key="order-desc" value="desc">Descending</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button onClick={handleResetFilters} mr={2} colorScheme="blue" variant="outline">
                Reset Filters
              </Button>
            </div>
          </Box>
        )}
      </Box>

      {isLoading ? (
        <Box textAlign="center" py={10}>
          <div className="spinner" style={{ 
            width: '50px', 
            height: '50px', 
            border: '4px solid rgba(0, 0, 0, 0.1)',
            borderRadius: '50%',
            borderTop: '4px solid #3182ce',
            animation: 'spin 1s linear infinite',
            margin: '0 auto'
          }}></div>
          <Text mt={4}>Loading tasks...</Text>
        </Box>
      ) : tasks && tasks.length > 0 ? (
        <VStack spacing={4} align="stretch">
          {tasks.map((task) => (
            <Box 
              key={task._id} 
              p={5} 
              shadow="md" 
              borderWidth="1px" 
              borderRadius="md"
              borderLeftWidth="4px"
              borderLeftColor={getPriorityColor(task.priority)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Heading size="md">{task.title}</Heading>
                  <Text color="gray.600">{task.description}</Text>
                </div>
                <div>
                  <Button
                    size="sm"
                    leftIcon={<FiEdit />}
                    onClick={() => handleEditTask(task)}
                    marginRight="0.5rem"
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    colorScheme="red"
                    leftIcon={<FiTrash2 />}
                    onClick={() => {
                      if (window.confirm('Are you sure you want to delete this task?')) {
                        deleteMutation.mutate(task._id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </div>
              </div>
              
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem' }}>
                <Text fontWeight="bold">Status: 
                  <Text as="span" color={getStatusColor(task.status)} ml={2}>
                    {task.status}
                  </Text>
                </Text>
                <Text fontWeight="bold">Due: 
                  <Text as="span" ml={2}>
                    {new Date(task.dueDate).toLocaleDateString()}
                  </Text>
                </Text>
                <Text fontWeight="bold">Assigned to: 
                  <Text as="span" ml={2}>
                    {task.assignedTo?.name || "Unassigned"}
                  </Text>
                </Text>
              </div>
            </Box>
          ))}
        </VStack>
      ) : (
        <Box textAlign="center" py={10} borderWidth="1px" borderRadius="lg">
          <Text fontSize="xl">No tasks found</Text>
          <Text mt={2} color="gray.500">Create your first task to get started</Text>
        </Box>
      )}

      {/* Task Form Modal */}
      {isOpen && (
        <div className="modal-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          zIndex: 1000,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          <div className="modal" style={{
            backgroundColor: '#171923',
            color: '#E2E8F0',
            borderRadius: '0.375rem',
            width: '100%',
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: '1.5rem',
            position: 'relative',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            backgroundImage: 'linear-gradient(to bottom right, #1A202C, #171923, #0D1117)'
          }}>
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '1rem',
                right: '1rem',
                background: 'none',
                border: 'none',
                fontSize: '1.5rem',
                cursor: 'pointer',
                color: '#E2E8F0'
              }}
            >
              ×
            </button>
            <h3 style={{ 
              marginBottom: '1.5rem', 
              fontSize: '1.75rem', 
              color: '#90CDF4',
              textAlign: 'center',
              fontWeight: 'bold',
              borderBottom: '1px solid #4A5568',
              paddingBottom: '0.75rem',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)'
            }}>
              {selectedTask ? 'Edit Task • TaskManager PRO' : 'Create New Task • TaskManager PRO'}
            </h3>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: 'bold',
                    color: '#90CDF4',
                    fontSize: '0.9rem',
                    letterSpacing: '0.5px'
                  }}>
                    Title *
                  </label>
                  <input
                    name="title"
                    defaultValue={selectedTask?.title}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #4A5568',
                      backgroundColor: '#2D3748',
                      color: '#E2E8F0'
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: 'bold',
                    color: '#90CDF4',
                    fontSize: '0.9rem',
                    letterSpacing: '0.5px'
                  }}>
                    Description *
                  </label>
                  <textarea
                    name="description"
                    defaultValue={selectedTask?.description}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #4A5568',
                      backgroundColor: '#2D3748',
                      color: '#E2E8F0',
                      minHeight: '100px'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Due Date *
                  </label>
                  <input
                    name="dueDate"
                    type="date"
                    defaultValue={selectedTask?.dueDate ? 
                      new Date(selectedTask.dueDate).toISOString().split('T')[0] :
                      undefined}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #4A5568',
                      backgroundColor: '#2D3748',
                      color: '#E2E8F0'
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    Priority *
                  </label>
                  <select 
                    name="priority" 
                    defaultValue={selectedTask?.priority || 'medium'}
                    required
                    style={{
                      width: '100%',
                      padding: '0.5rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #4A5568',
                      backgroundColor: '#2D3748',
                      color: '#E2E8F0'
                    }}
                  >
                    <option key="form-priority-low" value="low">Low</option>
                    <option key="form-priority-medium" value="medium">Medium</option>
                    <option key="form-priority-high" value="high">High</option>
                  </select>
                </div>

                {/* Recurring Task Options */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      id="isRecurring"
                      name="isRecurring"
                      defaultChecked={selectedTask?.isRecurring || false}
                      onChange={(e) => {
                        const recurringOptions = document.getElementById('recurringOptions');
                        if (recurringOptions) {
                          recurringOptions.style.display = e.target.checked ? 'block' : 'none';
                        }
                      }}
                      style={{ marginRight: '0.5rem' }}
                    />
                    <label htmlFor="isRecurring" style={{ fontWeight: 'bold' }}>
                      Recurring Task
                    </label>
                  </div>

                  <div 
                    id="recurringOptions" 
                    style={{ 
                      display: selectedTask?.isRecurring ? 'block' : 'none',
                      padding: '1rem',
                      borderRadius: '0.375rem',
                      border: '1px solid #4A5568',
                      backgroundColor: '#2D3748',
                      marginTop: '0.5rem'
                    }}
                  >
                    <div style={{ marginBottom: '1rem' }}>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Recurrence Pattern
                      </label>
                      <select
                        name="recurringType"
                        defaultValue={selectedTask?.recurringType || 'daily'}
                        onChange={(e) => {
                          const typeValue = e.target.value;
                          document.getElementById('weeklyOptions')!.style.display = 
                            typeValue === 'weekly' ? 'block' : 'none';
                          document.getElementById('monthlyOptions')!.style.display = 
                            typeValue === 'monthly' ? 'block' : 'none';
                          document.getElementById('customOptions')!.style.display = 
                            typeValue === 'custom' ? 'block' : 'none';
                        }}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #4A5568',
                          backgroundColor: '#2D3748',
                          color: '#E2E8F0'
                        }}
                      >
                        <option key="recurring-daily" value="daily">Daily</option>
                        <option key="recurring-weekly" value="weekly">Weekly</option>
                        <option key="recurring-monthly" value="monthly">Monthly</option>
                        <option key="recurring-custom" value="custom">Custom</option>
                      </select>
                    </div>

                    {/* Weekly options */}
                    <div 
                      id="weeklyOptions" 
                      style={{ 
                        display: selectedTask?.recurringType === 'weekly' ? 'block' : 'none',
                        marginBottom: '1rem' 
                      }}
                    >
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Days of Week
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                        {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day, index) => (
                          <div key={day} style={{ display: 'flex', alignItems: 'center', width: '48%' }}>
                            <input
                              type="checkbox"
                              id={`day-${index}`}
                              name="recurringDays"
                              value={index}
                              defaultChecked={selectedTask?.recurringDays?.includes(index)}
                              style={{ marginRight: '0.5rem' }}
                            />
                            <label htmlFor={`day-${index}`}>{day}</label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Monthly options */}
                    <div 
                      id="monthlyOptions" 
                      style={{ 
                        display: selectedTask?.recurringType === 'monthly' ? 'block' : 'none',
                        marginBottom: '1rem' 
                      }}
                    >
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Day of Month
                      </label>
                      <select
                        name="recurringDate"
                        defaultValue={selectedTask?.recurringDate || 1}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #4A5568',
                          backgroundColor: '#2D3748',
                          color: '#E2E8F0'
                        }}
                      >
                        {Array.from({ length: 31 }, (_, i) => i + 1).map(day => (
                          <option key={day} value={day}>{day}</option>
                        ))}
                      </select>
                    </div>

                    {/* Custom interval options */}
                    <div 
                      id="customOptions" 
                      style={{ 
                        display: selectedTask?.recurringType === 'custom' ? 'block' : 'none',
                        marginBottom: '1rem' 
                      }}
                    >
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        Repeat every
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <input
                          type="number"
                          name="recurringInterval"
                          defaultValue={selectedTask?.recurringInterval || 1}
                          min="1"
                          style={{
                            width: '80px',
                            padding: '0.5rem',
                            borderRadius: '0.375rem',
                            border: '1px solid #4A5568',
                            backgroundColor: '#2D3748',
                            color: '#E2E8F0'
                          }}
                        />
                        <span>days</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                        End Date (Optional)
                      </label>
                      <input
                        type="date"
                        name="recurringEndDate"
                        defaultValue={selectedTask?.recurringEndDate ? 
                          new Date(selectedTask.recurringEndDate).toISOString().split('T')[0] : 
                          undefined}
                        style={{
                          width: '100%',
                          padding: '0.5rem',
                          borderRadius: '0.375rem',
                          border: '1px solid #4A5568',
                          backgroundColor: '#2D3748',
                          color: '#E2E8F0'
                        }}
                      />
                    </div>
                  </div>
                </div>

                {selectedTask && (
                  <div>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                      Status
                    </label>
                    <select 
                      name="status" 
                      defaultValue={selectedTask?.status || 'todo'}
                      style={{
                        width: '100%',
                        padding: '0.5rem',
                        borderRadius: '0.375rem',
                        border: '1px solid #4A5568',
                        backgroundColor: '#2D3748',
                        color: '#E2E8F0'
                      }}
                    >
                      <option key="form-status-todo" value="todo">To Do</option>
                      <option key="form-status-in-progress" value="in-progress">In Progress</option>
                      <option key="form-status-completed" value="completed">Completed</option>
                    </select>
                  </div>
                )}

                <div>
                  <label style={{ 
                    display: 'block', 
                    marginBottom: '0.5rem', 
                    fontWeight: 'bold',
                    color: highlightAssignee ? '#63B3ED' : 'inherit',
                    transition: 'color 0.3s ease-in-out'
                  }}>
                    Assign To * <span style={{ color: highlightAssignee ? '#90CDF4' : '#90CDF4', fontSize: '0.85em' }}>(Click to select)</span>
                  </label>
                  {isLoadingUsers ? (
                    <div>Loading users...</div>
                  ) : users && users.length > 0 ? (
                    <>
                      <div 
                        style={{ 
                          position: 'relative',
                          borderRadius: '0.375rem',
                          boxShadow: highlightAssignee ? '0 0 0 2px #63B3ED, 0 0 20px rgba(99, 179, 237, 0.5)' : 'none',
                          transition: 'all 0.3s ease-in-out',
                          animation: highlightAssignee ? 'pulse 2s infinite' : 'none'
                        }}
                      >
                        <select 
                          name="assignedTo" 
                          defaultValue={selectedTask?.assignedTo?._id || userData?.id || ''}
                          required
                          onClick={(e) => {
                            // No automatic open/close, let the browser handle native select behavior
                            console.log('Assign select clicked');
                          }}
                          onFocus={(e) => {
                            console.log('Assign select focused');
                            // Make sure the dropdown opens when focused
                            const select = e.target as HTMLSelectElement;
                            select.click();
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            paddingRight: '2.5rem', // Make room for the dropdown icon
                            borderRadius: '0.375rem',
                            border: '2px solid #4A5568',
                            backgroundColor: '#2D3748',
                            color: '#E2E8F0',
                            appearance: 'none', // Remove default dropdown arrow
                            cursor: 'pointer', // Show pointer cursor on hover
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)' // Add slight shadow for depth
                          }}
                        >
                          <option value="" disabled>-- Select a user --</option>
                          {users.map((user) => {
                            console.log('Rendering user option:', user);
                            // Less strict validation to ensure we always show some options
                            if (!user || !user._id) {
                              return null;
                            }
                            
                            return (
                              <option 
                                key={`assign-${user._id}`}
                                value={user._id}
                                style={{
                                  padding: '8px',
                                  backgroundColor: '#2D3748',
                                  color: '#FFFFFF',
                                  fontWeight: 'bold'
                                }}
                              >
                                👤 {user.name || 'Current User'} ({user.role || 'user'})
                              </option>
                            );
                          })}
                        </select>
                        <div style={{ 
                          position: 'absolute', 
                          right: '0.5rem', 
                          top: '50%', 
                          transform: 'translateY(-50%)',
                          animation: highlightAssignee ? 'bounce 1s infinite' : 'none'
                        }}>
                          <FiChevronDown size={16} color={highlightAssignee ? "#63B3ED" : "#4A5568"} />
                        </div>
                      </div>
                      <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#90CDF4' }}>
                        {users.length} user(s) available
                      </div>
                    </>
                  ) : (
                    <div>
                      <div style={{ color: 'red', marginBottom: '0.5rem' }}>
                        No users available from API. Using current user as default.
                      </div>
                      <div style={{ position: 'relative' }}>
                        <select 
                          name="assignedTo" 
                          defaultValue={userData?.id || ''}
                          required
                          onClick={(e) => {
                            // No automatic open/close, let the browser handle native select behavior
                            console.log('Fallback assign select clicked');
                          }}
                          onFocus={(e) => {
                            console.log('Fallback assign select focused');
                            // Make sure the dropdown opens when focused
                            const select = e.target as HTMLSelectElement;
                            select.click();
                          }}
                          style={{
                            width: '100%',
                            padding: '0.5rem',
                            paddingRight: '2.5rem',
                            borderRadius: '0.375rem',
                            border: '2px solid #4A5568',
                            backgroundColor: '#2D3748',
                            color: '#E2E8F0',
                            appearance: 'none',
                            cursor: 'pointer',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)'
                          }}
                        >
                          <option 
                            key="assign-current-user"
                            value={userData?.id || ''}
                            style={{
                              padding: '8px',
                              backgroundColor: '#2D3748',
                              color: '#FFFFFF', 
                              fontWeight: 'bold'
                            }}
                          >
                            👤 {userData?.name || 'Current User'} ({userData?.role || 'user'})
                          </option>
                        </select>
                        <div style={{ position: 'absolute', right: '0.5rem', top: '50%', transform: 'translateY(-50%)' }}>
                          <FiChevronDown size={16} color="#4A5568" />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <Button 
                  type="submit" 
                  colorScheme="blue" 
                  mt={4}
                  isLoading={taskMutation.isLoading}
                  disabled={isLoadingUsers || !users || users.length === 0}
                  style={{
                    background: 'linear-gradient(to right, #3182CE, #2B6CB0)',
                    padding: '0.75rem',
                    fontWeight: 'bold',
                    letterSpacing: '0.5px',
                    boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
                    width: '100%'
                  }}
                >
                  {selectedTask ? 'Update Task' : 'Create Task'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(99, 179, 237, 0.7); }
          70% { box-shadow: 0 0 0 10px rgba(99, 179, 237, 0); }
          100% { box-shadow: 0 0 0 0 rgba(99, 179, 237, 0); }
        }

        @keyframes bounce {
          0%, 20%, 50%, 80%, 100% { transform: translateY(-50%); }
          40% { transform: translateY(-65%); }
          60% { transform: translateY(-45%); }
        }
      `}</style>
    </Container>
  );
} 