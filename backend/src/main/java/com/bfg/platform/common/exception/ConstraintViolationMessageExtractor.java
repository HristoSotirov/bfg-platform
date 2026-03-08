package com.bfg.platform.common.exception;

import jakarta.persistence.PersistenceException;
import org.springframework.dao.DataIntegrityViolationException;

public class ConstraintViolationMessageExtractor {

    private ConstraintViolationMessageExtractor() {
        throw new IllegalStateException("Utility class");
    }

    public static String extractMessage(Exception e) {
        Throwable rootCause = getRootCause(e);
        String rootCauseMessage = rootCause != null && rootCause.getMessage() != null 
            ? rootCause.getMessage() 
            : null;
        
        String mainMessage = e.getMessage();
        String message = rootCauseMessage != null ? rootCauseMessage : mainMessage;
        
        if (message == null) {
            return "A record with these details already exists";
        }
        
        String lowerMessage = message.toLowerCase();
        
        if (lowerMessage.contains("clubs_club_email_key") || 
            (lowerMessage.contains("club_email") && (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")))) {
            return "Club with this email already exists";
        }
        if (lowerMessage.contains("clubs_short_name_key") || 
            (lowerMessage.contains("short_name") && (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")))) {
            return "Club with this short name already exists";
        }
        if (lowerMessage.contains("clubs_name_key") || 
            (lowerMessage.contains("clubs.name") && (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")))) {
            return "Club with this name already exists";
        }
        if (lowerMessage.contains("clubs_card_prefix_key") || 
            (lowerMessage.contains("card_prefix") && (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")))) {
            return "Club with this card prefix already exists";
        }
        
        if (lowerMessage.contains("users_username_key") || 
            (lowerMessage.contains("username") && lowerMessage.contains("unique"))) {
            return "Username already exists";
        }
        if (lowerMessage.contains("users_email_key") || 
            (lowerMessage.contains("email") && lowerMessage.contains("unique") && !lowerMessage.contains("club_email"))) {
            return "Email already exists";
        }
        
        if (lowerMessage.contains("club_coaches_coach_id_key") || 
            (lowerMessage.contains("coach_id") && lowerMessage.contains("unique"))) {
            return "Coach is already assigned to this club";
        }
        
        if (lowerMessage.contains("uq_accreditations_athlete_club_year")) {
            return "Accreditation for this athlete, club, and year already exists";
        }
        
        if (lowerMessage.contains("uk_athletes_full_name_dob")) {
            return "Athlete with these details already exists";
        }
        
        if (lowerMessage.contains("fk_club_coaches_club_id")) {
            return "Club does not exist";
        }
        if (lowerMessage.contains("fk_club_coaches_coach_id")) {
            return "User does not exist or cannot be assigned as coach";
        }
        if (lowerMessage.contains("fk_accreditations_athlete_id")) {
            return lowerMessage.contains("delete") || lowerMessage.contains("update") 
                ? "Cannot delete athlete: athlete has accreditations"
                : "Cannot create accreditation: athlete does not exist";
        }
        if (lowerMessage.contains("fk_accreditations_club_id")) {
            return "Cannot create accreditation: club does not exist";
        }
        if (lowerMessage.contains("fk_clubs_club_admin")) {
            return "User is assigned as a club administrator";
        }
        if (lowerMessage.contains("fk_club_coaches_coach_id") && lowerMessage.contains("delete")) {
            return "User is assigned as a club coach";
        }
        
        if (lowerMessage.contains("unique") || lowerMessage.contains("duplicate")) {
            return "A record with these details already exists";
        }
        if (lowerMessage.contains("foreign key") || lowerMessage.contains("fk_")) {
            return "Cannot perform operation: record is referenced by other records";
        }
        
        return "A record with these details already exists";
    }
    
    private static Throwable getRootCause(Exception e) {
        if (e instanceof DataIntegrityViolationException) {
            return ((DataIntegrityViolationException) e).getRootCause();
        }
        if (e instanceof PersistenceException) {
            return e.getCause();
        }
        return e.getCause();
    }
}

