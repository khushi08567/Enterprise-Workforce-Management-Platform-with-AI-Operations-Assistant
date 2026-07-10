import sqlite3Package from 'sqlite3';
import path from 'path';

const sqlite3 = sqlite3Package.verbose();
const dbPath = path.resolve(import.meta.dirname, '../../database.sqlite');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to SQLite database:', err.message);
  } else {
    console.log('Connected to the SQLite database.');
  }
});

// Initialize database schema
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT, -- Nullable for OAuth accounts
      role TEXT NOT NULL, -- 'Employee', 'Admin', 'Super Admin'
      organization TEXT NOT NULL,
      login_attempts INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', -- 'active' or 'blocked'
      must_change_password INTEGER DEFAULT 0,
      google_id TEXT UNIQUE,
      linkedin_id TEXT UNIQUE,
      internship_end_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err.message);
    else {
      console.log('Users table ready.');
      // Alter table statements to dynamically patch existing databases
      db.run("ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0", [], (alterErr) => {});
      db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'", [], (alterErr) => {});
      db.run("ALTER TABLE users ADD COLUMN google_id TEXT", [], (alterErr) => {
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id)", [], () => {});
      });
      db.run("ALTER TABLE users ADD COLUMN linkedin_id TEXT", [], (alterErr) => {
        db.run("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_linkedin_id ON users(linkedin_id)", [], () => {});
      });
      db.run("ALTER TABLE users ADD COLUMN internship_end_date TEXT", [], (alterErr) => {});
      db.run("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0", [], (alterErr) => {
        db.get('SELECT COUNT(*) as count FROM users', [], (countErr, row) => {
          if (!countErr && row.count <= 2) {
            db.serialize(() => {
              db.run('DELETE FROM users');
              
              const defaultPasswordHash = '$2y$10$5KkQzH.2mB90L5WwT84S.OQf9WwR4u7m9E5r8N2O3P1Q0S1T2U3V4'; // "password123"
              const nextMonth = new Date();
              nextMonth.setDate(nextMonth.getDate() + 30);
              const pastDate = new Date();
              pastDate.setDate(pastDate.getDate() - 5);

              const usersList = [
                [1, 'System Admin', 'admin@wfm.com', defaultPasswordHash, 'Super Admin', 'MC', 'active', null],
                [2, 'Jane Doe', 'jane@wfm.com', defaultPasswordHash, 'Employee', 'ENG', 'active', null],
                [3, 'Alex Org Admin', 'orgadmin@wfm.com', defaultPasswordHash, 'Organization Admin', 'MC', 'active', null],
                [4, 'Sarah HR Manager', 'hr@wfm.com', defaultPasswordHash, 'HR Manager', 'HR', 'active', null],
                [5, 'Neha Finance Exec', 'finance@wfm.com', defaultPasswordHash, 'Finance Executive', 'FIN', 'active', null],
                [6, 'Kevin IT Admin', 'it@wfm.com', defaultPasswordHash, 'IT Administrator', 'IT', 'active', null],
                [7, 'Marcus Engineering Director', 'manager@wfm.com', defaultPasswordHash, 'Department Manager', 'ENG', 'active', null],
                [8, 'Priya Frontend Lead', 'lead@wfm.com', defaultPasswordHash, 'Team Lead', 'ENG', 'active', null],
                [9, 'Toby Auditor', 'auditor@wfm.com', defaultPasswordHash, 'Auditor', 'MC', 'active', null],
                [10, 'Leo Engineering Intern', 'intern.eng@wfm.com', defaultPasswordHash, 'Intern', 'ENG', 'active', nextMonth.toISOString().split('T')[0]],
                [11, 'Maya Marketing Intern', 'intern.mkt@wfm.com', defaultPasswordHash, 'Intern', 'MKT', 'active', pastDate.toISOString().split('T')[0]]
              ];

              for (const u of usersList) {
                db.run(
                  'INSERT INTO users (id, name, email, password_hash, role, organization, status, internship_end_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', 
                  u
                );
              }
              console.log('Rich demo users seeded successfully.');
            });
          }
        });
      });
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS organizations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      code TEXT UNIQUE,
      parent_id INTEGER, -- For hierarchy tree building
      manager_id INTEGER, -- Reference to user/employee id
      status TEXT DEFAULT 'Active', -- 'Active', 'Archived'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating organizations table:', err.message);
    else {
      console.log('Organizations table ready.');
      
      // Dynamic column patches for existing databases
      db.run("ALTER TABLE organizations ADD COLUMN code TEXT", [], (alterErr) => {
        db.run("ALTER TABLE organizations ADD COLUMN manager_id INTEGER", [], (alterErr1) => {
          db.run("ALTER TABLE organizations ADD COLUMN status TEXT DEFAULT 'Active'", [], (alterErr2) => {
            // Seed default root organization and full department tree
            db.get("SELECT COUNT(*) as count FROM organizations WHERE code = 'FE'", [], (countErr, row) => {
              if (!countErr && row.count === 0) {
                console.log('Seeding sub-departments and full department tree...');
                db.serialize(() => {
                  db.run('DELETE FROM organizations');
                  
                  // Root
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (1, 'Main Corp', 'MC', null, 'Active')");
                  
                  // Top-level departments
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (2, 'Engineering', 'ENG', 1, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (3, 'Marketing', 'MKT', 1, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (4, 'HR', 'HR', 1, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (5, 'Finance', 'FIN', 1, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (6, 'Sales', 'SALES', 1, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (7, 'IT / Support', 'IT', 1, 'Active')");

                  // Engineering sub-departments
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (8, 'Frontend', 'FE', 2, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (9, 'Backend', 'BE', 2, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (10, 'QA', 'QA', 2, 'Active')");
                  db.run("INSERT INTO organizations (id, name, code, parent_id, status) VALUES (11, 'DevOps', 'DEVOPS', 2, 'Active')");
                  
                  console.log('Organization departments seeded successfully.');
                });
              }
            });
          });
        });
      });
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS invites (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT NOT NULL UNIQUE,
      role TEXT NOT NULL,
      organization TEXT NOT NULL,
      created_by INTEGER,
      status TEXT NOT NULL DEFAULT 'active', -- 'active' or 'redeemed'
      redeemed_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating invites table:', err.message);
    else console.log('Invites table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      level INTEGER NOT NULL,
      permissions TEXT NOT NULL, -- JSON stringified array of permission strings
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating roles table:', err.message);
    else {
      console.log('Roles table ready.');
      // Seed default system roles if they don't exist, or if they need to be updated to the 10-role matrix
      db.get("SELECT COUNT(*) as count FROM roles WHERE name = 'Organization Admin'", [], (checkErr, checkRow) => {
        if (!checkErr && checkRow.count === 0) {
          console.log('Seeding full 10-role matrix...');
          db.serialize(() => {
            db.run('DELETE FROM roles');
            
            const rolesList = [
              {
                name: 'Super Admin',
                level: 100,
                permissions: ["*:*"]
              },
              {
                name: 'Organization Admin',
                level: 90,
                permissions: ["org:write", "department:write", "role:manage", "invite:generate", "org:read"]
              },
              {
                name: 'HR Manager',
                level: 70,
                permissions: ["employee:crud", "recruitment:crud", "attendance:crud", "leave:crud", "reports:department", "org:read"]
              },
              {
                name: 'Finance Executive',
                level: 70,
                permissions: ["payroll:crud", "payroll:read", "reports:payroll", "org:read"]
              },
              {
                name: 'IT Administrator',
                level: 70,
                permissions: ["asset:crud", "helpdesk:crud", "user:unblock", "password:reset", "org:read"]
              },
              {
                name: 'Department Manager',
                level: 60,
                permissions: ["attendance:approve", "leave:approve", "employee:read", "reports:department", "org:read"]
              },
              {
                name: 'Team Lead',
                level: 40,
                permissions: ["project:crud", "task:assign", "employee:read", "org:read"]
              },
              {
                name: 'Employee',
                level: 20,
                permissions: ["employee:self", "attendance:mark", "leave:apply", "helpdesk:raise", "task:self", "org:read"]
              },
              {
                name: 'Intern',
                level: 10,
                permissions: ["employee:self", "attendance:mark", "task:self", "helpdesk:raise", "org:read"]
              },
              {
                name: 'Auditor',
                level: 15,
                permissions: ["org:read", "employee:read", "attendance:read", "leave:read", "payroll:read", "reports:payroll", "reports:department", "asset:read", "helpdesk:read"]
              }
            ];

            for (const r of rolesList) {
              db.run(
                'INSERT INTO roles (name, level, permissions) VALUES (?, ?, ?)', 
                [r.name, r.level, JSON.stringify(r.permissions)]
              );
            }
            console.log('10-role matrix seeded successfully.');
          });
        }
      });
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS role_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      role_name TEXT NOT NULL,
      assigned_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating role_assignments table:', err.message);
    else console.log('Role assignments table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS role_delegations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      delegate_from_id INTEGER NOT NULL,
      delegate_to_id INTEGER NOT NULL,
      role_name TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT DEFAULT 'active', -- 'active', 'cancelled'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (delegate_from_id) REFERENCES users(id),
      FOREIGN KEY (delegate_to_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating role_delegations table:', err.message);
    else console.log('Role delegations table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS email_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      template TEXT NOT NULL,
      status TEXT DEFAULT 'sent',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating email_logs table:', err.message);
    else console.log('Email logs table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL,
      token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating password_resets table:', err.message);
    else console.log('Password resets table ready.');
  });

  // Create designations table
  db.run(`
    CREATE TABLE IF NOT EXISTS designations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      department_id INTEGER NOT NULL,
      level TEXT NOT NULL, -- 'Junior', 'Mid', 'Senior', 'Lead'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (department_id) REFERENCES organizations(id)
    )
  `, (err) => {
    if (err) console.error('Error creating designations table:', err.message);
    else {
      console.log('Designations table ready.');
      db.get('SELECT COUNT(*) as count FROM designations', [], (countErr, row) => {
        if (!countErr && row.count === 0) {
          db.run('INSERT INTO designations (title, department_id, level) VALUES (?, ?, ?)', ['Software Engineer II', 2, 'Mid']);
          db.run('INSERT INTO designations (title, department_id, level) VALUES (?, ?, ?)', ['Lead Product Designer', 3, 'Lead']);
        }
      });
    }
  });

  // Create office locations table
  db.run(`
    CREATE TABLE IF NOT EXISTS office_locations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      address TEXT NOT NULL,
      geo_lat REAL NOT NULL,
      geo_lng REAL NOT NULL,
      geo_radius_meters REAL NOT NULL DEFAULT 100,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating office_locations table:', err.message);
    else {
      console.log('Office locations table ready.');
      db.get('SELECT COUNT(*) as count FROM office_locations', [], (countErr, row) => {
        if (!countErr && row.count === 0) {
          db.run('INSERT INTO office_locations (name, address, geo_lat, geo_lng, geo_radius_meters) VALUES (?, ?, ?, ?, ?)', [
            'HQ Office', '123 Tech Boulevard, Silicon Valley', 37.7749, -122.4194, 200
          ]);
        }
      });
    }
  });

  // Create work shifts table
  db.run(`
    CREATE TABLE IF NOT EXISTS work_shifts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      grace_period_minutes INTEGER DEFAULT 15,
      organization_id INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )
  `, (err) => {
    if (err) console.error('Error creating work_shifts table:', err.message);
    else {
      console.log('Work shifts table ready.');
      db.get('SELECT COUNT(*) as count FROM work_shifts', [], (countErr, row) => {
        if (!countErr && row.count === 0) {
          db.run('INSERT INTO work_shifts (name, start_time, end_time, grace_period_minutes, organization_id) VALUES (?, ?, ?, ?, ?)', [
            'General Shift', '09:00', '18:00', 15, 2
          ]);
        }
      });
    }
  });

  // Create holidays table
  db.run(`
    CREATE TABLE IF NOT EXISTS holidays (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'National', 'Regional', 'Optional'
      organization_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (organization_id) REFERENCES organizations(id)
    )
  `, (err) => {
    if (err) console.error('Error creating holidays table:', err.message);
    else {
      console.log('Holidays table ready.');
      db.get('SELECT COUNT(*) as count FROM holidays', [], (countErr, row) => {
        if (!countErr && row.count === 0) {
          db.run('INSERT INTO holidays (date, name, type, organization_id) VALUES (?, ?, ?, ?)', ['2026-01-01', 'New Year\'s Day', 'National', null]);
          db.run('INSERT INTO holidays (date, name, type, organization_id) VALUES (?, ?, ?, ?)', ['2026-07-04', 'Independence Day', 'National', null]);
          db.run('INSERT INTO holidays (date, name, type, organization_id) VALUES (?, ?, ?, ?)', ['2026-12-25', 'Christmas Day', 'National', null]);
        }
      });
    }
  });

  // Create employees table
  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE,
      employee_id TEXT UNIQUE NOT NULL,
      mobile TEXT,
      address TEXT,
      gender TEXT,
      blood_group TEXT,
      dob TEXT,
      department_id INTEGER,
      designation_id INTEGER,
      office_location_id INTEGER,
      work_shift_id INTEGER,
      joining_date TEXT NOT NULL,
      reporting_manager_id INTEGER,
      employment_type TEXT DEFAULT 'Full-time',
      salary_grade TEXT,
      salary REAL,
      status TEXT DEFAULT 'Active', -- 'Active', 'Archived'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (department_id) REFERENCES organizations(id),
      FOREIGN KEY (designation_id) REFERENCES designations(id),
      FOREIGN KEY (office_location_id) REFERENCES office_locations(id),
      FOREIGN KEY (work_shift_id) REFERENCES work_shifts(id)
    )
  `, (err) => {
    if (err) console.error('Error creating employees table:', err.message);
    else {
      console.log('Employees table ready.');
      db.run("ALTER TABLE employees ADD COLUMN office_location_id INTEGER", [], (alterErr) => {});
      db.run("ALTER TABLE employees ADD COLUMN work_shift_id INTEGER", [], (alterErr) => {});
      db.all('SELECT * FROM users', [], (usersErr, usersList) => {
        if (!usersErr && usersList) {
          usersList.forEach(u => {
            db.get('SELECT id FROM employees WHERE user_id = ?', [u.id], (checkErr, checkRow) => {
              if (!checkErr && !checkRow) {
                let deptId = 2; // Default Engineering
                if (['Super Admin', 'Organization Admin', 'Auditor'].includes(u.role)) deptId = 1; // Main Corp
                else if (u.role === 'HR Manager') deptId = 4;
                else if (u.role === 'Finance Executive') deptId = 5;
                else if (u.role === 'IT Administrator') deptId = 7;
                else if (u.role === 'Intern' && u.email.includes('mkt')) deptId = 3; // Marketing Intern
                
                db.run(
                  `INSERT INTO employees (user_id, employee_id, mobile, address, gender, blood_group, dob, department_id, designation_id, joining_date, reporting_manager_id, employment_type, salary_grade, salary, status)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                  [
                    u.id, 
                    'EMP' + (1000 + u.id), 
                    '+155501' + String(u.id).padStart(2, '0'), 
                    'Corporate Headquarters, CA', 
                    'Male', 
                    'O+', 
                    '1992-04-18', 
                    deptId, 
                    1, 
                    '2026-01-01', 
                    1, 
                    u.role === 'Intern' ? 'Intern' : 'Full-time', 
                    'G3', 
                    85000.0, 
                    'Active'
                  ]
                );
              }
            });
          });
        }
      });
    }
  });

  // Create employee documents table
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      url TEXT NOT NULL,
      uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating employee_documents table:', err.message);
    else console.log('Employee documents table ready.');
  });

  // Create employee timeline events table
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_timeline_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      event_type TEXT NOT NULL, -- 'Joined', 'Promoted', 'Transferred', 'Exit'
      event_date TEXT NOT NULL,
      meta TEXT, -- JSON text
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating employee_timeline_events table:', err.message);
    else {
      console.log('Employee timeline events table ready.');
      db.get('SELECT COUNT(*) as count FROM employee_timeline_events', [], (countErr, row) => {
        if (!countErr && row.count === 0) {
          db.run('INSERT INTO employee_timeline_events (employee_id, event_type, event_date, meta) VALUES (?, ?, ?, ?)', [
            1, 'Joined', '2026-01-15', JSON.stringify({ role: 'Software Engineer II' })
          ]);
        }
      });
    }
  });

  // Create audit_logs table
  db.run(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating audit_logs table:', err.message);
    else console.log('Audit logs table ready.');
  });

  // Create Module 4 - Recruitment tables
  db.run(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      resume_url TEXT,
      skills TEXT,
      experience_years INTEGER,
      applied_for_designation_id INTEGER,
      source TEXT,
      status TEXT DEFAULT 'Applied',
      ai_score INTEGER DEFAULT NULL,
      ai_matched_skills TEXT DEFAULT NULL,
      ai_missing_skills TEXT DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (applied_for_designation_id) REFERENCES designations(id)
    )
  `, (err) => {
    if (err) console.error('Error creating candidates table:', err.message);
    else console.log('Candidates table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS interviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      interviewer_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      scheduled_at TEXT NOT NULL,
      feedback TEXT,
      rating INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id),
      FOREIGN KEY (interviewer_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating interviews table:', err.message);
    else console.log('Interviews table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS offers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      candidate_id INTEGER NOT NULL,
      proposed_salary REAL NOT NULL,
      proposed_joining_date TEXT NOT NULL,
      status TEXT DEFAULT 'Draft',
      approved_by_hr INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (candidate_id) REFERENCES candidates(id)
    )
  `, (err) => {
    if (err) console.error('Error creating offers table:', err.message);
    else console.log('Offers table ready.');
  });

  // Create Module 5 - Attendance tables
  db.run(`
    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      clock_in TEXT NOT NULL,
      clock_out TEXT,
      working_hours REAL,
      status TEXT NOT NULL,
      geo_location TEXT,
      method TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, date)
    )
  `, (err) => {
    if (err) console.error('Error creating attendance table:', err.message);
    else console.log('Attendance table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS attendance_corrections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      attendance_id INTEGER,
      employee_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      requested_clock_in TEXT NOT NULL,
      requested_clock_out TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'Pending',
      approved_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (attendance_id) REFERENCES attendance(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating attendance_corrections table:', err.message);
    else console.log('Attendance_corrections table ready.');
  });

  // Create Module 6 - Leave tables
  db.run(`
    CREATE TABLE IF NOT EXISTS leave_balances (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      max_days INTEGER NOT NULL,
      used_days INTEGER DEFAULT 0,
      year INTEGER NOT NULL,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, leave_type, year)
    )
  `, (err) => {
    if (err) console.error('Error creating leave_balances table:', err.message);
    else console.log('Leave_balances table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS leave_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      leave_type TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      reason TEXT,
      status TEXT DEFAULT 'Pending',
      approved_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (approved_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating leave_requests table:', err.message);
    else console.log('Leave_requests table ready.');
  });

  // Create Module 7 - Payroll table
  db.run(`
    CREATE TABLE IF NOT EXISTS payrolls (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      year INTEGER NOT NULL,
      basic_salary REAL NOT NULL,
      hra REAL NOT NULL,
      bonus REAL DEFAULT 0,
      overtime_pay REAL DEFAULT 0,
      pf REAL NOT NULL,
      professional_tax REAL NOT NULL,
      income_tax REAL NOT NULL,
      other_deductions REAL DEFAULT 0,
      net_salary REAL NOT NULL,
      status TEXT DEFAULT 'Draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, month, year)
    )
  `, (err) => {
    if (err) console.error('Error creating payrolls table:', err.message);
    else console.log('Payrolls table ready.');
  });

  // Create Module 8 - Performance tables
  db.run(`
    CREATE TABLE IF NOT EXISTS goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL,
      goal TEXT NOT NULL,
      kpi_target TEXT NOT NULL,
      self_rating REAL DEFAULT NULL,
      self_feedback TEXT DEFAULT NULL,
      manager_rating REAL DEFAULT NULL,
      manager_feedback TEXT DEFAULT NULL,
      status TEXT DEFAULT 'Open',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating goals table:', err.message);
    else console.log('Goals table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS performance_reviews (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      quarter TEXT NOT NULL,
      year INTEGER NOT NULL,
      kpi_score REAL NOT NULL,
      attendance_score REAL NOT NULL,
      self_rating REAL NOT NULL,
      manager_rating REAL NOT NULL,
      feedback TEXT,
      recommendation_promotion INTEGER DEFAULT 0,
      status TEXT DEFAULT 'Draft',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      UNIQUE(employee_id, quarter, year)
    )
  `, (err) => {
    if (err) console.error('Error creating performance_reviews table:', err.message);
    else console.log('Performance_reviews table ready.');
  });

  // Create Module 9 - Project Management tables
  db.run(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      owner_id INTEGER NOT NULL,
      status TEXT DEFAULT 'Planning', -- 'Planning', 'Active', 'Completed', 'On Hold'
      start_date TEXT,
      end_date TEXT,
      members TEXT, -- JSON string array of employee IDs
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (owner_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating projects table:', err.message);
    else console.log('Projects table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      project_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      assignee_id INTEGER,
      priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High'
      status TEXT DEFAULT 'To Do', -- 'To Do', 'In Progress', 'Review', 'Completed', 'Blocked'
      deadline TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (project_id) REFERENCES projects(id),
      FOREIGN KEY (assignee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating tasks table:', err.message);
    else console.log('Tasks table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS task_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating task_comments table:', err.message);
    else console.log('Task_comments table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS task_attachments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      file_name TEXT NOT NULL,
      file_url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    )
  `, (err) => {
    if (err) console.error('Error creating task_attachments table:', err.message);
    else console.log('Task_attachments table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS task_time_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      hours_logged REAL NOT NULL,
      date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating task_time_logs table:', err.message);
    else console.log('Task_time_logs table ready.');
  });

  // Create Module 10 - Asset Management tables
  db.run(`
    CREATE TABLE IF NOT EXISTS assets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- 'Laptop', 'Monitor', 'Phone', 'Furniture', 'Software License'
      asset_tag TEXT UNIQUE NOT NULL,
      serial_number TEXT,
      purchase_date TEXT,
      purchase_cost REAL,
      warranty_expiry TEXT,
      status TEXT DEFAULT 'Available', -- 'Available', 'Assigned', 'Under Repair', 'Retired'
      assigned_to INTEGER, -- REFERENCES employees(id)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (assigned_to) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating assets table:', err.message);
    else console.log('Assets table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS asset_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      asset_id INTEGER NOT NULL,
      employee_id INTEGER,
      action TEXT NOT NULL, -- 'Assign', 'Return', 'Repair'
      condition_note TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (asset_id) REFERENCES assets(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating asset_history table:', err.message);
    else console.log('Asset_history table ready.');
  });

  // Create Module 11 - Help Desk tables
  db.run(`
    CREATE TABLE IF NOT EXISTS tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      raised_by INTEGER NOT NULL, -- REFERENCES users(id)
      category TEXT NOT NULL, -- 'IT', 'HR', 'Facilities', 'Payroll', 'Other'
      subject TEXT NOT NULL,
      description TEXT,
      priority TEXT DEFAULT 'Medium', -- 'Low', 'Medium', 'High', 'Urgent'
      status TEXT DEFAULT 'Open', -- 'Open', 'In Progress', 'Resolved', 'Closed'
      assigned_to INTEGER, -- REFERENCES users(id)
      linked_asset_id INTEGER, -- REFERENCES assets(id)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (raised_by) REFERENCES users(id),
      FOREIGN KEY (assigned_to) REFERENCES users(id),
      FOREIGN KEY (linked_asset_id) REFERENCES assets(id)
    )
  `, (err) => {
    if (err) console.error('Error creating tickets table:', err.message);
    else console.log('Tickets table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS ticket_comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ticket_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      comment TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (ticket_id) REFERENCES tickets(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating ticket_comments table:', err.message);
    else console.log('Ticket_comments table ready.');
  });

  // Create Module 12 - Document Management tables
  db.run(`
    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      category TEXT NOT NULL, -- 'Policy', 'Template', 'Handbook', 'Legal', 'Other'
      file_url TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL, -- REFERENCES users(id)
      version TEXT DEFAULT '1.0',
      visibility TEXT DEFAULT 'org-wide', -- 'org-wide', 'department-specific', 'role-restricted'
      target_id TEXT, -- departmentId (int) or roleName (text)
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating documents table:', err.message);
    else console.log('Documents table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS document_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      version TEXT NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_by INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (document_id) REFERENCES documents(id),
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating document_versions table:', err.message);
    else console.log('Document_versions table ready.');
  });

  // Create Module 13 - Notifications tables
  db.run(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link_to TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating notifications table:', err.message);
    else console.log('Notifications table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS notification_preferences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER UNIQUE NOT NULL,
      email_enabled INTEGER DEFAULT 1,
      in_app_enabled INTEGER DEFAULT 1,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating notification_preferences table:', err.message);
    else console.log('Notification_preferences table ready.');
  });

  // Create Module 15 - AI Operations Assistant tables
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating ai_conversations table:', err.message);
    else console.log('Ai_conversations table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      role TEXT NOT NULL, -- 'user' or 'assistant'
      content TEXT NOT NULL,
      structured_data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES ai_conversations(id)
    )
  `, (err) => {
    if (err) console.error('Error creating ai_messages table:', err.message);
    else console.log('Ai_messages table ready.');
  });

  // =========================================================================
  // ENHANCEMENTS TABLES (ENH-01 to ENH-10)
  // =========================================================================

  // 1. Agentic AI Table
  db.run(`
    CREATE TABLE IF NOT EXISTS agent_actions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending_approval',
      trigger_event TEXT NOT NULL,
      proposed_changes TEXT NOT NULL, -- JSON
      requested_by TEXT,
      approved_by TEXT,
      executed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      audit_trail TEXT -- JSON array
    )
  `, (err) => {
    if (err) console.error('Error creating agent_actions table:', err.message);
    else console.log('Agent_actions table ready.');
  });

  // 2. Skills & Talent Marketplace Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      skill_name TEXT UNIQUE NOT NULL,
      category TEXT NOT NULL,
      normalized_name TEXT UNIQUE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating skills table:', err.message);
    else console.log('Skills table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS employee_skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      proficiency INTEGER NOT NULL, -- 1-5
      source TEXT DEFAULT 'self_assessed',
      endorsed_by TEXT, -- JSON array of employeeIds
      projects_applied INTEGER DEFAULT 0,
      last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id),
      FOREIGN KEY (skill_id) REFERENCES skills(id),
      UNIQUE(employee_id, skill_id)
    )
  `, (err) => {
    if (err) console.error('Error creating employee_skills table:', err.message);
    else console.log('Employee_skills table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS skill_gaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      department_id INTEGER NOT NULL,
      required_skill_id INTEGER NOT NULL,
      required_proficiency INTEGER NOT NULL,
      current_coverage REAL DEFAULT 0,
      risk_level TEXT DEFAULT 'Low',
      projected_deadline DATE,
      FOREIGN KEY (department_id) REFERENCES organizations(id),
      FOREIGN KEY (required_skill_id) REFERENCES skills(id)
    )
  `, (err) => {
    if (err) console.error('Error creating skill_gaps table:', err.message);
    else console.log('Skill_gaps table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS gig_marketplace (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      required_skills TEXT NOT NULL, -- JSON array of { skillId, minProficiency }
      estimated_hours REAL NOT NULL,
      posted_by INTEGER NOT NULL,
      department_id INTEGER,
      bids TEXT, -- JSON array of { employeeId, proposedHours, message, bidDate }
      assigned_to INTEGER,
      status TEXT DEFAULT 'open', -- 'open', 'assigned', 'closed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (posted_by) REFERENCES employees(id),
      FOREIGN KEY (assigned_to) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating gig_marketplace table:', err.message);
    else console.log('Gig_marketplace table ready.');
  });

  // 3. Predictive Analytics Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS employee_risk_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER UNIQUE NOT NULL,
      attrition_risk_score REAL DEFAULT 0,
      risk_factors TEXT, -- JSON array of factors
      last_calculated DATETIME DEFAULT CURRENT_TIMESTAMP,
      trend TEXT DEFAULT 'stable',
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating employee_risk_profiles table:', err.message);
    else console.log('Employee_risk_profiles table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS what_if_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_name TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      scenario_type TEXT NOT NULL,
      variables TEXT NOT NULL, -- JSON
      projected_outcomes TEXT NOT NULL, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating what_if_scenarios table:', err.message);
    else console.log('What_if_scenarios table ready.');
  });

  // 4. Hybrid Work Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS office_floors (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      floor_name TEXT NOT NULL,
      location_id INTEGER NOT NULL,
      desks TEXT NOT NULL, -- JSON array
      FOREIGN KEY (location_id) REFERENCES office_locations(id)
    )
  `, (err) => {
    if (err) console.error('Error creating office_floors table:', err.message);
    else console.log('Office_floors table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS desk_bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      desk_id TEXT NOT NULL,
      date DATE NOT NULL,
      clock_in TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating desk_bookings table:', err.message);
    else console.log('Desk_bookings table ready.');
  });

  // 5. Nudge Engine Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS nudge_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nudge_type TEXT UNIQUE NOT NULL,
      trigger_condition TEXT NOT NULL, -- JSON
      cooldown_hours INTEGER DEFAULT 24,
      action_buttons TEXT NOT NULL, -- JSON
      target_roles TEXT NOT NULL, -- JSON array
      is_active INTEGER DEFAULT 1
    )
  `, (err) => {
    if (err) console.error('Error creating nudge_rules table:', err.message);
    else console.log('Nudge_rules table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS nudges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER NOT NULL,
      nudge_type TEXT NOT NULL,
      message TEXT NOT NULL,
      action_buttons TEXT, -- JSON
      status TEXT DEFAULT 'unread', -- 'unread', 'read', 'action_taken', 'dismissed'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      expires_at DATETIME,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating nudges table:', err.message);
    else console.log('Nudges table ready.');
  });

  // 6. Explainable AI Table
  db.run(`
    CREATE TABLE IF NOT EXISTS ai_decisions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      decision_type TEXT NOT NULL,
      target_id TEXT NOT NULL,
      recommendation TEXT NOT NULL,
      confidence REAL DEFAULT 0,
      factors TEXT NOT NULL, -- JSON
      human_override TEXT, -- JSON
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating ai_decisions table:', err.message);
    else console.log('Ai_decisions table ready.');
  });

  // 7. Gamification Tables
  db.run(`
    CREATE TABLE IF NOT EXISTS gamification_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      employee_id INTEGER UNIQUE NOT NULL,
      level INTEGER DEFAULT 1,
      total_xp INTEGER DEFAULT 0,
      badges TEXT, -- JSON array
      streaks TEXT, -- JSON
      kudos_received INTEGER DEFAULT 0,
      kudos_given INTEGER DEFAULT 0,
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating gamification_profiles table:', err.message);
    else console.log('Gamification_profiles table ready.');
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS kudos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_employee_id INTEGER NOT NULL,
      to_employee_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      points INTEGER DEFAULT 10,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (from_employee_id) REFERENCES employees(id),
      FOREIGN KEY (to_employee_id) REFERENCES employees(id)
    )
  `, (err) => {
    if (err) console.error('Error creating kudos table:', err.message);
    else console.log('Kudos table ready.');
  });

  // 8. Scenario Org Planning Table
  db.run(`
    CREATE TABLE IF NOT EXISTS org_scenarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      scenario_name TEXT NOT NULL,
      created_by INTEGER NOT NULL,
      changes TEXT NOT NULL, -- JSON
      projected_impact TEXT, -- JSON
      is_active INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )
  `, (err) => {
    if (err) console.error('Error creating org_scenarios table:', err.message);
    else console.log('Org_scenarios table ready.');
  });
});

// Promise-based helper functions
const dbRun = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve({ id: this.lastID, changes: this.changes });
    });
  });
};

const dbGet = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const dbAll = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

export {
  db,
  dbRun,
  dbGet,
  dbAll
};
