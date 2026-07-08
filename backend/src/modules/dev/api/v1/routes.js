import { Router } from 'express';

const router = Router();

// Mock metrics data
router.get('/metrics', (req, res) => {
  res.status(200).json({
    metrics: {
      activeBranches: 4,
      commitsCount: 284,
      openPullRequests: 2,
      loggedHours: 38.5,
      completedTickets: 12,
      systemHealth: '98%'
    }
  });
});

// Mock diagnostic logs data
router.get('/logs', (req, res) => {
  res.status(200).json({
    logs: [
      { timestamp: new Date(Date.now() - 300000).toISOString(), type: 'INFO', message: 'Initialized Vite Client hot module reload module.' },
      { timestamp: new Date(Date.now() - 250000).toISOString(), type: 'SUCCESS', message: 'SQLite database schemas compiled successfully.' },
      { timestamp: new Date(Date.now() - 200000).toISOString(), type: 'INFO', message: 'Mounting API v1 subpath routes: /auth, /roles, /invites, /dev' },
      { timestamp: new Date(Date.now() - 150000).toISOString(), type: 'WARN', message: 'Deprecation Warning: experimental-specifier-resolution is deprecated in newer Node versions.' },
      { timestamp: new Date(Date.now() - 100000).toISOString(), type: 'SUCCESS', message: 'Express middleware binding completed (CORS, body-parser, router).' },
      { timestamp: new Date(Date.now() - 50000).toISOString(), type: 'INFO', message: 'Developer Dashboard Metrics requested successfully.' }
    ]
  });
});

export default router;
