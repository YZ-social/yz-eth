import {
  AccountBalanceWallet as AccountBalanceWalletIcon,
  Code as CodeIcon,
  Dashboard as DashboardIcon,
  SwapHoriz as SwapHorizIcon,
} from '@mui/icons-material'
import {
  AppBar,
  Box,
  Divider,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material'
import React, { useState, useEffect } from 'react'
import { BlockManager } from '../blockManager'
import { SolidityExecutor } from '../solidityExecutor'
import { BlockchainView } from './index'

const drawerWidth = 240

export default function App() {
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'))
  const [activeSection, setActiveSection] = useState('dashboard')
  const [blockManager] = useState(new BlockManager())
  const [executor] = useState(new SolidityExecutor(blockManager))
  useEffect(() => {
    const init = async () => {
      await blockManager.initialize()
    }
    init()
  }, [blockManager])

  const handleSectionChange = (section: string) => {
    setActiveSection(section)
  }

  const menuItems = [{ text: 'Dashboard', icon: <DashboardIcon />, section: 'dashboard' }]

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <Typography variant="h6" noWrap component="div">
            YZ ETH Blockchain Simulator v1.0.0
          </Typography>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? activeSection !== 'dashboard' : true}
        onClose={() => handleSectionChange('dashboard')}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: { width: drawerWidth, boxSizing: 'border-box' },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding sx={{ display: 'block' }}>
                <ListItemButton
                  selected={activeSection === item.section}
                  onClick={() => handleSectionChange(item.section)}
                  sx={{
                    minHeight: 48,
                    justifyContent: isMobile ? 'initial' : 'initial',
                    px: 2.5,
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 0,
                      mr: isMobile ? 3 : 'auto',
                      justifyContent: 'center',
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} sx={{ opacity: isMobile ? 1 : 1 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
          <Divider />
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, width: '100%', mt: 8 }}>
        {activeSection === 'dashboard' && (
          <BlockchainView blockManager={blockManager} executor={executor} />
        )}
      </Box>
    </Box>
  )
}
