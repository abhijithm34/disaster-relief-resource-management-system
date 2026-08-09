

use drrms_db;

CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    latitude DECIMAL(10, 6),
    longitude DECIMAL(10, 6),
    weather_condition VARCHAR(50),
    weather_alert ENUM('none', 'yellow', 'orange', 'red') DEFAULT 'none',
    last_weather_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE shelters (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    location_id INT,
    capacity INT,
    current_occupancy INT DEFAULT 0,
    contact_number VARCHAR(15),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE resources (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    type ENUM('food', 'water', 'medical', 'clothing', 'other') NOT NULL,
    quantity INT,
    unit VARCHAR(20),
    location_id INT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role ENUM('admin', 'volunteer', 'citizen') NOT NULL,
    email VARCHAR(100),
    contact_number VARCHAR(15),
    is_requesting_help BOOLEAN DEFAULT FALSE
);

CREATE TABLE requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    resource_id INT,
    location_id INT,
    quantity_requested INT,
    status ENUM('pending', 'assigned', 'completed', 'fulfilled') DEFAULT 'pending',
    request_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    remarks TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (resource_id) REFERENCES resources(id),
    FOREIGN KEY (location_id) REFERENCES locations(id)
);

CREATE TABLE audit_log (
    id INT AUTO_INCREMENT PRIMARY KEY,
    action TEXT NOT NULL,
    performed_by INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (performed_by) REFERENCES users(id)
);

INSERT INTO locations (name, region, latitude, longitude, weather_condition, weather_alert)
VALUES
  ('Chennai', 'Tamil Nadu', 13.0827, 80.2707, 'Heavy Rain', 'orange'),
  ('Cuddalore', 'Tamil Nadu', 11.7463, 79.7714, 'Cyclone Alert', 'red'),
  ('Madurai', 'Tamil Nadu', 9.9252, 78.1198, 'Cloudy', 'yellow'),
  ('Coimbatore', 'Tamil Nadu', 11.0168, 76.9558, 'Clear', 'none');




INSERT INTO shelters (name, location_id, capacity, current_occupancy, contact_number)
VALUES
  ('Relief Camp A', 1, 200, 150, '9876543210'),
  ('School Shelter Cuddalore', 2, 300, 275, '9876501234'),
  ('Community Hall Madurai', 3, 150, 90, '9876567890');
  
  INSERT INTO resources (name, type, quantity, unit, location_id)
VALUES
  ('Rice Bags', 'food', 500, 'kg', 1),
  ('Drinking Water Bottles', 'water', 1000, 'liters', 1),
  ('First Aid Kits', 'medical', 50, 'boxes', 2),
  ('Blankets', 'clothing', 300, 'units', 3),
  ('Sanitary Pads', 'other', 400, 'packs', 1);
  
  INSERT INTO users (username, password, role, email, contact_number, is_requesting_help)
VALUES
  ('admin1', 'adminpass', 'admin', 'admin@example.com', '9000000001', false),
  ('volunteer_raj', 'volpass', 'volunteer', 'raj@example.com', '9000000003', false),
  ('deepa_citizen', 'deeppass', 'citizen', 'deepa@example.com', '9000000004', true),
  ('kumar_citizen', 'kumarpass', 'citizen', 'kumar@example.com', '9000000005', false),
  ('vijay','vijaypass','volunteer','vijay@example.com','7871648764',false);
  
  INSERT INTO requests (user_id, resource_id, location_id, quantity_requested, status, remarks)
VALUES
  (3, 1, 1, 50, 'pending', 'Need rice for 5 families'),
  (4, 2, 1, 100, 'pending', 'Water shortage in area'),
  (3, 3, 2, 20, 'pending', 'Medical help for cyclone relief');
  
  INSERT INTO audit_log (action, performed_by)
VALUES
  ('Approved request ID 2', 1),
  ('Updated resource quantities in Chennai', 1),
  ('Fulfilled request ID 3', 1);

CREATE TABLE resource_audit_log (
  id INT AUTO_INCREMENT PRIMARY KEY,
  resource_id INT,
  old_name VARCHAR(100),
  old_quantity INT,
  new_name VARCHAR(100),
  new_quantity INT,
  action_type VARCHAR(10), -- e.g., 'UPDATE'
  changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


DELIMITER $$

CREATE TRIGGER log_resource_update
BEFORE UPDATE ON resources
FOR EACH ROW
BEGIN
  INSERT INTO resource_audit_log (
    resource_id,
    old_name,
    old_quantity,
    new_name,
    new_quantity,
    action_type
  )
  VALUES (
    OLD.id,
    OLD.name,
    OLD.quantity,
    NEW.name,
    NEW.quantity,
    'UPDATE'
  );
END$$

DELIMITER ;

CREATE TABLE volunteer_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    volunteer_id INT ,
    request_id INT NOT NULL,
    status ENUM('assigned', 'in_progress', 'completed', 'verified') DEFAULT 'assigned',
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    FOREIGN KEY (volunteer_id) REFERENCES users(id),
    FOREIGN KEY (request_id) REFERENCES requests(id)
);

DELIMITER $$

-- Trigger when a request is assigned to volunteer
CREATE TRIGGER after_request_assigned
AFTER UPDATE ON requests
FOR EACH ROW
BEGIN
    IF NEW.status = 'approved' AND OLD.status = 'pending' THEN
        INSERT INTO volunteer_requests (volunteer_id, request_id, status)
        VALUES ((SELECT performed_by FROM audit_log WHERE action LIKE CONCAT('%', NEW.id, '%') ORDER BY timestamp DESC LIMIT 1), NEW.id, 'assigned');
    END IF;
END$$

-- Trigger when admin verifies a completed task
CREATE TRIGGER after_task_verified
AFTER UPDATE ON requests
FOR EACH ROW
BEGIN
    IF NEW.status = 'fulfilled' AND OLD.status = 'completed' THEN
        UPDATE volunteer_requests 
        SET status = 'verified', completed_at = CURRENT_TIMESTAMP
        WHERE request_id = NEW.id;
    END IF;
END$$

DELIMITER ;

select * from resources;

select * from users;





SELECT DISTINCT 
    r.id AS request_id, 
    u.username AS citizen, 
    l.name AS location, 
    res.name AS resource, 
    r.quantity_requested, 
    r.status, 
    r.remarks,
    vu.username AS volunteer
FROM requests r
JOIN users u ON r.user_id = u.id
JOIN resources res ON r.resource_id = res.id
JOIN locations l ON r.location_id = l.id
LEFT JOIN volunteer_requests vr ON vr.request_id = r.id
LEFT JOIN users vu ON vu.id = vr.volunteer_id;

SELECT * FROM requests;

select * from resource_audit_log;

DROP TRIGGER IF EXISTS log_fulfilled_to_completed;
DELIMITER $$

CREATE TRIGGER log_fulfilled_to_completed
AFTER UPDATE ON requests
FOR EACH ROW
BEGIN
    IF OLD.status = 'fulfilled' AND NEW.status = 'completed' THEN
        INSERT INTO audit_log (action, performed_by)
        VALUES (
            CONCAT('Status reverted from fulfilled to completed for request ID ', NEW.id),
            1
        );
    END IF;
END$$

DELIMITER ;

INSERT INTO audit_log (action, performed_by)
VALUES 
('Manually inserted log 1 - resource updated', 1),
('Manually inserted log 2 - request assigned', 2),
('Manually inserted log 3 - shelter capacity updated', 1),
('Manually inserted log 4 - weather alert changed', 2),
('Manually inserted log 5 - citizen request approved', 1);

