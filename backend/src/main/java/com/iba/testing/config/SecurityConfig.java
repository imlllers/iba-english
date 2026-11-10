package com.iba.testing.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.iba.testing.common.response.ApiError;
import com.iba.testing.security.ActiveAccountFilter;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.CsrfTokenRequestHandler;
import org.springframework.security.web.csrf.XorCsrfTokenRequestAttributeHandler;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    SecurityFilterChain securityFilterChain(HttpSecurity http, ObjectMapper objectMapper, ActiveAccountFilter activeAccountFilter,
                                             AppProperties properties) throws Exception {
        CookieCsrfTokenRepository csrfRepository = CookieCsrfTokenRepository.withHttpOnlyFalse();
        CsrfTokenRequestHandler csrfHandler = spaCsrfHandler();
        http
                .csrf(csrf -> csrf.csrfTokenRepository(csrfRepository).csrfTokenRequestHandler(csrfHandler))
                .cors(cors -> cors.configurationSource(corsConfigurationSource(properties)))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .requestCache(cache -> cache.disable())
                .exceptionHandling(errors -> errors
                        .authenticationEntryPoint((request, response, exception) -> write(response, objectMapper, 401, "UNAUTHORIZED", "Нужно войти"))
                        .accessDeniedHandler((request, response, exception) -> write(response, objectMapper, 403, "FORBIDDEN", "Недостаточно прав")))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/health", "/api/docs/**", "/api/swagger/**").permitAll()
                        .requestMatchers(HttpMethod.POST,
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/forgot-password",
                                "/api/auth/reset-password",
                                "/api/auth/verify-email",
                                "/api/auth/resend-verification").permitAll()
                        .requestMatchers("/api/public/**").permitAll()
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        .requestMatchers("/api/teacher/**").hasRole("TEACHER")
                        .requestMatchers("/api/auth/**").authenticated()
                        .anyRequest().denyAll())
                .addFilterAfter(activeAccountFilter, UsernamePasswordAuthenticationFilter.class)
                .logout(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);
        return http.build();
    }

    @Bean
    CorsConfigurationSource corsConfigurationSource(AppProperties properties) {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.stream(properties.getCorsOrigins().split(",")).map(String::trim).filter(s -> !s.isEmpty()).toList());
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", configuration);
        return source;
    }

    private CsrfTokenRequestHandler spaCsrfHandler() {
        CsrfTokenRequestAttributeHandler plain = new CsrfTokenRequestAttributeHandler();
        plain.setCsrfRequestAttributeName(null);
        XorCsrfTokenRequestAttributeHandler xor = new XorCsrfTokenRequestAttributeHandler();
        return new CsrfTokenRequestHandler() {
            @Override
            public void handle(jakarta.servlet.http.HttpServletRequest request, jakarta.servlet.http.HttpServletResponse response,
                               java.util.function.Supplier<org.springframework.security.web.csrf.CsrfToken> csrfToken) {
                csrfToken.get();
                xor.handle(request, response, csrfToken);
            }

            @Override
            public String resolveCsrfTokenValue(jakarta.servlet.http.HttpServletRequest request,
                                                 org.springframework.security.web.csrf.CsrfToken csrfToken) {
                String header = request.getHeader(csrfToken.getHeaderName());
                if (header != null && !header.isBlank()) {
                    return plain.resolveCsrfTokenValue(request, csrfToken);
                }
                return xor.resolveCsrfTokenValue(request, csrfToken);
            }
        };
    }

    private void write(HttpServletResponse response, ObjectMapper objectMapper, int status, String code, String message) throws java.io.IOException {
        response.setStatus(status);
        response.setCharacterEncoding("UTF-8");
        response.setContentType("application/json;charset=UTF-8");
        objectMapper.writeValue(response.getWriter(), new ApiError(code, message));
    }
}
