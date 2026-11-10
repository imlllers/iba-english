package com.iba.testing.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String corsOrigins = "http://localhost:5173,http://127.0.0.1:5173";
    private String mediaDir = "./data/media";
    private long maxUploadBytes = 20_971_520L;
    private String frontendOrigin = "http://localhost:5173";
    private Admin admin = new Admin();
    private Mail mail = new Mail();

    public String getCorsOrigins() {
        return corsOrigins;
    }

    public void setCorsOrigins(String corsOrigins) {
        this.corsOrigins = corsOrigins;
    }

    public String getMediaDir() {
        return mediaDir;
    }

    public void setMediaDir(String mediaDir) {
        this.mediaDir = mediaDir;
    }

    public long getMaxUploadBytes() {
        return maxUploadBytes;
    }

    public void setMaxUploadBytes(long maxUploadBytes) {
        this.maxUploadBytes = maxUploadBytes;
    }

    public String getFrontendOrigin() {
        return frontendOrigin;
    }

    public void setFrontendOrigin(String frontendOrigin) {
        this.frontendOrigin = frontendOrigin;
    }

    public Admin getAdmin() {
        return admin;
    }

    public void setAdmin(Admin admin) {
        this.admin = admin;
    }

    public Mail getMail() {
        return mail;
    }

    public void setMail(Mail mail) {
        this.mail = mail;
    }

    public static class Admin {
        private String email = "admin@example.com";
        private String password = "change-me";
        private String displayName = "Administrator";
        private String loginSecret = "";

        public String getLoginSecret() {
            return loginSecret;
        }

        public void setLoginSecret(String loginSecret) {
            this.loginSecret = loginSecret;
        }

        public String getEmail() {
            return email;
        }

        public void setEmail(String email) {
            this.email = email;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getDisplayName() {
            return displayName;
        }

        public void setDisplayName(String displayName) {
            this.displayName = displayName;
        }
    }

    public static class Mail {
        private boolean enabled;
        private String host = "smtp.gmail.com";
        private int port = 587;
        private String username = "";
        private String password = "";
        private String fromEmail = "";
        private String fromName = "IBA English";
        private boolean startTls = true;

        public boolean isEnabled() {
            return enabled;
        }

        public void setEnabled(boolean enabled) {
            this.enabled = enabled;
        }

        public String getHost() {
            return host;
        }

        public void setHost(String host) {
            this.host = host;
        }

        public int getPort() {
            return port;
        }

        public void setPort(int port) {
            this.port = port;
        }

        public String getUsername() {
            return username;
        }

        public void setUsername(String username) {
            this.username = username;
        }

        public String getPassword() {
            return password;
        }

        public void setPassword(String password) {
            this.password = password;
        }

        public String getFromEmail() {
            return fromEmail;
        }

        public void setFromEmail(String fromEmail) {
            this.fromEmail = fromEmail;
        }

        public String getFromName() {
            return fromName;
        }

        public void setFromName(String fromName) {
            this.fromName = fromName;
        }

        public boolean isStartTls() {
            return startTls;
        }

        public void setStartTls(boolean startTls) {
            this.startTls = startTls;
        }
    }
}
