const express = require('express');
const router = express.Router();
const db = require('../db');
const { requireAdmin } = require('../middleware/requireLogin');

// Guard all admin routes with requireAdmin
router.use(requireAdmin);

/**
 * GET /admin
 * Admin Overview, Pending Teacher Approvals & System Audit Logs
 */
router.get('/', async (req, res) => {
    try {
        // 1. Key Platform Statistics
        const studentCountRes = await db.execute(`SELECT COUNT(*) AS CNT FROM STUDENT`);
        const verifiedTeacherRes = await db.execute(`SELECT COUNT(*) AS CNT FROM TEACHER WHERE APPROVAL_STATUS = 1`);
        const pendingTeacherRes = await db.execute(`SELECT COUNT(*) AS CNT FROM TEACHER WHERE APPROVAL_STATUS = 0`);
        const totalExamsRes = await db.execute(`SELECT COUNT(*) AS CNT FROM EXAM`);

        const stats = {
            students: studentCountRes.rows[0].CNT || 0,
            verifiedTeachers: verifiedTeacherRes.rows[0].CNT || 0,
            pendingTeachers: pendingTeacherRes.rows[0].CNT || 0,
            totalExams: totalExamsRes.rows[0].CNT || 0
        };

        // 2. Pending Teacher Registrations
        const pendingTeachers = await db.execute(
            `SELECT TEACHER_ID, FIRST_NAME, LAST_NAME, EMAIL, REGISTERED_DATE 
             FROM TEACHER 
             WHERE APPROVAL_STATUS = 0 
             ORDER BY TEACHER_ID DESC`
        );

        // 3. System Audit Logs
        const questionLogs = await db.execute(
            `SELECT ql.TEACHER_ID, ql.QUESTION_ID, ql.ACTION, ql.ACTION_TIME, t.FIRST_NAME, t.LAST_NAME
             FROM QUESTION_LOG ql
             LEFT JOIN TEACHER t ON ql.TEACHER_ID = t.TEACHER_ID
             ORDER BY ql.ACTION_TIME DESC
             FETCH FIRST 10 ROWS ONLY`
        );

        const teacherLogs = await db.execute(
            `SELECT tl.TEACHER_ID, tl.LOGIN_TIME, t.FIRST_NAME, t.LAST_NAME, t.EMAIL
             FROM TEACHER_LOG tl
             JOIN TEACHER t ON tl.TEACHER_ID = t.TEACHER_ID
             ORDER BY tl.LOGIN_TIME DESC
             FETCH FIRST 10 ROWS ONLY`
        );

        res.render('pages/Admin/Dashboard', {
            stats,
            pendingTeachers: pendingTeachers.rows || [],
            questionLogs: questionLogs.rows || [],
            teacherLogs: teacherLogs.rows || [],
            adminName: req.session.userName || 'Administrator'
        });
    } catch (err) {
        console.error('Error loading admin dashboard:', err);
        res.status(500).send('Internal Server Error loading Admin Dashboard');
    }
});

/**
 * POST /admin/teachers/:id/approve
 * Approves a pending faculty member
 */
router.post('/teachers/:id/approve', async (req, res) => {
    try {
        const teacherId = parseInt(req.params.id, 10);
        const adminId = req.session.userId;

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `UPDATE TEACHER 
                 SET APPROVAL_STATUS = 1, APPROVED_BY = :adminId 
                 WHERE TEACHER_ID = :teacherId`,
                { adminId, teacherId }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ success: true, message: 'Faculty member approved successfully' });
        }
        res.redirect('/admin');
    } catch (err) {
        console.error('Error approving teacher:', err);
        res.status(500).json({ error: 'Failed to approve teacher' });
    }
});

/**
 * POST /admin/teachers/:id/reject
 * Rejects a pending faculty registration
 */
router.post('/teachers/:id/reject', async (req, res) => {
    try {
        const teacherId = parseInt(req.params.id, 10);

        await db.withTransaction(async (conn) => {
            await conn.execute(
                `DELETE FROM TEACHER WHERE TEACHER_ID = :teacherId AND APPROVAL_STATUS = 0`,
                { teacherId }
            );
        });

        if (req.headers.accept && req.headers.accept.includes('application/json')) {
            return res.status(200).json({ success: true, message: 'Faculty registration rejected' });
        }
        res.redirect('/admin');
    } catch (err) {
        console.error('Error rejecting teacher:', err);
        res.status(500).json({ error: 'Failed to reject teacher' });
    }
});

module.exports = router;
