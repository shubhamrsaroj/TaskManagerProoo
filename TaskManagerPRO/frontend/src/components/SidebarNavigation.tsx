import { 
  Box, 
  VStack, 
  Text, 
  Heading
} from '@chakra-ui/react';
import NextLink from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { 
  FiHome, 
  FiCheckSquare, 
  FiCalendar, 
  FiUsers,
  FiSettings, 
  FiBarChart2,
  FiLogOut,
  FiAward
} from 'react-icons/fi';
import { getUser, logout } from '@/lib/auth';
import { appColors } from '@/lib/theme';

// Custom Divider component since Chakra's isn't available
const Divider = () => <Box height="1px" bg={appColors.border.light} my={4} opacity={0.4} />;

// Custom Image component since Chakra's isn't available
const Image = ({ src, alt, ...props }: { src: string, alt: string, [key: string]: any }) => (
  <Box as="img" src={src} alt={alt} {...props} />
);

export default function SidebarNavigation() {
  const router = useRouter();
  const [activeItem, setActiveItem] = useState('');
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    // Set active item based on current path
    const path = window.location.pathname || '';
    
    // Use exactPathMatch to handle nested routes
    for (const item of navigationItems) {
      if (exactPathMatch(path, item.path)) {
        setActiveItem(item.path);
        // Store active path in session storage for persistence
        sessionStorage.setItem('activeNavItem', item.path);
        break;
      }
    }

    // Get user data
    const userData = getUser();
    if (userData) {
      setUser(userData);
    }
  }, []);

  // Helper to check exact path match
  const exactPathMatch = (currentPath: string, itemPath: string) => {
    // Handle root dashboard path specially
    if (itemPath === '/dashboard' && currentPath === '/dashboard') {
      return true;
    }
    // For other paths, either exact match or current path starts with item path and it's not just the dashboard path
    return currentPath === itemPath || 
           (currentPath.startsWith(itemPath) && itemPath !== '/dashboard');
  };

  // Handle menu item click
  const handleItemClick = (path: string) => {
    setActiveItem(path);
    sessionStorage.setItem('activeNavItem', path);
  };

  // Handle logout
  const handleLogout = async () => {
    await logout(true); // Explicitly mark as voluntary logout
    window.location.href = '/auth/login'; // Use direct browser navigation instead of Next.js router
  };

  // Dashboard navigation items
  const navigationItems = [
    { name: 'Dashboard', icon: FiHome, path: '/dashboard' },
    { name: 'Tasks', icon: FiCheckSquare, path: '/dashboard/tasks' },
    { name: 'Calendar', icon: FiCalendar, path: '/dashboard/calendar' },
    { name: 'Leaderboard', icon: FiAward, path: '/dashboard/leaderboard' },
    { name: 'Reports', icon: FiBarChart2, path: '/dashboard/reports', roles: ['admin', 'manager'] },
    { name: 'Users', icon: FiUsers, path: '/dashboard/users', roles: ['admin'] },
    { name: 'Settings', icon: FiSettings, path: '/dashboard/settings' },
  ];

  // Filter items based on user role
  const filteredItems = navigationItems.filter(item => {
    if (!item.roles) return true;
    return user && item.roles.includes(user.role);
  });

  return (
    <Box 
      as="nav" 
      width="250px"
      height="100vh"
      bg={appColors.background.primary}
      color={appColors.text.primary}
      p={4}
      position="fixed"
      left={0}
      top={0}
      overflowY="auto"
      borderRight={`1px solid ${appColors.border.light}`}
    >
      {/* Logo */}
      <Box mb={6} textAlign="center">
        <Image 
          src="/logo.svg" 
          alt="TaskManager PRO"
          height="50px"
          mx="auto"
        />
        <Heading 
          size="md" 
          mt={2}
          color="#FF5A5A"
        >
          TaskManager PRO
        </Heading>
      </Box>

      <Divider />

      {/* Navigation Items */}
      <VStack spacing={1} align="stretch">
        {filteredItems.map(item => (
          <Box
            key={item.path}
            onClick={() => {
              handleItemClick(item.path);
              router.push(item.path);
            }}
            cursor="pointer"
            style={{ textDecoration: 'none' }}
          >
            <Box
              display="flex"
              alignItems="center"
              p={3}
              borderRadius="md"
              bg={activeItem === item.path ? `${appColors.accent.primary}22` : 'transparent'}
              opacity={activeItem === item.path ? 1 : 0.8}
              _hover={{ bg: `${appColors.accent.primary}22`, opacity: 1 }}
              transition="all 0.2s"
              fontWeight={activeItem === item.path ? 'bold' : 'normal'}
              borderLeft={activeItem === item.path ? '3px solid' : '3px solid transparent'}
              borderLeftColor={appColors.accent.primary}
              color={activeItem === item.path ? appColors.accent.secondary : appColors.text.primary}
            >
              <Box as={item.icon} mr={3} />
              <Text>{item.name}</Text>
            </Box>
          </Box>
        ))}
      </VStack>

      <Box flexGrow={1} minHeight="20px" />

      <Divider />

      {/* User Profile */}
      {user && (
        <Box mb={4}>
          <Text fontSize="sm" color={appColors.text.muted}>Logged in as</Text>
          <Text fontWeight="bold">{user.name}</Text>
          <Text fontSize="xs" color={appColors.text.muted}>{user.role}</Text>
        </Box>
      )}

      {/* Logout Button */}
      <Box
        display="flex"
        alignItems="center"
        p={3}
        borderRadius="md"
        cursor="pointer"
        _hover={{ bg: 'rgba(239, 68, 68, 0.2)' }}
        onClick={async (e: React.MouseEvent) => {
          e.preventDefault();
          await handleLogout();
        }}
      >
        <Box as={FiLogOut} mr={3} />
        <Text>Logout</Text>
      </Box>
    </Box>
  );
} 