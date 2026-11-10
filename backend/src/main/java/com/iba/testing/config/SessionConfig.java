package com.iba.testing.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.session.web.http.CookieSerializer;
import org.springframework.session.web.http.DefaultCookieSerializer;

@Configuration
public class SessionConfig {

    public static final String REMEMBER_ME_ATTR = "iba.remember-me";

    public static final int REMEMBER_ME_SECONDS = 30 * 24 * 60 * 60;

    @Bean
    public CookieSerializer cookieSerializer(
            @Value("${SESSION_COOKIE_SECURE:false}") boolean secure
    ) {
        DefaultCookieSerializer serializer = new DefaultCookieSerializer();
        serializer.setUseHttpOnlyCookie(true);
        serializer.setSameSite("Lax");
        serializer.setUseSecureCookie(secure);
        serializer.setRememberMeRequestAttribute(REMEMBER_ME_ATTR);
        return serializer;
    }
}
