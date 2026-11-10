CREATE TABLE notifications (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    type VARCHAR(40) NOT NULL,
    title VARCHAR(200) NOT NULL,
    body TEXT NOT NULL DEFAULT '',
    link VARCHAR(500),
    dedupe_key VARCHAR(200),
    created_at TIMESTAMPTZ NOT NULL,
    read_at TIMESTAMPTZ,
    hidden BOOLEAN NOT NULL DEFAULT FALSE,
    CONSTRAINT uq_notifications_dedupe UNIQUE (user_id, dedupe_key)
);

CREATE INDEX idx_notifications_user_created ON notifications (user_id, created_at DESC);

CREATE TABLE notification_preferences (
    user_id UUID PRIMARY KEY REFERENCES users (id) ON DELETE CASCADE,
    prefs JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL
);

CREATE TABLE known_devices (
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    fingerprint VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL,
    PRIMARY KEY (user_id, fingerprint)
);
