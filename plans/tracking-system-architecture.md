# Enhanced Student Tracking System Architecture

## System Overview

```mermaid
graph TB
    subgraph "Frontend Components"
        A[Topic Pages] --> B[Confirmation Dialogs]
        C[Activity Pages] --> B
        D[Evaluation Pages] --> B
        E[Student Progress] --> F[Tracking History]
        G[Teacher Panel] --> H[Analytics Dashboard]
    end
    
    subgraph "Enhanced Tracking Utilities"
        I[Session Time Tracker]
        J[Data Validator]
        K[Confirmation Manager]
        L[Quality Scorer]
    end
    
    subgraph "Database Layer"
        M[student_tracking] --> N[confirmation_status]
        O[tracking_confirmations] --> P[session_durations]
        Q[lesson_visibility_settings] --> R[activity_submissions]
    end
    
    subgraph "API Layer"
        S[Supabase Client] --> T[Enhanced Tracking Functions]
        U[Authentication] --> V[Row Level Security]
    end
    
    B --> I
    B --> J
    B --> K
    F --> L
    H --> L
    I --> S
    J --> S
    K --> S
    L --> S
    T --> M
    T --> O
    T --> Q
```

## Data Flow Architecture

### 1. Lesson Completion Flow

```mermaid
sequenceDiagram
    participant Student as Student
    participant TopicPage as Topic Page
    participant ConfirmDialog as Confirmation Dialog
    participant TimeTracker as Time Tracker
    participant DB as Database
    participant Teacher as Teacher Panel

    Student->>TopicPage: Start Lesson
    TopicPage->>TimeTracker: Start Session Tracking
    TimeTracker->>DB: Record Start Time
    
    Student->>TopicPage: Complete Lesson
    TopicPage->>ConfirmDialog: Show Confirmation
    ConfirmDialog->>Student: Confirm Completion?
    Student->>ConfirmDialog: Yes
    ConfirmDialog->>TopicPage: Confirmed
    TopicPage->>TimeTracker: End Session
    TimeTracker->>DB: Save Duration
    TopicPage->>DB: Update Tracking with Confirmation
    DB->>Teacher: Notify New Confirmed Entry
```

### 2. Activity Submission Flow

```mermaid
sequenceDiagram
    participant Student as Student
    participant ActivityPage as Activity Page
    participant ConfirmDialog as Confirmation Dialog
    participant Validator as Data Validator
    participant DB as Database

    Student->>ActivityPage: Complete Activity
    ActivityPage->>Validator: Validate Data
    Validator-->>ActivityPage: Validation Result
    ActivityPage->>ConfirmDialog: Show Confirmation
    Student->>ConfirmDialog: Confirm Submission
    ConfirmDialog->>DB: Save with Confirmation Status
```

### 3. Time Tracking Flow

```mermaid
sequenceDiagram
    participant Student as Student
    participant TimeTracker as Session Time Tracker
    participant DB as Database

    Student->>TimeTracker: Enter Session
    TimeTracker->>TimeTracker: Record Start Time
    TimeTracker->>DB: Create Session Record
    
    Student->>TimeTracker: Exit Session
    TimeTracker->>TimeTracker: Calculate Duration
    TimeTracker->>DB: Update Session Duration
    DB->>TimeTracker: Return Confirmation Status
```

## Database Schema Relationships

```mermaid
erDiagram
    student_tracking {
        bigint id PK
        uuid student_id FK
        jsonb tracking_data
        timestamp last_confirmed_at
        text confirmation_status
        numeric data_quality_score
        timestamp created_at
        timestamp updated_at
    }
    
    tracking_confirmations {
        bigint id PK
        uuid student_id FK
        text tracking_type
        text topic_id
        integer activity_id
        jsonb confirmation_data
        boolean is_confirmed
        timestamp confirmation_timestamp
        timestamp created_at
        timestamp updated_at
    }
    
    session_durations {
        bigint id PK
        uuid student_id FK
        text topic_id
        text session_type
        timestamp start_time
        timestamp end_time
        integer duration_seconds
        boolean is_completed
        timestamp created_at
    }
    
    profiles {
        uuid id PK
        text username
        text email
        text role
        uuid added_by_teacher_id
        text full_name
        text grade
    }
    
    student_tracking ||--o{ tracking_confirmations : "has"
    student_tracking ||--o{ session_durations : "has"
    profiles ||--o{ student_tracking : "tracked"
    profiles ||--o{ tracking_confirmations : "created"
    profiles ||--o{ session_durations : "tracked"
```

## Component Architecture

### Frontend Components

```
src/
├── components/
│   ├── ConfirmationDialog.tsx          # Base confirmation dialog
│   ├── LessonCompletionConfirmation.tsx  # Lesson-specific confirmation
│   ├── ActivitySubmissionConfirmation.tsx # Activity-specific confirmation
│   ├── EvaluationSubmissionConfirmation.tsx # Evaluation-specific confirmation
│   └── TimeTrackerDisplay.tsx         # Session duration display
├── utils/
│   ├── enhancedStudentTracking.ts     # Enhanced tracking functions
│   ├── sessionTimeTracker.ts          # Time tracking utilities
│   ├── dataValidator.ts               # Data validation functions
│   └── qualityScorer.ts               # Data quality scoring
└── pages/
    ├── topic.tsx                     # Enhanced with confirmation
    ├── Activity.tsx                   # Enhanced with confirmation
    ├── Evaluate.tsx                   # Enhanced with confirmation
    └── StudentProgress.tsx           # Enhanced with tracking history
```

### Backend Database Structure

```sql
-- Enhanced student tracking table
student_tracking
├── id (primary key)
├── student_id (foreign key to profiles)
├── tracking_data (jsonb)
├── last_confirmed_at (timestamp)
├── confirmation_status ('pending', 'confirmed', 'rejected')
├── data_quality_score (0-100)
├── created_at
└── updated_at

-- Tracking confirmations table
tracking_confirmations
├── id (primary key)
├── student_id (foreign key)
├── tracking_type ('lesson', 'activity', 'evaluation', 'collaborative')
├── topic_id
├── activity_id (nullable)
├── confirmation_data (jsonb)
├── is_confirmed (boolean)
├── confirmation_timestamp (nullable)
├── created_at
└── updated_at

-- Session durations table
session_durations
├── id (primary key)
├── student_id (foreign key)
├── topic_id
├── session_type ('lesson', 'review', 'evaluation', 'activity', 'collaborative')
├── start_time
├── end_time (nullable)
├── duration_seconds (nullable)
├── is_completed (boolean)
└── created_at
```

## Security and Permissions

### Row Level Security Policies

```sql
-- Students can view their own tracking data
CREATE POLICY "Students can view own tracking" ON student_tracking
    FOR SELECT USING (auth.uid() = student_id);

-- Students can confirm their own tracking entries
CREATE POLICY "Students can confirm own tracking" ON tracking_confirmations
    FOR UPDATE USING (auth.uid() = student_id);

-- Teachers can view tracking for their students
CREATE POLICY "Teachers can view student tracking" ON student_tracking
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() 
            AND p.role IN ('teacher', 'admin')
            AND (
                p.role = 'admin' 
                OR EXISTS (
                    SELECT 1 FROM profiles s
                    WHERE s.id = student_tracking.student_id 
                    AND s.added_by_teacher_id = auth.uid()
                )
            )
        )
    );
```

## Performance Considerations

### Indexing Strategy

```sql
-- Indexes for fast queries
CREATE INDEX idx_student_tracking_student_status 
ON student_tracking (student_id, confirmation_status);

CREATE INDEX idx_tracking_confirmations_student_topic 
ON tracking_confirmations (student_id, topic_id, tracking_type);

CREATE INDEX idx_session_durations_student_session 
ON session_durations (student_id, session_type, start_time);

-- Composite indexes for analytics
CREATE INDEX idx_tracking_analytics 
ON student_tracking (confirmation_status, last_confirmed_at);

CREATE INDEX idx_session_analytics 
ON session_durations (student_id, session_type, duration_seconds);
```

### Caching Strategy

1. **Student Tracking Cache**: Cache individual student tracking data
2. **Session Duration Cache**: Cache active session durations
3. **Confirmation Status Cache**: Cache confirmation status for quick UI updates
4. **Quality Score Cache**: Cache calculated quality scores

## Monitoring and Analytics

### Key Metrics to Track

1. **Confirmation Rate**: Percentage of tracking entries that are confirmed
2. **Data Quality Score**: Average quality score across all tracking entries
3. **Session Duration**: Average time spent in different session types
4. **Validation Failure Rate**: Percentage of tracking entries that fail validation
5. **User Response Time**: Average time to complete confirmation dialogs

### Dashboard Components

```mermaid
pie
    title Tracking Confirmation Status
    "Confirmed" : 85
    "Pending" : 10
    "Rejected" : 5

pie
    title Data Quality Distribution
    "Excellent (90-100)" : 70
    "Good (70-89)" : 20
    "Needs Improvement (<70)" : 10

bar
    title Average Session Duration by Type
    "Lesson" : 1200
    "Activity" : 800
    "Evaluation" : 1800
    "Collaborative" : 2400
```

This architecture provides a comprehensive foundation for an enhanced student tracking system with proper confirmation mechanisms, time tracking, and data validation capabilities.