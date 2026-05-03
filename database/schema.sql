CREATE TABLE users (
	id SERIAL,
	username VARCHAR(50) UNIQUE,
	password TEXT
);

ALTER TABLE users
ADD CONSTRAINT pk_id_user PRIMARY KEY(id);

CREATE TABLE progress (
    id SERIAL,
    user_id INT,
    level INT,
    chapter INT,
    completed BOOLEAN DEFAULT FALSE,
    score INT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE progress
ADD CONSTRAINT pk_id_progress PRIMARY KEY(id);

ALTER TABLE progress
ADD CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;

CREATE TABLE performance (
    id SERIAL,
    user_id INT,
    topic VARCHAR(50), -- exemplo: 'loop', 'condition', 'sequence'
    attempts INT DEFAULT 0,
    correct INT DEFAULT 0,
    accuracy FLOAT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE performance
ADD CONSTRAINT pk_id_performance PRIMARY KEY(id);

ALTER TABLE performance
ADD CONSTRAINT fk_user_id FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE;