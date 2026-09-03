# Modern Online Exam & Assessment Management System

An enterprise-grade, full-stack Academic Assessment and Coursework Management Platform engineered for **CSE 216: Database Systems Sessional**. Built with Node.js, Express, Oracle Database XE, PL/SQL, and modern Vanilla CSS responsive design.

---

## Key Features & System Architecture

### 1. Security & Role-Based Access Control (RBAC)
- **Bcrypt Password Encryption:** Passwords hashed with standard bcrypt salt rounds.
- **Transparent Legacy Account Upgrade:** Existing plaintext accounts automatically upgrade to bcrypt hashes upon first login.
- **Role Guards:** Strict middleware segregation (`requireStudent`, `requireTeacher`, `requireAdmin`) preventing unauthorized vertical or horizontal privilege escalation.
- **Faculty Approval Pipeline:** Newly registered instructors must be reviewed and approved by an administrator before gaining platform access.
- **Session Auditing:** All authentication events written to `STUDENT_LOG` and `TEACHER_LOG`.

### 2. Oracle PL/SQL Stored Procedures & Triggers
- **In-Database Auto-Grading (`EVALUATE_EXAM_SUBMISSION`):** Compiled Oracle PL/SQL stored procedure that evaluates student answers against question keys, computes question marks, updates answer records, and upserts participation scores.
- **DML Audit Trigger (`TRG_QUESTION_AUDIT`):** Automatically logs all `INSERT`, `UPDATE`, and `DELETE` operations on the `QUESTION` table into `QUESTION_LOG`.

### 3. Anti-Cheating Exam Proctoring Guard
- **Focus & Visibility Loss Detection:** Tracks `visibilitychange` (tab switches) and `blur` (window focus departures).
- **Escalating Warning System:** Live badge indicator (`Proctored: 0/3 violations`) and floating alert banners.
- **Automated Force-Submission:** Auto-locks and submits the exam on the 3rd violation.
- **Content Integrity:** Context menus, text selection, and clipboard copy/paste are disabled during exams.
- **Fullscreen Mode:** One-click distraction-free fullscreen assessment environment.

### 4. Admin Command Console (`/admin`)
- **System Metrics:** High-level counters for pending approvals, verified educators, active scholars, and exams.
- **Teacher Approval & Rejection:** Fast 1-click verification of pending instructor accounts.
- **Live Audit Trail:** Real-time log inspector for `QUESTION_LOG` and `TEACHER_LOG`.

### 5. Curriculum, Assessment & Analytics
- **Dynamic Question Sets:** Filter questions by subject, topic, and difficulty to assemble modular exam sets.
- **Exam Analytics:** Class averages, highest scores, lowest scores, submission rates, and question breakdown.
- **Student Topic Mastery:** Visual competency breakdown (Mastered &ge; 70%, Review Needed 50–69%, Needs Improvement < 50%) with direct links to targeted drills.
- **Coursework & Grading:** PDF assignment submission workflow with teacher grading and feedback.

---

## Tech Stack

- **Runtime & Backend:** Node.js (v20+), Express.js, EJS Templating
- **Database:** Oracle Database Express Edition (XE) via `oracledb`
- **Security:** `bcryptjs`, Express Session with signed cookies
- **Styling:** Modern Vanilla CSS Design System with CSS Custom Properties, Glassmorphism, and Material Icons

---

## Getting Started

### 1. Prerequisites
- Node.js (v18 or higher)
- Oracle Database (XE 11g/18c/21c) running locally

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/Mobasharul-Islam/Exam-Management-System.git
cd Exam-Management-System

# Install dependencies
npm install
```

### 3. Database Configuration
Edit `dbconfig.js` or set environment variables:
```javascript
module.exports = {
  user: process.env.NODE_ORACLEDB_USER || "c##mukdho",
  password: process.env.NODE_ORACLEDB_PASSWORD || "123",
  connectString: process.env.NODE_ORACLEDB_CONNECTIONSTRING || "localhost/xe"
};
```

### 4. Database Setup & PL/SQL Compilation
Run the automated migration and PL/SQL compiler:
```bash
# Initialize tables, sequences, sample data, and compile PL/SQL procedures & triggers
node scripts/setup_database.js
```

### 5. Start the Server
```bash
# Start production server on http://localhost:3000
npm start
```

---

## Verification & Testing

The system includes comprehensive automated testing:

```bash
# Run the 18-test end-to-end integration suite
node test_system.js

# Verify all 23 UI views and endpoints (returns HTTP 200)
node scripts/verify_ui_all.js
```

---

## Default Credentials for Testing

| Role | Email | Password | Admin |
| :--- | :--- | :--- | :--- |
| **Admin Faculty** | `mukdho.zaman@gmail.com` | `admin123456` | Yes |
| **Teacher** | `mukdho.zaman@gmail.com` | `123` | Yes |
| **Student** | `mobasharul.islam@gmail.com` | `123` | N/A |
