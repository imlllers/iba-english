package com.iba.testing.mail;

public record MailSettings(
        boolean enabled,
        String host,
        int port,
        String username,
        String password,
        String fromEmail,
        String fromName,
        boolean startTls
) {
    public boolean configured() {
        return enabled
                && host != null && !host.isBlank()
                && fromEmail != null && !fromEmail.isBlank()
                && username != null && !username.isBlank()
                && password != null && !password.isBlank()
                && port > 0;
    }

    public boolean passwordConfigured() {
        return password != null && !password.isBlank();
    }
}
