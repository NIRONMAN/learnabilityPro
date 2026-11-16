package com.learnabilitypro.learnability.security;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class SecurityConfigTest {

    @Mock
    private JwtAuthenticationFilter jwtAuthenticationFilter;

    @Mock
    private CustomUserDetailsService userDetailsService;

    @Test
    void testDefaultAllowedOrigins() {
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, userDetailsService);

        List<String> origins = config.getAllowedOrigins();
        assertNotNull(origins);
        assertEquals(2, origins.size());
        assertTrue(origins.contains("http://localhost:3000"));
        assertTrue(origins.contains("http://localhost:3001"));
    }

    @Test
    void testCustomAllowedOriginsFromListWithTrimming() {
        List<String> rawOrigins = List.of("  https://app.learnability.pro  ", "", "  https://preview.learnability.pro ");
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, userDetailsService, rawOrigins);

        List<String> origins = config.getAllowedOrigins();
        assertEquals(List.of("https://app.learnability.pro", "https://preview.learnability.pro"), origins);

        CorsConfigurationSource source = config.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/some-endpoint");
        CorsConfiguration corsConfig = source.getCorsConfiguration(request);

        assertNotNull(corsConfig);
        assertEquals(List.of("https://app.learnability.pro", "https://preview.learnability.pro"), corsConfig.getAllowedOrigins());
        assertTrue(Boolean.TRUE.equals(corsConfig.getAllowCredentials()));
        assertTrue(corsConfig.getAllowedMethods().containsAll(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH")));
    }

    @Test
    void testEmptyAllowedOriginsFallbackToDefaults() {
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, userDetailsService, List.of("  ", ""));
        assertEquals(List.of("http://localhost:3000", "http://localhost:3001"), config.getAllowedOrigins());
    }

    @Test
    void testNullAllowedOriginsFallbackToDefaults() {
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, userDetailsService, null);
        assertEquals(List.of("http://localhost:3000", "http://localhost:3001"), config.getAllowedOrigins());
    }

    @Test
    void testWildcardOriginUsesAllowedOriginPatterns() {
        List<String> rawOrigins = List.of("*");
        SecurityConfig config = new SecurityConfig(jwtAuthenticationFilter, userDetailsService, rawOrigins);

        CorsConfigurationSource source = config.corsConfigurationSource();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/some-endpoint");
        CorsConfiguration corsConfig = source.getCorsConfiguration(request);

        assertNotNull(corsConfig);
        assertEquals(List.of("*"), corsConfig.getAllowedOriginPatterns());
        assertNull(corsConfig.getAllowedOrigins());
    }

    @Test
    void testPropertyBindingWithApplicationContextRunner() {
        org.springframework.boot.test.context.runner.ApplicationContextRunner runner =
                new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                        .withBean(JwtAuthenticationFilter.class, () -> jwtAuthenticationFilter)
                        .withBean(CustomUserDetailsService.class, () -> userDetailsService)
                        .withUserConfiguration(SecurityConfig.class)
                        .withPropertyValues("application.cors.allowed-origins=https://example.com, https://test.com");

        runner.run(context -> {
            SecurityConfig config = context.getBean(SecurityConfig.class);
            assertEquals(List.of("https://example.com", "https://test.com"), config.getAllowedOrigins());
        });
    }

    @Test
    void testEnvVarBindingWithApplicationContextRunner() {
        org.springframework.boot.test.context.runner.ApplicationContextRunner runner =
                new org.springframework.boot.test.context.runner.ApplicationContextRunner()
                        .withBean(JwtAuthenticationFilter.class, () -> jwtAuthenticationFilter)
                        .withBean(CustomUserDetailsService.class, () -> userDetailsService)
                        .withUserConfiguration(SecurityConfig.class)
                        .withPropertyValues("CORS_ALLOWED_ORIGINS=https://custom1.com,https://custom2.com");

        runner.run(context -> {
            SecurityConfig config = context.getBean(SecurityConfig.class);
            assertEquals(List.of("https://custom1.com", "https://custom2.com"), config.getAllowedOrigins());
        });
    }
}
