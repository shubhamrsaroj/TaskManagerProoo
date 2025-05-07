'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Box, Container, Heading, Button, VStack, Text, Input, FormControl, FormLabel, useToast } from '@chakra-ui/react';
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiUser, FiMail, FiLock } from 'react-icons/fi';
import { useQuery, useMutation, useQueryClient, QueryClient, QueryClientProvider } from 'react-query';
import api from '@/lib/api';
import { getUser } from '@/lib/auth';

// User interface
interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export default function UsersPage() {
  // Create a client
  const queryClientInstance = new QueryClient();
  
  return (
    <QueryClientProvider client={queryClientInstance}>
      <UsersPageContent />
    </QueryClientProvider>
  );
}

function UsersPageContent() {
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const toast = useToast();
  
  // Debounce search term
  useEffect(() => {
    const timerId = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500); // 500ms delay

    return () => {
      clearTimeout(timerId);
    };
  }, [searchTerm]);
  
  useEffect(() => {
    const user = getUser();
    if (user) {
      setCurrentUser(user);
    }
  }, []);
  
  // Get users with search filter
  const { data: users, isLoading } = useQuery<User[]>(
    ['users', debouncedSearchTerm],
    async () => {
      const params: Record<string, string> = {};
      if (debouncedSearchTerm) params.search = debouncedSearchTerm;
      
      const response = await api.get('/users', { params });
      return response.data;
    },
    {
      enabled: !!currentUser && currentUser.role === 'admin',
      staleTime: 60000, // 1 minute
      refetchOnWindowFocus: false
    }
  );
  
  // Create/update user mutation
  const userMutation = useMutation(
    async (formData: any) => {
      try {
        if (selectedUser) {
          const response = await api.put(`/users/${selectedUser._id}`, formData);
          return response;
        } else {
          const response = await api.post('/users', formData);
          return response;
        }
      } catch (error) {
        console.error('User mutation error:', error);
        throw error;
      }
    },
    {
      onSuccess: (response) => {
        const action = selectedUser ? 'updated' : 'created';
        toast({
          title: `Success`,
          description: `User ${action} successfully`,
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
        queryClient.invalidateQueries(['users']);
        setIsOpen(false);
      },
      onError: (error: any) => {
        // Get more specific error message if available
        let errorMessage = 'Failed to save user';
        if (error.response?.data?.message) {
          errorMessage = error.response.data.message;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        toast({
          title: 'Error',
          description: errorMessage,
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
      }
    }
  );
  
  // Delete user mutation
  const deleteMutation = useMutation(
    async (userId: string) => {
      return api.delete(`/users/${userId}`);
    },
    {
      onSuccess: () => {
        toast({
          title: 'Success',
          description: 'User deleted successfully',
          status: 'success',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
        queryClient.invalidateQueries(['users']);
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'Failed to delete user',
          status: 'error',
          duration: 5000,
          isClosable: true,
          position: 'top-right'
        });
      }
    }
  );
  
  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setIsOpen(true);
  };
  
  const handleNewUser = () => {
    setSelectedUser(null);
    setIsOpen(true);
  };
  
  const handleDeleteUser = (userId: string) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      deleteMutation.mutate(userId);
    }
  };
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const formData = new FormData(form);
    
    // Extract values
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const role = formData.get('role') as string;
    const password = formData.get('password') as string;
    
    // Create user data object
    const userData: any = { name, email, role };
    
    // Only include password for new users
    if (!selectedUser && password) {
      userData.password = password;
    }
    
    userMutation.mutate(userData);
  };
  
  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };
  
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return '#E53E3E'; // red
      case 'manager': return '#805AD5'; // purple
      default: return '#3182CE'; // blue
    }
  };
  
  // Check if user has admin permission
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <Container maxW="container.xl" py={8}>
        <Box p={6} shadow="md" borderWidth="1px" borderRadius="lg" bg="#111827" color="white">
          <Heading size="md" color="red.400">Access Denied</Heading>
          <Box mt={4} color="gray.300">
            You don't have permission to access the User Management section.
            Please contact your administrator for access.
          </Box>
        </Box>
      </Container>
    );
  }

  return (
    <Container maxW="container.xl" py={8} bg="#080F1A">
      <style jsx global>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        body {
          background-color: #080F1A;
        }
      `}</style>
      
      {/* Header Section */}
      <Box p={6} borderRadius="lg" boxShadow="sm" bg="#111827" color="white" mb={6}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box>
            <Heading size="lg" fontWeight="bold">User Management</Heading>
            <Text color="gray.400" mt={1}>
              Manage user accounts and control access permissions
            </Text>
          </Box>
        </Box>
      </Box>
      
      {/* Search Bar */}
      <Box mb={6}>
        <Box display="flex" alignItems="center" position="relative">
          <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400">
            <FiSearch />
          </Box>
          <Input
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search users by name or email..."
            pl={10}
            borderRadius="md"
            bg="white"
            color="white"
            size="lg"
            boxShadow="sm"
            _placeholder={{ color: 'gray.500' }}
          />
        </Box>
      </Box>
      
      {/* Users Table */}
      {isLoading ? (
        <Box textAlign="center" py={10} bg="white" borderRadius="lg" boxShadow="sm">
          <Box width="50px" height="50px" borderRadius="50%" border="4px solid rgba(0,0,0,0.1)" 
              borderTop="4px solid #3182ce" margin="0 auto" 
              style={{animation: "spin 1s linear infinite"}} />
          <Text mt={4}>Loading users...</Text>
        </Box>
      ) : users && users.length > 0 ? (
        <Box bg="#111827" borderRadius="lg" boxShadow="md" overflow="hidden">
          <Box overflowX="auto">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <tbody>
                {users.map((user) => (
                  <tr key={user._id} 
                      style={{ 
                        borderBottom: '1px solid rgba(255,255,255,0.1)',
                        transition: 'background-color 0.2s' 
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}>
                    <td style={{ 
                      padding: '16px 20px', 
                      color: '#fff',
                      fontWeight: '500',
                      width: '40%'
                    }}>
                      {user.name}<br/>
                      <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.9rem' }}>{user.email}</span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <span style={{ 
                        backgroundColor: getRoleColor(user.role),
                        color: 'white',
                        padding: '5px 12px',
                        borderRadius: '9999px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {user.role}
                      </span>
                    </td>
                    <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                      <Box display="flex" gap={2} justifyContent="flex-end">
                        <Button
                          size="sm"
                          colorScheme="blue"
                          leftIcon={<FiEdit2 />}
                          onClick={() => handleEditUser(user)}
                          variant="outline"
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          colorScheme="red"
                          leftIcon={<FiTrash2 />}
                          onClick={() => handleDeleteUser(user._id)}
                          variant="outline"
                        >
                          Delete
                        </Button>
                      </Box>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Box>
        </Box>
      ) : (
        <Box 
          bg="#111827" 
          color="white"
          borderRadius="lg" 
          boxShadow="sm" 
          p={8} 
          textAlign="center"
        >
          <Box 
            bg="#1F2937" 
            borderRadius="full" 
            p={3} 
            width="60px" 
            height="60px" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            margin="0 auto"
            mb={4}
          >
            <FiUser size={30} color="#3B82F6" />
          </Box>
          <Heading size="md" mb={2}>No users found</Heading>
          <Text color="gray.400">Contact an administrator to add users to the system</Text>
        </Box>
      )}
      
      {/* User Form Modal */}
      {isOpen && (
        <Box 
          position="fixed" 
          top={0} 
          left={0} 
          right={0} 
          bottom={0} 
          backgroundColor="rgba(0, 0, 0, 0.7)" 
          zIndex={1000} 
          display="flex" 
          justifyContent="center" 
          alignItems="center"
        >
          <Box 
            bg="#111827" 
            color="white"
            borderRadius="lg" 
            width="100%" 
            maxWidth="500px" 
            maxHeight="90vh" 
            overflow="auto" 
            p={6} 
            position="relative" 
            boxShadow="lg"
          >
            <Button 
              position="absolute" 
              top={3} 
              right={3} 
              variant="ghost" 
              fontSize="xl" 
              color="gray.300"
              onClick={() => setIsOpen(false)}
            >
              ×
            </Button>
            <Heading size="lg" textAlign="center" mb={6} pb={3} borderBottomWidth="1px" borderBottomColor="gray.700">
              {selectedUser ? 'Edit User' : 'Add New User'}
            </Heading>
            <form onSubmit={handleSubmit}>
              <VStack spacing={4}>
                <FormControl isRequired>
                  <FormLabel color="gray.300">Name</FormLabel>
                  <Box position="relative">
                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400">
                      <FiUser />
                    </Box>
                    <Input
                      name="name"
                      defaultValue={selectedUser?.name}
                      placeholder="Enter full name"
                      pl={10}
                      required
                      bg="#FFFFFF"
                      border="none"
                      color="black"
                      _placeholder={{ color: 'gray.500' }}
                    />
                  </Box>
                </FormControl>
                
                <FormControl isRequired>
                  <FormLabel color="gray.300">Email</FormLabel>
                  <Box position="relative">
                    <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400">
                      <FiMail />
                    </Box>
                    <Input
                      name="email"
                      type="email"
                      defaultValue={selectedUser?.email}
                      placeholder="Enter email address"
                      pl={10}
                      required
                      bg="#FFFFFF"
                      border="none"
                      color="black"
                      _placeholder={{ color: 'gray.500' }}
                    />
                  </Box>
                </FormControl>
                
                {!selectedUser && (
                  <FormControl isRequired>
                    <FormLabel color="gray.300">Password</FormLabel>
                    <Box position="relative">
                      <Box position="absolute" left={3} top="50%" transform="translateY(-50%)" color="gray.400">
                        <FiLock />
                      </Box>
                      <Input
                        name="password"
                        type="password"
                        placeholder="Enter secure password"
                        pl={10}
                        required={!selectedUser}
                        bg="#FFFFFF"
                        border="none"
                        color="black"
                        _placeholder={{ color: 'gray.500' }}
                      />
                    </Box>
                  </FormControl>
                )}
                
                <FormControl isRequired>
                  <FormLabel color="blue.300">Role</FormLabel>
                  <select 
                    name="role" 
                    defaultValue={selectedUser?.role || 'user'}
                    required
                    style={{
                      width: '100%',
                      padding: '0.6rem 0.5rem',
                      borderRadius: '0.375rem',
                      border: 'none',
                      backgroundColor: '#FFFFFF',
                      color: 'black',
                      fontSize: '1rem'
                    }}
                  >
                    <option value="user">User (Standard)</option>
                    <option value="manager">Manager (Team Lead)</option>
                    <option value="admin">Admin (Full Access)</option>
                  </select>
                  {selectedUser && (
                    <Text fontSize="sm" color="gray.400" mt={1}>
                      Current role: {selectedUser.role}
                    </Text>
                  )}
                </FormControl>
                
                <Box display="flex" justifyContent="space-between" width="100%" mt={6} pt={4} borderTopWidth="1px" borderTopColor="gray.700">
                  <Button variant="outline" colorScheme="gray" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    colorScheme="blue" 
                    isLoading={userMutation.isLoading}
                  >
                    {selectedUser ? 'Update User' : 'Create User'}
                  </Button>
                </Box>
              </VStack>
            </form>
          </Box>
        </Box>
      )}
    </Container>
  );
} 