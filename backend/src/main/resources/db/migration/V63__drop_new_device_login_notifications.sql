DELETE FROM notifications WHERE type = 'NEW_DEVICE_LOGIN';

UPDATE notification_preferences
SET prefs = prefs - 'NEW_DEVICE_LOGIN',
    updated_at = NOW()
WHERE prefs ? 'NEW_DEVICE_LOGIN';

DROP TABLE IF EXISTS known_devices;