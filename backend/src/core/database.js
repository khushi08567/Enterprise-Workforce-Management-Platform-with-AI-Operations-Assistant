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
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL, -- 'Employee', 'Admin', 'Super Admin'
      organization TEXT NOT NULL,
      login_attempts INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', -- 'active' or 'blocked'
      must_change_password INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) console.error('Error creating users table:', err.message);
    else {
      console.log('Users table ready.');
      // Alter table statements to dynamically patch existing databases
      db.run("ALTER TABLE users ADD COLUMN login_attempts INTEGER DEFAULT 0", [], (alterErr) => {});
      db.run("ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'active'", [], (alterErr) => {});
      db.run("ALTER TABLE users ADD COLUMN must_change_password INTEGER DEFAULT 0", [], (alterErr) => {
        db.get('SELECT COUNT(*) as count FROM users', [], (countErr, row) => {
          if (!countErr && row.count === 0) {
            db.run('INSERT INTO users (id, name, email, password_hash, role, organization, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
              1, 'System Admin', 'admin@wfm.com', '$2y$10$5KkQzH.2mB90L5WwT84S.OQf9WwR4u7m9E5r8N2O3P1Q0S1T2U3V4', 'Super Admin', 'MC', 'active'
            ]);
            db.run('INSERT INTO users (id, name, email, password_hash, role, organization, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [
              2, 'Jane Doe', 'jane@wfm.com', '$2y$10$5KkQzH.2mB90L5WwT84S.OQf9WwR4u7m9E5r8N2O3P1Q0S1T2U3V4', 'Employee', 'ENG', 'active'
            ]);
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
            // Seed default root organization if none exist
            db.get('SELECT COUNT(*) as count FROM organizations', [], (countErr, row) => {
              if (!countErr && row.count === 0) {
                db.run('INSERT INTO organizations (name, code, parent_id, status) VALUES (?, ?, ?, ?)', ['Main Corp', 'MC', null, 'Active']);
                db.run('INSERT INTO organizations (name, code, parent_id, status) VALUES (?, ?, ?, ?)', ['Engineering', 'ENG', 1, 'Active']);
                db.run('INSERT INTO organizations (name, code, parent_id, status) VALUES (?, ?, ?, ?)', ['Marketing', 'MKT', 1, 'Active']);
              } else {
                // Update existing seed nodes to ensure they have default codes
                db.run("UPDATE organizations SET code = 'MC' WHERE id = 1 AND code IS NULL");
                db.run("UPDATE organizations SET code = 'ENG' WHERE id = 2 AND code IS NULL");
                db.run("UPDATE organizations SET code = 'MKT' WHERE id = 3 AND code IS NULL");
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
      // Seed default system roles if they don't exist
      db.get('SELECT COUNT(*) as count FROM roles', [], (countErr, row) => {
        if (!countErr && row.count === 0) {
          const superAdminPerms = JSON.stringify(["org:read", "org:write", "invite:generate", "role:manage", "user:unblock"]);
          const adminPerms = JSON.stringify(["org:read", "org:write", "invite:generate", "user:unblock"]);
          const employeePerms = JSON.stringify(["org:read"]);

          db.run('INSERT INTO roles (name, level, permissions) VALUES (?, ?, ?)', ['Super Admin', 100, superAdminPerms]);
          db.run('INSERT INTO roles (name, level, permissions) VALUES (?, ?, ?)', ['Admin', 50, adminPerms]);
          db.run('INSERT INTO roles (name, level, permissions) VALUES (?, ?, ?)', ['Employee', 10, employeePerms]);
          console.log('Default roles seeded successfully.');
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
      db.get('SELECT COUNT(*) as count FROM employees', [], (countErr, row) => {
        if (!countErr && row.count === 0) {
          db.run('INSERT INTO employees (user_id, employee_id, mobile, address, gender, blood_group, dob, department_id, designation_id, joining_date, reporting_manager_id, employment_type, salary_grade, salary, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
            2, 'EMP1002', '+15550199', '456 Oak Ave, San Francisco', 'Female', 'O+', '1998-05-12', 2, 1, '2026-01-15', 1, 'Full-time', 'G4', 95000.0, 'Active'
          ]);
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
