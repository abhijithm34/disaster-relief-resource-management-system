require('dotenv').config();

const express = require('express');
const cors = require('cors');
const db = require('./db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';
const revokedTokens = new Map();

if (!JWT_SECRET) {
  throw new Error('JWT_SECRET must be configured before starting the API.');
}

const corsOptions = {
  origin: (origin, callback) => {
    const allowed = [
      process.env.FRONTEND_URL,
      'http://localhost:5173',
      'http://localhost:4173',
    ].filter(Boolean);

    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.json());

const authenticateToken = (req, res, next) => {
  const publicRoutes = new Set(['/health', '/login', '/register']);
  if (publicRoutes.has(req.path)) return next();

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ error: 'Authentication token is required.' });
  }

  if (revokedTokens.has(token)) {
    return res.status(401).json({ error: 'This session has been logged out.' });
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired authentication token.' });
  }
};

const authorizeRoles = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: 'You are not authorized to access this resource.' });
  }
  next();
};

app.use(authenticateToken);
app.use((req, res, next) => {
  if (['/health', '/login', '/register'].includes(req.path)) return next();

  const isAdminOnly =
    req.path === '/users' ||
    req.path === '/admin/requests' ||
    req.path === '/audit_log' ||
    req.path === '/resource_audit_log' ||
    req.path === '/requests' ||
    (['POST', 'PUT', 'DELETE'].includes(req.method) &&
      ['/locations', '/resources', '/shelters'].some((path) => req.path.startsWith(path)));

  if (isAdminOnly) return authorizeRoles('admin')(req, res, next);
  if (req.path.startsWith('/volunteers')) return authorizeRoles('volunteer')(req, res, next);
  if (req.path === '/my-requests' || req.path === '/user/requests') {
    return authorizeRoles('citizen')(req, res, next);
  }
  next();
});


// =====================================================
// HEALTH
// =====================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});


// =====================================================
// LOCATIONS
// =====================================================

app.get('/locations', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM locations'
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

const WEATHER_ALERTS = [
  'none',
  'yellow',
  'orange',
  'red'
];

app.post('/locations', async (req, res) => {
  const {
    name,
    region,
    latitude,
    longitude,
    weather_condition,
    weather_alert
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      error: 'Location name is required.'
    });
  }

  if (weather_alert && !WEATHER_ALERTS.includes(weather_alert)) {
    return res.status(400).json({
      error: 'Invalid weather alert level.'
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO locations
       (name, region, latitude, longitude, weather_condition, weather_alert)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        name.trim(),
        region?.trim() || null,
        latitude ?? null,
        longitude ?? null,
        weather_condition?.trim() || null,
        weather_alert || 'none'
      ]
    );

    res.status(201).json({
      message: 'Location created successfully',
      id: result.insertId
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to create location.'
    });
  }
});

app.put('/locations/:id', async (req, res) => {
  const locationId = req.params.id;
  const {
    name,
    region,
    latitude,
    longitude,
    weather_condition,
    weather_alert
  } = req.body;

  if (!name?.trim()) {
    return res.status(400).json({
      error: 'Location name is required.'
    });
  }

  if (weather_alert && !WEATHER_ALERTS.includes(weather_alert)) {
    return res.status(400).json({
      error: 'Invalid weather alert level.'
    });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM locations WHERE id = ?',
      [locationId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Location not found.'
      });
    }

    await db.query(
      `UPDATE locations
       SET name = ?,
           region = ?,
           latitude = ?,
           longitude = ?,
           weather_condition = ?,
           weather_alert = ?
       WHERE id = ?`,
      [
        name.trim(),
        region?.trim() || null,
        latitude ?? null,
        longitude ?? null,
        weather_condition?.trim() || null,
        weather_alert || 'none',
        locationId
      ]
    );

    res.json({
      message: 'Location updated successfully'
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to update location.'
    });
  }
});

app.delete('/locations/:id', async (req, res) => {
  const locationId = req.params.id;

  try {
    const [existing] = await db.query(
      'SELECT id FROM locations WHERE id = ?',
      [locationId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Location not found.'
      });
    }

    await db.query(
      'DELETE FROM locations WHERE id = ?',
      [locationId]
    );

    res.json({
      message: 'Location deleted successfully'
    });

  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error:
          'Cannot delete location linked to resources, shelters, or requests.'
      });
    }

    res.status(500).json({
      error: 'Failed to delete location.'
    });
  }
});


// =====================================================
// USERS
// =====================================================

app.get('/users', async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, username, email, role, contact_number FROM users'
    );

    res.json(users);
  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});


// =====================================================
// LOGIN
// =====================================================

app.post('/login', async (req, res) => {
  const { email, password, role } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({
      error: 'Email, password, and role are required.'
    });
  }

  try {
    const [users] = await db.query(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({
        error: 'User not found.'
      });
    }

    const user = users[0];

    // Support existing plaintext accounts once, then upgrade them on a successful login.
    const isBcryptHash = user.password?.startsWith('$2');
    const passwordMatches = isBcryptHash
      ? await bcrypt.compare(password, user.password)
      : password === user.password;

    if (!passwordMatches) {
      return res.status(401).json({
        error: 'Invalid password.'
      });
    }

    if (user.role.toLowerCase() !== role.toLowerCase()) {
      return res.status(403).json({
        error: `User is not authorized as ${role}.`
      });
    }

    if (!isBcryptHash) {
      const passwordHash = await bcrypt.hash(password, 12);
      await db.query('UPDATE users SET password = ? WHERE id = ?', [passwordHash, user.id]);
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role.toLowerCase() },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });

  } catch (err) {
    res.status(500).json({
      error: 'Internal server error.'
    });
  }
});


// =====================================================
// REGISTRATION
// =====================================================

const ALLOWED_ROLES = [
  'admin',
  'volunteer',
  'citizen'
];

app.post('/register', async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      role,
      contact_number
    } = req.body;

    if (!ALLOWED_ROLES.includes(role?.toLowerCase())) {
      return res.status(400).json({
        error:
          'Invalid role. Allowed roles: admin, volunteer, citizen.'
      });
    }

    if (!username?.trim() || !email?.trim() || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [result] = await db.query(
      `INSERT INTO users
       (username, password, email, role, contact_number)
       VALUES (?, ?, ?, ?, ?)`,
      [
        username,
        passwordHash,
        email.trim().toLowerCase(),
        role.toLowerCase(),
        contact_number || null
      ]
    );

    res.status(200).json({
      message: 'Registration successful'
    });

  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});


// =====================================================
// VOLUNTEER REQUESTS
// =====================================================

app.get('/volunteers/requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT
        r.id AS request_id,
        u.username AS citizen,
        l.name AS location,
        res.name AS resource,
        r.quantity_requested,
        r.status,
        r.remarks
      FROM requests r
      JOIN users u
        ON r.user_id = u.id
      JOIN resources res
        ON r.resource_id = res.id
      JOIN locations l
        ON r.location_id = l.id
      WHERE r.status = 'pending'
    `);

    res.json(requests);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch help requests'
    });
  }
});


// =====================================================
// VOLUNTEER RESOURCES
// =====================================================

app.get('/volunteers/resources', async (req, res) => {
  try {
    const [resources] = await db.query(`
      SELECT
        r.id,
        r.name,
        r.type,
        r.quantity,
        r.unit,
        l.name AS location
      FROM resources r
      JOIN locations l
        ON r.location_id = l.id
    `);

    res.json(resources);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch resources'
    });
  }
});


// =====================================================
// ASSIGN TASK TO VOLUNTEER
// =====================================================

app.post('/volunteers/assign-task', async (req, res) => {
  const {
    volunteer_id,
    request_id
  } = req.body;

  if (!volunteer_id || !request_id) {
    return res.status(400).json({
      error: 'Volunteer ID and Request ID are required.'
    });
  }

  if (Number(volunteer_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only assign tasks to yourself.' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    // Check volunteer
    const [volunteers] = await connection.query(
      `SELECT id
       FROM users
       WHERE id = ?
       AND role = ?`,
      [
        volunteer_id,
        'volunteer'
      ]
    );

    if (volunteers.length === 0) {
      await connection.rollback();

      return res.status(400).json({
        error: 'Invalid volunteer.'
      });
    }

    // Check request
    const [requests] = await connection.query(
      `SELECT id, status
       FROM requests
       WHERE id = ?
       FOR UPDATE`,
      [request_id]
    );

    if (requests.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Request not found.'
      });
    }

    if (requests[0].status !== 'pending') {
      await connection.rollback();

      return res.status(400).json({
        error: 'Request is no longer pending.'
      });
    }

    // Update request
    await connection.query(
      `UPDATE requests
       SET status = ?
       WHERE id = ?`,
      [
        'assigned',
        request_id
      ]
    );

    // Create volunteer task
    await connection.query(
      `INSERT INTO volunteer_requests
       (volunteer_id, request_id, status)
       VALUES (?, ?, ?)`,
      [
        volunteer_id,
        request_id,
        'assigned'
      ]
    );

    // Audit log
    await connection.query(
      `INSERT INTO audit_log
       (action, performed_by)
       VALUES (?, ?)`,
      [
        `Volunteer ${volunteer_id} assigned to request ${request_id}`,
        volunteer_id
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message: 'Task assigned successfully'
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      error: 'Failed to assign task'
    });

  } finally {

    if (connection) {
      connection.release();
    }
  }
});


// =====================================================
// VOLUNTEER LOCATIONS
// =====================================================

app.get('/volunteers/locations', async (req, res) => {
  try {
    const [locations] = await db.query(
      'SELECT * FROM locations'
    );

    res.json(locations);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch locations'
    });
  }
});


// =====================================================
// ADMIN REQUESTS
// =====================================================

app.get('/admin/requests', async (req, res) => {
  try {
    const [requests] = await db.query(`
      SELECT
        r.id AS request_id,
        u.username AS citizen,
        l.name AS location,
        res.name AS resource,
        r.quantity_requested,
        r.status,
        r.remarks,
        vu.username AS volunteer
      FROM requests r
      JOIN users u
        ON r.user_id = u.id
      JOIN resources res
        ON r.resource_id = res.id
      JOIN locations l
        ON r.location_id = l.id
      LEFT JOIN volunteer_requests vr
        ON vr.request_id = r.id
      LEFT JOIN users vu
        ON vu.id = vr.volunteer_id
    `);

    res.json(requests);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch admin requests'
    });
  }
});


// =====================================================
// MY REQUESTS
// =====================================================

app.get('/my-requests', async (req, res) => {
  const user_id = req.user.id;

  try {
    const [rows] = await db.query(
      `SELECT
        r.id,
        r.status,
        r.quantity_requested,
        r.remarks,
        res.name AS resource,
        l.name AS location
       FROM requests r
       JOIN resources res
         ON r.resource_id = res.id
       JOIN locations l
         ON r.location_id = l.id
       WHERE r.user_id = ?`,
      [user_id]
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch your requests'
    });
  }
});


// =====================================================
// PROFILE
// =====================================================

app.get('/profile/:id', async (req, res) => {
  const userId = req.params.id;

  if (req.user.role !== 'admin' && Number(userId) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only view your own profile.' });
  }

  try {
    const [users] = await db.query(
      `SELECT
        username,
        email,
        contact_number
       FROM users
       WHERE id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    res.json(users[0]);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch profile'
    });
  }
});


// =====================================================
// UPDATE PROFILE
// =====================================================

app.put('/profile/:id', async (req, res) => {
  const userId = req.params.id;

  if (req.user.role !== 'admin' && Number(userId) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only update your own profile.' });
  }

  const {
    username,
    email,
    contact_number
  } = req.body;

  try {
    await db.query(
      `UPDATE users
       SET username = ?,
           email = ?,
           contact_number = ?
       WHERE id = ?`,
      [
        username,
        email,
        contact_number,
        userId
      ]
    );

    res.json({
      message: 'Profile updated successfully'
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to update profile'
    });
  }
});


// =====================================================
// CREATE USER REQUEST
// =====================================================

app.post('/user/requests', async (req, res) => {
  const {
    resource_id,
    location_id,
    quantity_requested,
    remarks
  } = req.body;

  const user_id = req.user.id;

  try {
    await db.query(
      `INSERT INTO requests
       (
         user_id,
         resource_id,
         quantity_requested,
         location_id,
         status,
         remarks
       )
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        resource_id,
        quantity_requested,
        location_id,
        'pending',
        remarks
      ]
    );

    res.status(201).json({
      message: 'Request submitted successfully.'
    });

  } catch (err) {
    res.status(500).json({
      error: 'Database error.'
    });
  }
});


// =====================================================
// RESOURCES
// =====================================================

app.get('/resources', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        r.*,
        l.name AS location_name
      FROM resources r
      LEFT JOIN locations l
        ON r.location_id = l.id
    `);

    res.json(rows);

  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

const RESOURCE_TYPES = [
  'food',
  'water',
  'medical',
  'clothing',
  'other'
];

app.post('/resources', async (req, res) => {
  const {
    name,
    type,
    quantity,
    unit,
    location_id
  } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      error: 'Name and type are required.'
    });
  }

  if (!RESOURCE_TYPES.includes(type)) {
    return res.status(400).json({
      error: 'Invalid resource type.'
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO resources
       (name, type, quantity, unit, location_id)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        type,
        quantity ?? 0,
        unit || null,
        location_id || null
      ]
    );

    res.status(201).json({
      message: 'Resource created successfully',
      id: result.insertId
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to create resource.'
    });
  }
});

app.put('/resources/:id', async (req, res) => {
  const resourceId = req.params.id;
  const {
    name,
    type,
    quantity,
    unit,
    location_id
  } = req.body;

  if (!name || !type) {
    return res.status(400).json({
      error: 'Name and type are required.'
    });
  }

  if (!RESOURCE_TYPES.includes(type)) {
    return res.status(400).json({
      error: 'Invalid resource type.'
    });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM resources WHERE id = ?',
      [resourceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Resource not found.'
      });
    }

    await db.query(
      `UPDATE resources
       SET name = ?,
           type = ?,
           quantity = ?,
           unit = ?,
           location_id = ?
       WHERE id = ?`,
      [
        name,
        type,
        quantity ?? 0,
        unit || null,
        location_id || null,
        resourceId
      ]
    );

    res.json({
      message: 'Resource updated successfully'
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to update resource.'
    });
  }
});

app.delete('/resources/:id', async (req, res) => {
  const resourceId = req.params.id;

  try {
    const [existing] = await db.query(
      'SELECT id FROM resources WHERE id = ?',
      [resourceId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Resource not found.'
      });
    }

    await db.query(
      'DELETE FROM resources WHERE id = ?',
      [resourceId]
    );

    res.json({
      message: 'Resource deleted successfully'
    });

  } catch (err) {
    if (err.code === 'ER_ROW_IS_REFERENCED_2') {
      return res.status(400).json({
        error:
          'Cannot delete resource that is linked to existing requests.'
      });
    }

    res.status(500).json({
      error: 'Failed to delete resource.'
    });
  }
});


// =====================================================
// SHELTERS
// =====================================================

app.get('/shelters', async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT
        S.id,
        S.name,
        S.location_id,
        l.name AS Location,
        S.capacity,
        S.current_occupancy,
        S.contact_number
      FROM shelters S
      JOIN locations l
        ON S.location_id = l.id
    `);

    res.json(rows);

  } catch (err) {
    res.status(500).json({
      error: 'Internal Server Error'
    });
  }
});

app.post('/shelters', async (req, res) => {
  const {
    name,
    location_id,
    capacity,
    current_occupancy,
    contact_number
  } = req.body;

  if (!name || !location_id) {
    return res.status(400).json({
      error: 'Name and location are required.'
    });
  }

  try {
    const [result] = await db.query(
      `INSERT INTO shelters
       (name, location_id, capacity, current_occupancy, contact_number)
       VALUES (?, ?, ?, ?, ?)`,
      [
        name,
        location_id,
        capacity ?? 0,
        current_occupancy ?? 0,
        contact_number || null
      ]
    );

    res.status(201).json({
      message: 'Shelter created successfully',
      id: result.insertId
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to create shelter.'
    });
  }
});

app.put('/shelters/:id', async (req, res) => {
  const shelterId = req.params.id;
  const {
    name,
    location_id,
    capacity,
    current_occupancy,
    contact_number
  } = req.body;

  if (!name || !location_id) {
    return res.status(400).json({
      error: 'Name and location are required.'
    });
  }

  if (
    current_occupancy != null &&
    capacity != null &&
    Number(current_occupancy) > Number(capacity)
  ) {
    return res.status(400).json({
      error: 'Occupancy cannot exceed capacity.'
    });
  }

  try {
    const [existing] = await db.query(
      'SELECT id FROM shelters WHERE id = ?',
      [shelterId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Shelter not found.'
      });
    }

    await db.query(
      `UPDATE shelters
       SET name = ?,
           location_id = ?,
           capacity = ?,
           current_occupancy = ?,
           contact_number = ?
       WHERE id = ?`,
      [
        name,
        location_id,
        capacity ?? 0,
        current_occupancy ?? 0,
        contact_number || null,
        shelterId
      ]
    );

    res.json({
      message: 'Shelter updated successfully'
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to update shelter.'
    });
  }
});

app.delete('/shelters/:id', async (req, res) => {
  const shelterId = req.params.id;

  try {
    const [existing] = await db.query(
      'SELECT id FROM shelters WHERE id = ?',
      [shelterId]
    );

    if (existing.length === 0) {
      return res.status(404).json({
        error: 'Shelter not found.'
      });
    }

    await db.query(
      'DELETE FROM shelters WHERE id = ?',
      [shelterId]
    );

    res.json({
      message: 'Shelter deleted successfully'
    });

  } catch (err) {
    res.status(500).json({
      error: 'Failed to delete shelter.'
    });
  }
});


// =====================================================
// VOLUNTEER MY TASKS
// =====================================================

app.get('/volunteers/my-tasks', async (req, res) => {
  const volunteer_id = req.user.id;

  try {
    const [tasks] = await db.query(
      `
      SELECT
        vr.id,
        vr.request_id,
        vr.status,
        vr.assigned_at,
        vr.completed_at,
        r.user_id AS citizen_id,
        u.username AS citizen,
        res.name AS resource,
        r.quantity_requested,
        l.name AS location,
        r.remarks
      FROM volunteer_requests vr
      JOIN requests r
        ON vr.request_id = r.id
      JOIN users u
        ON r.user_id = u.id
      JOIN resources res
        ON r.resource_id = res.id
      JOIN locations l
        ON r.location_id = l.id
      WHERE vr.volunteer_id = ?
      `,
      [volunteer_id]
    );

    res.json(tasks);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch tasks'
    });
  }
});


// =====================================================
// ALL VOLUNTEER REQUESTS
// =====================================================

app.get('/volunteers/all-requests', async (req, res) => {
  try {
    const [requests] = await db.query(
      `
      SELECT
        r.id AS request_id,
        u.username AS citizen,
        l.name AS location,
        res.name AS resource,
        r.quantity_requested,
        r.status,
        r.remarks,
        r.request_time
      FROM requests r
      JOIN users u
        ON r.user_id = u.id
      JOIN resources res
        ON r.resource_id = res.id
      JOIN locations l
        ON r.location_id = l.id
      WHERE r.status = 'pending'
      `
    );

    res.json(requests);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch all requests'
    });
  }
});


// =====================================================
// COMPLETE VOLUNTEER TASK
// =====================================================

app.post('/volunteers/complete-task', async (req, res) => {
  const {
    request_id,
    volunteer_id
  } = req.body;

  if (!request_id || !volunteer_id) {
    return res.status(400).json({
      error: 'Request ID and Volunteer ID are required.'
    });
  }

  if (Number(volunteer_id) !== Number(req.user.id)) {
    return res.status(403).json({ error: 'You can only complete your own tasks.' });
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    // Check that the task belongs to this volunteer
    // and is currently assigned.
    const [tasks] = await connection.query(
      `SELECT id
       FROM volunteer_requests
       WHERE request_id = ?
       AND volunteer_id = ?
       AND status = 'assigned'
       FOR UPDATE`,
      [
        request_id,
        volunteer_id
      ]
    );

    if (tasks.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Assigned task not found.'
      });
    }

    // Mark volunteer task completed
    await connection.query(
      `UPDATE volunteer_requests
       SET status = 'completed',
           completed_at = CURRENT_TIMESTAMP
       WHERE request_id = ?
       AND volunteer_id = ?
       AND status = 'assigned'`,
      [
        request_id,
        volunteer_id
      ]
    );

    // Mark main request completed
    await connection.query(
      `UPDATE requests
       SET status = 'completed'
       WHERE id = ?`,
      [request_id]
    );

    // Audit log
    await connection.query(
      `INSERT INTO audit_log
       (action, performed_by)
       VALUES (?, ?)`,
      [
        `Volunteer ${volunteer_id} completed request ${request_id}`,
        volunteer_id
      ]
    );

    await connection.commit();

    res.json({
      success: true,
      message:
        'Task marked as completed. Waiting for admin verification.'
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      error: 'Failed to complete task'
    });

  } finally {

    if (connection) {
      connection.release();
    }
  }
});


// =====================================================
// UPDATE REQUEST STATUS
// =====================================================

app.put('/requests', async (req, res) => {
  const request_id = req.body.Id;
  const stat = req.body.status;

  if (!request_id || !stat) {
    return res.status(400).json({
      error: 'Request ID and status are required.'
    });
  }

  let connection;

  try {
    connection = await db.getConnection();

    await connection.beginTransaction();

    const [requestRows] = await connection.query(
      `SELECT
        resource_id,
        quantity_requested,
        status
       FROM requests
       WHERE id = ?
       FOR UPDATE`,
      [request_id]
    );

    if (requestRows.length === 0) {
      await connection.rollback();

      return res.status(404).json({
        error: 'Request not found.'
      });
    }

    const requestRow = requestRows[0];

    if (
      stat === 'fulfilled' &&
      requestRow.status === 'completed'
    ) {
      const [resourceRows] = await connection.query(
        `SELECT quantity
         FROM resources
         WHERE id = ?
         FOR UPDATE`,
        [requestRow.resource_id]
      );

      if (
        resourceRows.length === 0 ||
        resourceRows[0].quantity <
          requestRow.quantity_requested
      ) {
        await connection.rollback();

        return res.status(400).json({
          error:
            'Insufficient stock to fulfill this request.'
        });
      }

      await connection.query(
        `UPDATE resources
         SET quantity = quantity - ?
         WHERE id = ?`,
        [
          requestRow.quantity_requested,
          requestRow.resource_id
        ]
      );
    }

    await connection.query(
      `DELETE FROM volunteer_requests
       WHERE request_id = ?`,
      [request_id]
    );

    await connection.query(
      `UPDATE requests
       SET status = ?
       WHERE id = ?`,
      [
        stat,
        request_id
      ]
    );

    await connection.commit();

    res.json({
      success: true
    });

  } catch (err) {

    if (connection) {
      await connection.rollback();
    }

    res.status(500).json({
      error: 'Failed to update request.'
    });

  } finally {

    if (connection) {
      connection.release();
    }
  }
});


// =====================================================
// RESOURCE AUDIT LOG
// =====================================================

app.get('/resource_audit_log', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT *
       FROM resource_audit_log
       ORDER BY changed_at DESC`
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch resource audit log.'
    });
  }
});


// =====================================================
// AUDIT LOG
// =====================================================

app.get('/audit_log', async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM audit_log'
    );

    res.json(rows);

  } catch (err) {
    res.status(500).json({
      error: 'Failed to fetch audit log.'
    });
  }
});


// =====================================================
// START SERVER
// =====================================================

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.post('/logout', (req, res) => {
  const token = req.headers.authorization.slice(7);
  const { exp } = req.user;
  revokedTokens.set(token, exp * 1000);

  for (const [revokedToken, expiresAt] of revokedTokens) {
    if (expiresAt <= Date.now()) revokedTokens.delete(revokedToken);
  }

  res.json({ message: 'Logged out successfully.' });
});
