import { Router } from 'express';
import authRoutes from '#@/modules/auth/api/v1/routes';
import devRoutes from '#@/modules/dev/api/v1/routes';
import roleRoutes from '#@/modules/role/api/v1/routes';
import inviteRoutes from '#@/modules/invite/api/v1/routes';
import organizationRoutes from '#@/modules/organization/api/v1/routes';
import roleDelegationRoutes from '#@/modules/role-delegation/api/v1/routes';
import roleAssignmentRoutes from '#@/modules/role-assignment/api/v1/routes';
import emailRoutes from '#@/modules/email/api/v1/routes';
import aiRoutes from '#@/modules/ai/api/v1/routes';
import designationRoutes from '#@/modules/designation/api/v1/routes.js';
import officeLocationRoutes from '#@/modules/office-location/api/v1/routes.js';
import workShiftRoutes from '#@/modules/work-shift/api/v1/routes.js';
import holidayRoutes from '#@/modules/holiday/api/v1/routes.js';
import employeeRoutes from '#@/modules/employee/api/v1/routes.js';
import insightRoutes from '#@/modules/insight/api/v1/routes.js';
import auditLogRoutes from '#@/modules/audit-log/api/v1/routes.js';
import recruitmentRoutes from '#@/modules/recruitment/api/v1/routes.js';
import attendanceRoutes from '#@/modules/attendance/api/v1/routes.js';
import leaveRoutes from '#@/modules/leave/api/v1/routes.js';
import payrollRoutes from '#@/modules/payroll/api/v1/routes.js';
import performanceRoutes from '#@/modules/performance/api/v1/routes.js';

const router = Router();

// API v1 Mount Points
router.use('/auth', authRoutes);
router.use('/dev', devRoutes);
router.use('/roles', roleRoutes);
router.use('/invites', inviteRoutes);
router.use('/organizations', organizationRoutes);
router.use('/role-delegation-policies', roleDelegationRoutes);
router.use('/role-assignment-policies', roleAssignmentRoutes);
router.use('/email', emailRoutes);
router.use('/ai', aiRoutes);
router.use('/designations', designationRoutes);
router.use('/office-locations', officeLocationRoutes);
router.use('/work-shifts', workShiftRoutes);
router.use('/holidays', holidayRoutes);
router.use('/employees', employeeRoutes);
router.use('/insights', insightRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/recruitment', recruitmentRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/leave', leaveRoutes);
router.use('/payroll', payrollRoutes);
router.use('/performance', performanceRoutes);

// Health check endpoint
router.get('/health', (req, res) => res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Enterprise Workforce Management Platform with AI Operations Assistant'
}));

export default router;
