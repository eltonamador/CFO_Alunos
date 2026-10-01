export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      internship_scale_numbers: {
        Row: {voided_at:string|null;void_reason:string|null;id:string;program_id:string;service:string;gbm_site_id:string|null;source_roster_id:string|null;period_start:string;period_end:string;sequence_number:number;sequence_year:number;issued_at:string;issued_by:string};
        Insert: never; Update: never; Relationships: [];
      };
      internship_scale_revisions: {
        Row: {id:string;scale_number_id:string;revision:number;rectification:number|null;snapshot:Json;change_summary:string;pdf_base64:string;issued_at:string;issued_by:string};
        Insert: never; Update: never; Relationships: [];
      };

      internship_schedule_restarts: {
        Row: { id: string; program_id: string; actor_id: string; reason: string; cancelled_shifts: number; cancelled_assignments: number; revoked_invites: number; created_at: string };
        Insert: never; Update: never; Relationships: [];
      };
      internship_evaluations: {
        Row: {
          id: string; assignment_id: string; version: number; student_id: string; context: Json;
          source: string; status: string; recipient_name: string; recipient_contact: string;
          token_hash: string | null; expires_at: string | null; created_by: string; created_at: string;
          evaluator_name: string | null; evaluator_unit: string | null; ratings: Json | null;
          details: Json;
          guidance: string | null; incident: boolean | null; incident_note: string | null;
          paper_reference: string | null; submitted_at: string | null; reviewed_at: string | null;
          reviewed_by: string | null; review_note: string | null;
          whatsapp_targets: string[]; whatsapp_sender_phone: string | null;
          whatsapp_verified_at: string | null; whatsapp_verified_by: string | null;
        };
        Insert: never; Update: never; Relationships: [];
      };
      internship_evaluation_whatsapp_contacts: {
        Row: {
          program_id: string; primary_phone: string; secondary_phone: string | null;
          updated_at: string; updated_by: string | null;
        };
        Insert: {
          program_id: string; primary_phone: string; secondary_phone?: string | null;
          updated_at?: string; updated_by?: string | null;
        };
        Update: {
          primary_phone?: string; secondary_phone?: string | null;
          updated_at?: string; updated_by?: string | null;
        };
        Relationships: [];
      };
      academic_assessments: {
        Row: {
          held_on: string | null;
          id: string;
          kind: string;
          offering_id: string;
          sequence: number;
          title: string;
        };
        Insert: {
          held_on?: string | null;
          id?: string;
          kind: string;
          offering_id: string;
          sequence: number;
          title: string;
        };
        Update: {
          held_on?: string | null;
          id?: string;
          kind?: string;
          offering_id?: string;
          sequence?: number;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_assessments_offering_id_fkey";
            columns: ["offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_offerings";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_assignments: {
        Row: {
          active: boolean;
          designation_ref: string;
          display_name: string;
          id: string;
          offering_id: string;
          profile_id: string | null;
          role: string;
        };
        Insert: {
          active?: boolean;
          designation_ref: string;
          display_name: string;
          id?: string;
          offering_id: string;
          profile_id?: string | null;
          role: string;
        };
        Update: {
          active?: boolean;
          designation_ref?: string;
          display_name?: string;
          id?: string;
          offering_id?: string;
          profile_id?: string | null;
          role?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_assignments_offering_id_fkey";
            columns: ["offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_offerings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_assignments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_name: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          entity: string;
          entity_id: string;
          id: string;
          offering_id: string | null;
          reason: string | null;
          student_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_name?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity: string;
          entity_id: string;
          id?: string;
          offering_id?: string | null;
          reason?: string | null;
          student_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_name?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity?: string;
          entity_id?: string;
          id?: string;
          offering_id?: string | null;
          reason?: string | null;
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_audit_events_actor_id_fkey";
            columns: ["actor_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_audit_events_offering_id_fkey";
            columns: ["offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_offerings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_audit_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_audit_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_audit_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_calendar_events: {
        Row: {
          academic_year_id: string;
          blocks_instruction: boolean;
          change_reason: string | null;
          class_id: string | null;
          created_at: string;
          created_by: string | null;
          event_date: string;
          event_type: string;
          id: string;
          revision: number;
          source_ref: string;
          title: string;
        };
        Insert: {
          academic_year_id: string;
          blocks_instruction?: boolean;
          change_reason?: string | null;
          class_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          event_date: string;
          event_type: string;
          id?: string;
          revision?: number;
          source_ref: string;
          title: string;
        };
        Update: {
          academic_year_id?: string;
          blocks_instruction?: boolean;
          change_reason?: string | null;
          class_id?: string | null;
          created_at?: string;
          created_by?: string | null;
          event_date?: string;
          event_type?: string;
          id?: string;
          revision?: number;
          source_ref?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_calendar_events_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_calendar_events_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_calendar_events_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_discipline_aliases: {
        Row: {
          active: boolean;
          alias: string;
          created_at: string;
          created_by: string | null;
          discipline_id: string;
          id: string;
          normalized_alias: string;
        };
        Insert: {
          active?: boolean;
          alias: string;
          created_at?: string;
          created_by?: string | null;
          discipline_id: string;
          id?: string;
          normalized_alias: string;
        };
        Update: {
          active?: boolean;
          alias?: string;
          created_at?: string;
          created_by?: string | null;
          discipline_id?: string;
          id?: string;
          normalized_alias?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_discipline_aliases_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_discipline_aliases_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "academic_disciplines";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_disciplines: {
        Row: {
          active: boolean;
          code: string;
          conflicts: string[];
          id: string;
          kind: string;
          name: string;
          phase: number;
          source_ref: string;
          workload_hours: number;
        };
        Insert: {
          active?: boolean;
          code: string;
          conflicts?: string[];
          id?: string;
          kind: string;
          name: string;
          phase: number;
          source_ref: string;
          workload_hours: number;
        };
        Update: {
          active?: boolean;
          code?: string;
          conflicts?: string[];
          id?: string;
          kind?: string;
          name?: string;
          phase?: number;
          source_ref?: string;
          workload_hours?: number;
        };
        Relationships: [];
      };
      academic_enrollments: {
        Row: {
          change_reason: string | null;
          id: string;
          justified_absences: number | null;
          offering_id: string;
          revision: number;
          student_id: string;
          student_label: string;
          unjustified_absences: number | null;
        };
        Insert: {
          change_reason?: string | null;
          id?: string;
          justified_absences?: number | null;
          offering_id: string;
          revision?: number;
          student_id: string;
          student_label: string;
          unjustified_absences?: number | null;
        };
        Update: {
          change_reason?: string | null;
          id?: string;
          justified_absences?: number | null;
          offering_id?: string;
          revision?: number;
          student_id?: string;
          student_label?: string;
          unjustified_absences?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_enrollments_offering_id_fkey";
            columns: ["offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_offerings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_enrollments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_grades: {
        Row: {
          assessment_id: string;
          change_reason: string | null;
          enrollment_id: string;
          id: string;
          offering_id: string;
          revision: number;
          score: number | null;
          updated_at: string;
        };
        Insert: {
          assessment_id: string;
          change_reason?: string | null;
          enrollment_id: string;
          id?: string;
          offering_id: string;
          revision?: number;
          score?: number | null;
          updated_at?: string;
        };
        Update: {
          assessment_id?: string;
          change_reason?: string | null;
          enrollment_id?: string;
          id?: string;
          offering_id?: string;
          revision?: number;
          score?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_grades_assessment_id_offering_id_fkey";
            columns: ["assessment_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_assessments";
            referencedColumns: ["id", "offering_id"];
          },
          {
            foreignKeyName: "academic_grades_enrollment_id_offering_id_fkey";
            columns: ["enrollment_id", "offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_enrollments";
            referencedColumns: ["id", "offering_id"];
          },
          {
            foreignKeyName: "academic_grades_offering_id_fkey";
            columns: ["offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_offerings";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_instruction_sessions: {
        Row: {
          academic_year_id: string;
          actual_ends_at: string | null;
          actual_starts_at: string | null;
          change_reason: string | null;
          class_id: string;
          classification: string;
          content: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          location: string | null;
          offering_id: string | null;
          planned_ends_at: string | null;
          planned_hours: number;
          planned_instructor: string | null;
          planned_starts_at: string | null;
          proposed_at: string | null;
          proposed_by: string | null;
          proposed_outcome: string;
          qts_activity_id: string | null;
          rescheduled_from_id: string | null;
          revision: number;
          scheduled_on: string;
          status: string;
          taught_hours: number | null;
          title: string;
          validated_at: string | null;
          validated_by: string | null;
        };
        Insert: {
          academic_year_id: string;
          actual_ends_at?: string | null;
          actual_starts_at?: string | null;
          change_reason?: string | null;
          class_id: string;
          classification?: string;
          content?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location?: string | null;
          offering_id?: string | null;
          planned_ends_at?: string | null;
          planned_hours?: number;
          planned_instructor?: string | null;
          planned_starts_at?: string | null;
          proposed_at?: string | null;
          proposed_by?: string | null;
          proposed_outcome?: string;
          qts_activity_id?: string | null;
          rescheduled_from_id?: string | null;
          revision?: number;
          scheduled_on: string;
          status?: string;
          taught_hours?: number | null;
          title: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Update: {
          academic_year_id?: string;
          actual_ends_at?: string | null;
          actual_starts_at?: string | null;
          change_reason?: string | null;
          class_id?: string;
          classification?: string;
          content?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          location?: string | null;
          offering_id?: string | null;
          planned_ends_at?: string | null;
          planned_hours?: number;
          planned_instructor?: string | null;
          planned_starts_at?: string | null;
          proposed_at?: string | null;
          proposed_by?: string | null;
          proposed_outcome?: string;
          qts_activity_id?: string | null;
          rescheduled_from_id?: string | null;
          revision?: number;
          scheduled_on?: string;
          status?: string;
          taught_hours?: number | null;
          title?: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_instruction_sessions_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_instruction_sessions_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_instruction_sessions_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_instruction_sessions_offering_id_fkey";
            columns: ["offering_id"];
            isOneToOne: false;
            referencedRelation: "academic_offerings";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_instruction_sessions_proposed_by_fkey";
            columns: ["proposed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_instruction_sessions_qts_activity_id_fkey";
            columns: ["qts_activity_id"];
            isOneToOne: true;
            referencedRelation: "qts_activities";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_instruction_sessions_rescheduled_from_id_fkey";
            columns: ["rescheduled_from_id"];
            isOneToOne: false;
            referencedRelation: "academic_instruction_sessions";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_instruction_sessions_validated_by_fkey";
            columns: ["validated_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_offerings: {
        Row: {
          academic_year: number;
          academic_year_id: string | null;
          active: boolean;
          class_id: string;
          created_at: string;
          decision_ref: string;
          discipline_id: string;
          id: string;
          policy_id: string | null;
          vc_count: number;
          workload_hours: number;
        };
        Insert: {
          academic_year: number;
          academic_year_id?: string | null;
          active?: boolean;
          class_id: string;
          created_at?: string;
          decision_ref: string;
          discipline_id: string;
          id?: string;
          policy_id?: string | null;
          vc_count: number;
          workload_hours: number;
        };
        Update: {
          academic_year?: number;
          academic_year_id?: string | null;
          active?: boolean;
          class_id?: string;
          created_at?: string;
          decision_ref?: string;
          discipline_id?: string;
          id?: string;
          policy_id?: string | null;
          vc_count?: number;
          workload_hours?: number;
        };
        Relationships: [
          {
            foreignKeyName: "academic_offerings_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_offerings_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_offerings_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "academic_disciplines";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_offerings_policy_id_fkey";
            columns: ["policy_id"];
            isOneToOne: false;
            referencedRelation: "academic_policies";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_official_designations: {
        Row: {
          active: boolean;
          designation_kind: string;
          designation_ref: string;
          discipline_id: string;
          display_name: string;
          id: string;
          source_code: string;
        };
        Insert: {
          active?: boolean;
          designation_kind: string;
          designation_ref: string;
          discipline_id: string;
          display_name: string;
          id?: string;
          source_code: string;
        };
        Update: {
          active?: boolean;
          designation_kind?: string;
          designation_ref?: string;
          discipline_id?: string;
          display_name?: string;
          id?: string;
          source_code?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_official_designations_discipline_id_fkey";
            columns: ["discipline_id"];
            isOneToOne: false;
            referencedRelation: "academic_disciplines";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_policies: {
        Row: {
          approved_at: string;
          approved_by: string;
          decision_ref: string;
          id: string;
          name: string;
          parameters: Json;
        };
        Insert: {
          approved_at?: string;
          approved_by: string;
          decision_ref: string;
          id?: string;
          name: string;
          parameters: Json;
        };
        Update: {
          approved_at?: string;
          approved_by?: string;
          decision_ref?: string;
          id?: string;
          name?: string;
          parameters?: Json;
        };
        Relationships: [
          {
            foreignKeyName: "academic_policies_approved_by_fkey";
            columns: ["approved_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_qts_documents: {
        Row: {
          academic_year_id: string;
          change_reason: string;
          class_id: string;
          document_id: string;
          linked_at: string;
          linked_by: string | null;
        };
        Insert: {
          academic_year_id: string;
          change_reason: string;
          class_id: string;
          document_id: string;
          linked_at?: string;
          linked_by?: string | null;
        };
        Update: {
          academic_year_id?: string;
          change_reason?: string;
          class_id?: string;
          document_id?: string;
          linked_at?: string;
          linked_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "academic_qts_documents_academic_year_id_fkey";
            columns: ["academic_year_id"];
            isOneToOne: false;
            referencedRelation: "academic_years";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_qts_documents_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_qts_documents_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: true;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_qts_documents_linked_by_fkey";
            columns: ["linked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_session_attendances: {
        Row: {
          change_reason: string | null;
          enrollment_id: string;
          id: string;
          marked_at: string;
          marked_by: string | null;
          revision: number;
          session_id: string;
          status: string;
        };
        Insert: {
          change_reason?: string | null;
          enrollment_id: string;
          id?: string;
          marked_at?: string;
          marked_by?: string | null;
          revision?: number;
          session_id: string;
          status: string;
        };
        Update: {
          change_reason?: string | null;
          enrollment_id?: string;
          id?: string;
          marked_at?: string;
          marked_by?: string | null;
          revision?: number;
          session_id?: string;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_session_attendances_enrollment_id_fkey";
            columns: ["enrollment_id"];
            isOneToOne: false;
            referencedRelation: "academic_enrollments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_session_attendances_marked_by_fkey";
            columns: ["marked_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_session_attendances_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "academic_instruction_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_session_instructors: {
        Row: {
          assignment_id: string | null;
          created_at: string;
          display_name: string;
          id: string;
          profile_id: string | null;
          session_id: string;
        };
        Insert: {
          assignment_id?: string | null;
          created_at?: string;
          display_name: string;
          id?: string;
          profile_id?: string | null;
          session_id: string;
        };
        Update: {
          assignment_id?: string | null;
          created_at?: string;
          display_name?: string;
          id?: string;
          profile_id?: string | null;
          session_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "academic_session_instructors_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "academic_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_session_instructors_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_session_instructors_session_id_fkey";
            columns: ["session_id"];
            isOneToOne: false;
            referencedRelation: "academic_instruction_sessions";
            referencedColumns: ["id"];
          },
        ];
      };
      academic_years: {
        Row: {
          change_reason: string | null;
          closed_at: string | null;
          closed_by: string | null;
          course_id: string;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          revision: number;
          source_ref: string;
          source_verified: boolean;
          starts_on: string;
          status: string;
          year: number;
        };
        Insert: {
          change_reason?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          course_id: string;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          revision?: number;
          source_ref: string;
          source_verified?: boolean;
          starts_on: string;
          status?: string;
          year: number;
        };
        Update: {
          change_reason?: string | null;
          closed_at?: string | null;
          closed_by?: string | null;
          course_id?: string;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          revision?: number;
          source_ref?: string;
          source_verified?: boolean;
          starts_on?: string;
          status?: string;
          year?: number;
        };
        Relationships: [
          {
            foreignKeyName: "academic_years_closed_by_fkey";
            columns: ["closed_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_years_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "academic_years_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      announcement_attachments: {
        Row: {
          announcement_id: string;
          attachment_type: string;
          created_at: string;
          external_url: string | null;
          file_size_bytes: number | null;
          id: string;
          mime_type: string;
          original_filename: string;
          sort_order: number;
          storage_path: string | null;
          uploaded_by: string;
        };
        Insert: {
          announcement_id: string;
          attachment_type: string;
          created_at?: string;
          external_url?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          mime_type: string;
          original_filename: string;
          sort_order?: number;
          storage_path?: string | null;
          uploaded_by: string;
        };
        Update: {
          announcement_id?: string;
          attachment_type?: string;
          created_at?: string;
          external_url?: string | null;
          file_size_bytes?: number | null;
          id?: string;
          mime_type?: string;
          original_filename?: string;
          sort_order?: number;
          storage_path?: string | null;
          uploaded_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcement_attachments_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
        ];
      };
      announcement_reads: {
        Row: {
          announcement_id: string;
          id: string;
          read_at: string;
          read_by: string;
          student_id: string;
        };
        Insert: {
          announcement_id: string;
          id?: string;
          read_at?: string;
          read_by: string;
          student_id: string;
        };
        Update: {
          announcement_id?: string;
          id?: string;
          read_at?: string;
          read_by?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcement_reads_announcement_id_fkey";
            columns: ["announcement_id"];
            isOneToOne: false;
            referencedRelation: "announcements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcement_reads_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcement_reads_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "announcement_reads_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      announcements: {
        Row: {
          audience_type: string;
          body: string;
          class_id: string | null;
          created_at: string;
          created_by: string;
          id: string;
          priority: string;
          published_at: string | null;
          status: string;
          target_role: string | null;
          target_student_ids: string[] | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          audience_type: string;
          body: string;
          class_id?: string | null;
          created_at?: string;
          created_by: string;
          id?: string;
          priority?: string;
          published_at?: string | null;
          status?: string;
          target_role?: string | null;
          target_student_ids?: string[] | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          audience_type?: string;
          body?: string;
          class_id?: string | null;
          created_at?: string;
          created_by?: string;
          id?: string;
          priority?: string;
          published_at?: string | null;
          status?: string;
          target_role?: string | null;
          target_student_ids?: string[] | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "announcements_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          entity: string;
          entity_id: string | null;
          id: string;
          reason: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity: string;
          entity_id?: string | null;
          id?: string;
          reason?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          entity?: string;
          entity_id?: string | null;
          id?: string;
          reason?: string | null;
        };
        Relationships: [];
      };
      canga_assignments: {
        Row: {
          assigned_at: string;
          assigned_by: string;
          canga_student_id: string;
          created_at: string;
          id: string;
          is_current: boolean;
          notes: string | null;
          student_id: string;
        };
        Insert: {
          assigned_at?: string;
          assigned_by: string;
          canga_student_id: string;
          created_at?: string;
          id?: string;
          is_current?: boolean;
          notes?: string | null;
          student_id: string;
        };
        Update: {
          assigned_at?: string;
          assigned_by?: string;
          canga_student_id?: string;
          created_at?: string;
          id?: string;
          is_current?: boolean;
          notes?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "canga_assignments_canga_student_id_fkey";
            columns: ["canga_student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canga_assignments_canga_student_id_fkey";
            columns: ["canga_student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canga_assignments_canga_student_id_fkey";
            columns: ["canga_student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canga_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canga_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "canga_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      cfo_coordination_members: {
        Row: {
          active: boolean;
          created_at: string;
          designation_ref: string;
          display_order: number;
          effective_from: string;
          full_name: string;
          function_name: string;
          id: string;
          military_rank: string;
          profile_id: string | null;
          registration: string;
          service_alias: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          designation_ref: string;
          display_order: number;
          effective_from: string;
          full_name: string;
          function_name: string;
          id?: string;
          military_rank: string;
          profile_id?: string | null;
          registration: string;
          service_alias?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          designation_ref?: string;
          display_order?: number;
          effective_from?: string;
          full_name?: string;
          function_name?: string;
          id?: string;
          military_rank?: string;
          profile_id?: string | null;
          registration?: string;
          service_alias?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "cfo_coordination_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      classes: {
        Row: {
          course_id: string;
          created_at: string;
          end_date: string | null;
          id: string;
          name: string;
          start_date: string | null;
        };
        Insert: {
          course_id: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          name: string;
          start_date?: string | null;
        };
        Update: {
          course_id?: string;
          created_at?: string;
          end_date?: string | null;
          id?: string;
          name?: string;
          start_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "classes_course_id_fkey";
            columns: ["course_id"];
            isOneToOne: false;
            referencedRelation: "courses";
            referencedColumns: ["id"];
          },
        ];
      };
      courses: {
        Row: {
          code: string;
          created_at: string;
          id: string;
          name: string;
          year: number;
        };
        Insert: {
          code: string;
          created_at?: string;
          id?: string;
          name: string;
          year: number;
        };
        Update: {
          code?: string;
          created_at?: string;
          id?: string;
          name?: string;
          year?: number;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          created_at: string;
          doc_type: string;
          id: string;
          linked_health_restriction_id: string | null;
          rejection_reason: string | null;
          status: string;
          storage_path: string;
          student_id: string;
          updated_at: string;
          validated_at: string | null;
          validated_by: string | null;
        };
        Insert: {
          created_at?: string;
          doc_type: string;
          id?: string;
          linked_health_restriction_id?: string | null;
          rejection_reason?: string | null;
          status?: string;
          storage_path: string;
          student_id: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Update: {
          created_at?: string;
          doc_type?: string;
          id?: string;
          linked_health_restriction_id?: string | null;
          rejection_reason?: string | null;
          status?: string;
          storage_path?: string;
          student_id?: string;
          updated_at?: string;
          validated_at?: string | null;
          validated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "documents_linked_health_restriction_id_fkey";
            columns: ["linked_health_restriction_id"];
            isOneToOne: false;
            referencedRelation: "health_restrictions";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "documents_linked_health_restriction_id_fkey";
            columns: ["linked_health_restriction_id"];
            isOneToOne: false;
            referencedRelation: "v_health_indicator_secretaria";
            referencedColumns: ["student_id"];
          },
          {
            foreignKeyName: "documents_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "documents_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      duty_assignment_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          after_data: Json | null;
          assignment_id: string | null;
          before_data: Json | null;
          created_at: string;
          id: string;
          reason: string | null;
          roster_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after_data?: Json | null;
          assignment_id?: string | null;
          before_data?: Json | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          roster_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after_data?: Json | null;
          assignment_id?: string | null;
          before_data?: Json | null;
          created_at?: string;
          id?: string;
          reason?: string | null;
          roster_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "duty_assignment_logs_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "duty_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_assignment_logs_roster_id_fkey";
            columns: ["roster_id"];
            isOneToOne: false;
            referencedRelation: "duty_rosters";
            referencedColumns: ["id"];
          },
        ];
      };
      duty_assignments: {
        Row: {
          assignment_source: string;
          class_id: string;
          created_at: string;
          created_by: string | null;
          duty_date: string;
          id: string;
          manual_reason: string | null;
          replaced_assignment_id: string | null;
          role_id: string;
          roster_id: string;
          status: string;
          student_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          assignment_source?: string;
          class_id: string;
          created_at?: string;
          created_by?: string | null;
          duty_date: string;
          id?: string;
          manual_reason?: string | null;
          replaced_assignment_id?: string | null;
          role_id: string;
          roster_id: string;
          status?: string;
          student_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assignment_source?: string;
          class_id?: string;
          created_at?: string;
          created_by?: string | null;
          duty_date?: string;
          id?: string;
          manual_reason?: string | null;
          replaced_assignment_id?: string | null;
          role_id?: string;
          roster_id?: string;
          status?: string;
          student_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "duty_assignments_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_assignments_replaced_assignment_id_fkey";
            columns: ["replaced_assignment_id"];
            isOneToOne: false;
            referencedRelation: "duty_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_assignments_role_id_fkey";
            columns: ["role_id"];
            isOneToOne: false;
            referencedRelation: "duty_roles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_assignments_roster_id_fkey";
            columns: ["roster_id"];
            isOneToOne: false;
            referencedRelation: "duty_rosters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      duty_impediments: {
        Row: {
          active: boolean;
          affected_role_ids: string[] | null;
          created_at: string;
          ends_on: string;
          id: string;
          impediment_type: string;
          operational_note: string | null;
          reason: string;
          registered_by: string | null;
          starts_on: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          affected_role_ids?: string[] | null;
          created_at?: string;
          ends_on: string;
          id?: string;
          impediment_type: string;
          operational_note?: string | null;
          reason: string;
          registered_by?: string | null;
          starts_on: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          affected_role_ids?: string[] | null;
          created_at?: string;
          ends_on?: string;
          id?: string;
          impediment_type?: string;
          operational_note?: string | null;
          reason?: string;
          registered_by?: string | null;
          starts_on?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "duty_impediments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_impediments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "duty_impediments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      duty_roles: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          sort_order: number;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          sort_order: number;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          sort_order?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
      duty_rosters: {
        Row: {
          class_id: string;
          created_at: string;
          generated_at: string | null;
          generated_by: string | null;
          id: string;
          notes: string | null;
          period_end: string;
          period_start: string;
          published_at: string | null;
          published_by: string | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          class_id: string;
          created_at?: string;
          generated_at?: string | null;
          generated_by?: string | null;
          id?: string;
          notes?: string | null;
          period_end: string;
          period_start: string;
          published_at?: string | null;
          published_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Update: {
          class_id?: string;
          created_at?: string;
          generated_at?: string | null;
          generated_by?: string | null;
          id?: string;
          notes?: string | null;
          period_end?: string;
          period_start?: string;
          published_at?: string | null;
          published_by?: string | null;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "duty_rosters_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      emergency_contacts: {
        Row: {
          address: string | null;
          created_at: string;
          full_name: string;
          id: string;
          notes: string | null;
          phone: string;
          priority: number;
          relationship: string | null;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          address?: string | null;
          created_at?: string;
          full_name: string;
          id?: string;
          notes?: string | null;
          phone: string;
          priority: number;
          relationship?: string | null;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          address?: string | null;
          created_at?: string;
          full_name?: string;
          id?: string;
          notes?: string | null;
          phone?: string;
          priority?: number;
          relationship?: string | null;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "emergency_contacts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_contacts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "emergency_contacts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment_categories: {
        Row: {
          created_at: string;
          description: string | null;
          id: string;
          name: string;
          ordinal: number;
          section_name: string;
          section_ordinal: number;
        };
        Insert: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name: string;
          ordinal: number;
          section_name?: string;
          section_ordinal?: number;
        };
        Update: {
          created_at?: string;
          description?: string | null;
          id?: string;
          name?: string;
          ordinal?: number;
          section_name?: string;
          section_ordinal?: number;
        };
        Relationships: [];
      };
      equipment_questions: {
        Row: {
          answer: string | null;
          answered_at: string | null;
          answered_by: string | null;
          asked_by: string;
          created_at: string;
          id: string;
          question: string;
          student_equipment_status_id: string;
        };
        Insert: {
          answer?: string | null;
          answered_at?: string | null;
          answered_by?: string | null;
          asked_by: string;
          created_at?: string;
          id?: string;
          question: string;
          student_equipment_status_id: string;
        };
        Update: {
          answer?: string | null;
          answered_at?: string | null;
          answered_by?: string | null;
          asked_by?: string;
          created_at?: string;
          id?: string;
          question?: string;
          student_equipment_status_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_questions_student_equipment_status_id_fkey";
            columns: ["student_equipment_status_id"];
            isOneToOne: false;
            referencedRelation: "student_equipment_status";
            referencedColumns: ["id"];
          },
        ];
      };
      equipment_requirements: {
        Row: {
          active: boolean;
          applicability: string;
          category_id: string;
          created_at: string;
          discipline: string | null;
          id: string;
          mandatory: boolean;
          name: string;
          notes: string | null;
          phase: string;
          quantity: number;
          short_description: string | null;
          subcategory: string | null;
          unit: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          applicability?: string;
          category_id: string;
          created_at?: string;
          discipline?: string | null;
          id?: string;
          mandatory?: boolean;
          name: string;
          notes?: string | null;
          phase?: string;
          quantity?: number;
          short_description?: string | null;
          subcategory?: string | null;
          unit?: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          applicability?: string;
          category_id?: string;
          created_at?: string;
          discipline?: string | null;
          id?: string;
          mandatory?: boolean;
          name?: string;
          notes?: string | null;
          phase?: string;
          quantity?: number;
          short_description?: string | null;
          subcategory?: string | null;
          unit?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "equipment_requirements_category_id_fkey";
            columns: ["category_id"];
            isOneToOne: false;
            referencedRelation: "equipment_categories";
            referencedColumns: ["id"];
          },
        ];
      };
      fo_reasons: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          id: string;
          kind: string;
          label: string;
          last_used_at: string | null;
          normalized_label: string;
          updated_at: string;
          usage_count: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind: string;
          label: string;
          last_used_at?: string | null;
          normalized_label: string;
          updated_at?: string;
          usage_count?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          kind?: string;
          label?: string;
          last_used_at?: string | null;
          normalized_label?: string;
          updated_at?: string;
          usage_count?: number;
        };
        Relationships: [];
      };
      follow_up_attachments: {
        Row: {
          created_at: string;
          file_size_bytes: number | null;
          id: string;
          manifestation_id: string | null;
          mime_type: string;
          original_filename: string;
          record_id: string;
          storage_path: string;
          uploaded_by: string | null;
        };
        Insert: {
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          manifestation_id?: string | null;
          mime_type: string;
          original_filename: string;
          record_id: string;
          storage_path: string;
          uploaded_by?: string | null;
        };
        Update: {
          created_at?: string;
          file_size_bytes?: number | null;
          id?: string;
          manifestation_id?: string | null;
          mime_type?: string;
          original_filename?: string;
          record_id?: string;
          storage_path?: string;
          uploaded_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_attachments_manifestation_id_fkey";
            columns: ["manifestation_id"];
            isOneToOne: false;
            referencedRelation: "follow_up_manifestations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_attachments_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: false;
            referencedRelation: "follow_up_records";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_decisions: {
        Row: {
          decided_at: string;
          decided_by: string | null;
          decided_by_name: string | null;
          id: string;
          outcome: string;
          rationale: string | null;
          record_id: string;
        };
        Insert: {
          decided_at?: string;
          decided_by?: string | null;
          decided_by_name?: string | null;
          id?: string;
          outcome: string;
          rationale?: string | null;
          record_id: string;
        };
        Update: {
          decided_at?: string;
          decided_by?: string | null;
          decided_by_name?: string | null;
          id?: string;
          outcome?: string;
          rationale?: string | null;
          record_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_decisions_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: true;
            referencedRelation: "follow_up_records";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_events: {
        Row: {
          actor_id: string | null;
          actor_name: string | null;
          created_at: string;
          description: string | null;
          event_type: string;
          id: string;
          payload: Json | null;
          record_id: string;
        };
        Insert: {
          actor_id?: string | null;
          actor_name?: string | null;
          created_at?: string;
          description?: string | null;
          event_type: string;
          id?: string;
          payload?: Json | null;
          record_id: string;
        };
        Update: {
          actor_id?: string | null;
          actor_name?: string | null;
          created_at?: string;
          description?: string | null;
          event_type?: string;
          id?: string;
          payload?: Json | null;
          record_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_events_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: false;
            referencedRelation: "follow_up_records";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_manifestations: {
        Row: {
          body: string;
          created_at: string;
          id: string;
          record_id: string;
          student_id: string;
          submitted_at: string;
          submitted_by: string | null;
        };
        Insert: {
          body: string;
          created_at?: string;
          id?: string;
          record_id: string;
          student_id: string;
          submitted_at?: string;
          submitted_by?: string | null;
        };
        Update: {
          body?: string;
          created_at?: string;
          id?: string;
          record_id?: string;
          student_id?: string;
          submitted_at?: string;
          submitted_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_manifestations_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: true;
            referencedRelation: "follow_up_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_manifestations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_manifestations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_manifestations_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_notifications: {
        Row: {
          channel: string;
          created_at: string;
          id: string;
          kind: string;
          last_error: string | null;
          payload: Json;
          provider_message_id: string | null;
          recipient_key: string;
          record_id: string;
          sent_at: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          channel: string;
          created_at?: string;
          id?: string;
          kind: string;
          last_error?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          recipient_key: string;
          record_id: string;
          sent_at?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          channel?: string;
          created_at?: string;
          id?: string;
          kind?: string;
          last_error?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          recipient_key?: string;
          record_id?: string;
          sent_at?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_notifications_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: false;
            referencedRelation: "follow_up_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_notifications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_notifications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_notifications_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_punishments: {
        Row: {
          completed_at: string | null;
          created_at: string;
          created_by: string | null;
          id: string;
          instructions: string | null;
          punishment_option_id: string | null;
          punishment_text: string;
          record_id: string;
          status: string;
          status_notes: string | null;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          instructions?: string | null;
          punishment_option_id?: string | null;
          punishment_text: string;
          record_id: string;
          status?: string;
          status_notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          completed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          instructions?: string | null;
          punishment_option_id?: string | null;
          punishment_text?: string;
          record_id?: string;
          status?: string;
          status_notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_punishments_punishment_option_id_fkey";
            columns: ["punishment_option_id"];
            isOneToOne: false;
            referencedRelation: "punishment_options";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_punishments_record_id_fkey";
            columns: ["record_id"];
            isOneToOne: true;
            referencedRelation: "follow_up_records";
            referencedColumns: ["id"];
          },
        ];
      };
      follow_up_records: {
        Row: {
          auto_generated: boolean;
          class_id: string | null;
          closed_at: string | null;
          created_at: string;
          created_by: string | null;
          created_by_name: string | null;
          deadline_at: string | null;
          id: string;
          notes: string | null;
          occurred_at: string;
          origin_record_id: string | null;
          reason_id: string | null;
          reason_text: string;
          requires_manifestation: boolean;
          status: string;
          student_id: string;
          type: string;
          updated_at: string;
        };
        Insert: {
          auto_generated?: boolean;
          class_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_name?: string | null;
          deadline_at?: string | null;
          id?: string;
          notes?: string | null;
          occurred_at?: string;
          origin_record_id?: string | null;
          reason_id?: string | null;
          reason_text: string;
          requires_manifestation?: boolean;
          status: string;
          student_id: string;
          type: string;
          updated_at?: string;
        };
        Update: {
          auto_generated?: boolean;
          class_id?: string | null;
          closed_at?: string | null;
          created_at?: string;
          created_by?: string | null;
          created_by_name?: string | null;
          deadline_at?: string | null;
          id?: string;
          notes?: string | null;
          occurred_at?: string;
          origin_record_id?: string | null;
          reason_id?: string | null;
          reason_text?: string;
          requires_manifestation?: boolean;
          status?: string;
          student_id?: string;
          type?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "follow_up_records_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_records_origin_record_id_fkey";
            columns: ["origin_record_id"];
            isOneToOne: false;
            referencedRelation: "follow_up_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_records_reason_id_fkey";
            columns: ["reason_id"];
            isOneToOne: false;
            referencedRelation: "fo_reasons";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_records_reason_id_fkey";
            columns: ["reason_id"];
            isOneToOne: false;
            referencedRelation: "v_fo_reason_stats";
            referencedColumns: ["reason_id"];
          },
          {
            foreignKeyName: "follow_up_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "follow_up_records_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      health_restrictions: {
        Row: {
          allergies: string | null;
          altura_cm: number | null;
          blood_type: string | null;
          chronic_disease: string | null;
          cirurgia_ocular: boolean | null;
          cirurgia_ocular_obs: string | null;
          continuous_medication: string | null;
          created_at: string;
          dietary_restriction: string | null;
          has_allergies: boolean | null;
          has_chronic_disease: boolean | null;
          has_continuous_medication: boolean | null;
          has_dietary_restriction: boolean | null;
          has_eye_surgery: boolean | null;
          has_physical_restriction: boolean | null;
          last_updated_at: string;
          medical_declaration_doc_id: string | null;
          medical_doc_waived: boolean;
          medical_doc_waived_at: string | null;
          medical_doc_waived_by: string | null;
          medical_doc_waived_reason: string | null;
          medical_notes: string | null;
          operational_summary: string | null;
          peso_kg: number | null;
          physical_restriction: string | null;
          rh_factor: string | null;
          student_id: string;
          updated_at: string;
          uses_glasses: boolean | null;
          validated_at: string | null;
          validated_by: string | null;
          validation_status: string;
        };
        Insert: {
          allergies?: string | null;
          altura_cm?: number | null;
          blood_type?: string | null;
          chronic_disease?: string | null;
          cirurgia_ocular?: boolean | null;
          cirurgia_ocular_obs?: string | null;
          continuous_medication?: string | null;
          created_at?: string;
          dietary_restriction?: string | null;
          has_allergies?: boolean | null;
          has_chronic_disease?: boolean | null;
          has_continuous_medication?: boolean | null;
          has_dietary_restriction?: boolean | null;
          has_eye_surgery?: boolean | null;
          has_physical_restriction?: boolean | null;
          last_updated_at?: string;
          medical_declaration_doc_id?: string | null;
          medical_doc_waived?: boolean;
          medical_doc_waived_at?: string | null;
          medical_doc_waived_by?: string | null;
          medical_doc_waived_reason?: string | null;
          medical_notes?: string | null;
          operational_summary?: string | null;
          peso_kg?: number | null;
          physical_restriction?: string | null;
          rh_factor?: string | null;
          student_id: string;
          updated_at?: string;
          uses_glasses?: boolean | null;
          validated_at?: string | null;
          validated_by?: string | null;
          validation_status?: string;
        };
        Update: {
          allergies?: string | null;
          altura_cm?: number | null;
          blood_type?: string | null;
          chronic_disease?: string | null;
          cirurgia_ocular?: boolean | null;
          cirurgia_ocular_obs?: string | null;
          continuous_medication?: string | null;
          created_at?: string;
          dietary_restriction?: string | null;
          has_allergies?: boolean | null;
          has_chronic_disease?: boolean | null;
          has_continuous_medication?: boolean | null;
          has_dietary_restriction?: boolean | null;
          has_eye_surgery?: boolean | null;
          has_physical_restriction?: boolean | null;
          last_updated_at?: string;
          medical_declaration_doc_id?: string | null;
          medical_doc_waived?: boolean;
          medical_doc_waived_at?: string | null;
          medical_doc_waived_by?: string | null;
          medical_doc_waived_reason?: string | null;
          medical_notes?: string | null;
          operational_summary?: string | null;
          peso_kg?: number | null;
          physical_restriction?: string | null;
          rh_factor?: string | null;
          student_id?: string;
          updated_at?: string;
          uses_glasses?: boolean | null;
          validated_at?: string | null;
          validated_by?: string | null;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_health_medical_doc";
            columns: ["medical_declaration_doc_id"];
            isOneToOne: false;
            referencedRelation: "documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_restrictions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_restrictions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_restrictions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_attendance_points: {
        Row: {
          accuracy_m: number;
          assignment_id: string;
          distance_m: number | null;
          id: string;
          latitude: number;
          location_status: string;
          longitude: number;
          point_type: string;
          recorded_at: string;
          recorded_by: string;
          site_latitude: number | null;
          site_longitude: number | null;
          site_radius_m: number | null;
          student_id: string;
          supervisor_name: string | null;
        };
        Insert: {
          accuracy_m: number;
          assignment_id: string;
          distance_m?: number | null;
          id?: string;
          latitude: number;
          location_status: string;
          longitude: number;
          point_type: string;
          recorded_at?: string;
          recorded_by: string;
          site_latitude?: number | null;
          site_longitude?: number | null;
          site_radius_m?: number | null;
          student_id: string;
          supervisor_name?: string | null;
        };
        Update: {
          accuracy_m?: number;
          assignment_id?: string;
          distance_m?: number | null;
          id?: string;
          latitude?: number;
          location_status?: string;
          longitude?: number;
          point_type?: string;
          recorded_at?: string;
          recorded_by?: string;
          site_latitude?: number | null;
          site_longitude?: number | null;
          site_radius_m?: number | null;
          student_id?: string;
          supervisor_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "internship_attendance_points_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_attendance_points_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_official_workload";
            referencedColumns: ["assignment_id"];
          },
          {
            foreignKeyName: "internship_attendance_points_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_attendance_points_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_attendance_points_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_shift_uniforms: {
        Row: { id: string; shift_id: string; uniform_code: string; reason: string; updated_by: string; updated_at: string };
        Insert: { id?: string; shift_id: string; uniform_code: string; reason: string; updated_by: string; updated_at?: string };
        Update: { id?: string; shift_id?: string; uniform_code?: string; reason?: string; updated_by?: string; updated_at?: string };
        Relationships: [{ foreignKeyName: "internship_shift_uniforms_shift_id_fkey"; columns: ["shift_id"]; isOneToOne: true; referencedRelation: "internship_shifts"; referencedColumns: ["id"] }];
      };
      internship_site_locations: {
        Row: {
          latitude: number;
          longitude: number;
          radius_m: number;
          site_id: string;
          updated_at: string;
          updated_by: string;
        };
        Insert: {
          latitude: number;
          longitude: number;
          radius_m: number;
          site_id: string;
          updated_at?: string;
          updated_by: string;
        };
        Update: {
          latitude?: number;
          longitude?: number;
          radius_m?: number;
          site_id?: string;
          updated_at?: string;
          updated_by?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_site_locations_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: true;
            referencedRelation: "internship_sites";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_activity_types: {
        Row: {
          active: boolean;
          code: string;
          default_minutes: number;
          id: string;
          name: string;
          program_id: string;
          requires_operation_plan: boolean;
          training_axis: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          default_minutes: number;
          id?: string;
          name: string;
          program_id: string;
          requires_operation_plan?: boolean;
          training_axis: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          default_minutes?: number;
          id?: string;
          name?: string;
          program_id?: string;
          requires_operation_plan?: boolean;
          training_axis?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_activity_types_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_handovers: {
        Row: { id: string; outgoing_assignment_id: string; outgoing_shift_id: string;
          incoming_assignment_id: string; incoming_shift_id: string; original_starts_at: string;
          original_ends_at: string; handover_at: string; reason: string; created_by: string; created_at: string };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      internship_assignments: {
        Row: {
          assignment_source: string;
          created_at: string;
          created_by: string | null;
          id: string;
          reason: string | null;
          replaces_assignment_id: string | null;
          shift_id: string;
          status: string;
          student_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          assignment_source?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          reason?: string | null;
          replaces_assignment_id?: string | null;
          shift_id: string;
          status?: string;
          student_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          assignment_source?: string;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          reason?: string | null;
          replaces_assignment_id?: string | null;
          shift_id?: string;
          status?: string;
          student_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "internship_assignments_replaces_assignment_id_fkey";
            columns: ["replaces_assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_assignments_replaces_assignment_id_fkey";
            columns: ["replaces_assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_official_workload";
            referencedColumns: ["assignment_id"];
          },
          {
            foreignKeyName: "internship_assignments_shift_id_fkey";
            columns: ["shift_id"];
            isOneToOne: false;
            referencedRelation: "internship_shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_cadet_reports: {
        Row: {
          assignment_id: string;
          id: string;
          reason: string | null;
          report_type: string;
          reported_at: string;
          reported_by: string;
          reported_exit_at: string | null;
          student_id: string;
        };
        Insert: {
          assignment_id: string;
          id?: string;
          reason?: string | null;
          report_type: string;
          reported_at?: string;
          reported_by: string;
          reported_exit_at?: string | null;
          student_id: string;
        };
        Update: {
          assignment_id?: string;
          id?: string;
          reason?: string | null;
          report_type?: string;
          reported_at?: string;
          reported_by?: string;
          reported_exit_at?: string | null;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_cadet_reports_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_cadet_reports_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_official_workload";
            referencedColumns: ["assignment_id"];
          },
          {
            foreignKeyName: "internship_cadet_reports_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_cadet_reports_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_cadet_reports_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_change_requests: {
        Row: {
          id: string;
          assignment_id: string;
          other_assignment_id: string | null;
          change_type: string;
          new_student_id: string | null;
          resource_id: string | null;
          starts_at: string | null;
          ends_at: string | null;
          handover_at: string | null;
          supervisor_name: string | null;
          reason_kind: string | null;
          reason_details: string | null;
          impediment_until: string | null;
          reason: string | null;
          status: string;
          requested_by: string;
          requested_at: string;
          decided_by: string | null;
          decided_at: string | null;
          decision_note: string | null;
          result_id: string | null;
        };
        Insert: never;
        Update: never;
        Relationships: [];
      };
      internship_execution_records: {
        Row: {
          actual_ends_at: string | null;
          actual_starts_at: string | null;
          approved_minutes: number | null;
          assignment_id: string;
          attendance_status: string;
          calculated_minutes: number | null;
          decision_reason: string | null;
          entered_at: string;
          entered_by: string;
          id: string;
          occurrence_justified: boolean | null;
          occurrence_reason: string | null;
          paper_reference: string | null;
          revision_of_id: string | null;
          supervisor_name: string | null;
          supervisor_rank: string | null;
          supervisor_unit: string | null;
          validated_at: string | null;
          validated_by: string | null;
          validation_status: string;
        };
        Insert: {
          actual_ends_at?: string | null;
          actual_starts_at?: string | null;
          approved_minutes?: number | null;
          assignment_id: string;
          attendance_status: string;
          calculated_minutes?: number | null;
          decision_reason?: string | null;
          entered_at?: string;
          entered_by: string;
          id?: string;
          occurrence_justified?: boolean | null;
          occurrence_reason?: string | null;
          paper_reference?: string | null;
          revision_of_id?: string | null;
          supervisor_name?: string | null;
          supervisor_rank?: string | null;
          supervisor_unit?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          validation_status: string;
        };
        Update: {
          actual_ends_at?: string | null;
          actual_starts_at?: string | null;
          approved_minutes?: number | null;
          assignment_id?: string;
          attendance_status?: string;
          calculated_minutes?: number | null;
          decision_reason?: string | null;
          entered_at?: string;
          entered_by?: string;
          id?: string;
          occurrence_justified?: boolean | null;
          occurrence_reason?: string | null;
          paper_reference?: string | null;
          revision_of_id?: string | null;
          supervisor_name?: string | null;
          supervisor_rank?: string | null;
          supervisor_unit?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_execution_records_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_execution_records_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_official_workload";
            referencedColumns: ["assignment_id"];
          },
          {
            foreignKeyName: "internship_execution_records_revision_of_id_fkey";
            columns: ["revision_of_id"];
            isOneToOne: true;
            referencedRelation: "internship_execution_records";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_execution_records_revision_of_id_fkey";
            columns: ["revision_of_id"];
            isOneToOne: true;
            referencedRelation: "internship_official_workload";
            referencedColumns: ["record_id"];
          },
        ];
      };
      internship_operation_plans: {
        Row: {
          authorized_at: string | null;
          authorized_by: string | null;
          code: string;
          created_at: string;
          created_by: string | null;
          document_reference: string | null;
          ends_at: string | null;
          id: string;
          officer_name: string | null;
          program_id: string;
          starts_at: string | null;
          status: string;
          title: string;
        };
        Insert: {
          authorized_at?: string | null;
          authorized_by?: string | null;
          code: string;
          created_at?: string;
          created_by?: string | null;
          document_reference?: string | null;
          ends_at?: string | null;
          id?: string;
          officer_name?: string | null;
          program_id: string;
          starts_at?: string | null;
          status?: string;
          title: string;
        };
        Update: {
          authorized_at?: string | null;
          authorized_by?: string | null;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          document_reference?: string | null;
          ends_at?: string | null;
          id?: string;
          officer_name?: string | null;
          program_id?: string;
          starts_at?: string | null;
          status?: string;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_operation_plans_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_programs: {
        Row: {
          abm_buffer_days: number;
          class_id: string;
          closed_at: string | null;
          closed_by: string | null;
          course_phase: string;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          name: string;
          published_at: string | null;
          published_by: string | null;
          required_minutes: number;
          starts_on: string;
          status: string;
          target_minutes: number;
          timezone: string;
        };
        Insert: {
          abm_buffer_days?: number;
          class_id: string;
          closed_at?: string | null;
          closed_by?: string | null;
          course_phase: string;
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          name: string;
          published_at?: string | null;
          published_by?: string | null;
          required_minutes: number;
          starts_on: string;
          status?: string;
          target_minutes: number;
          timezone?: string;
        };
        Update: {
          abm_buffer_days?: number;
          class_id?: string;
          closed_at?: string | null;
          closed_by?: string | null;
          course_phase?: string;
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          name?: string;
          published_at?: string | null;
          published_by?: string | null;
          required_minutes?: number;
          starts_on?: string;
          status?: string;
          target_minutes?: number;
          timezone?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_programs_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_resources: {
        Row: {
          active: boolean;
          capacity_per_shift: number;
          code: string;
          display_name: string;
          id: string;
          regular_team_size: number | null;
          resource_type: string;
          site_id: string;
        };
        Insert: {
          active?: boolean;
          capacity_per_shift?: number;
          code: string;
          display_name: string;
          id?: string;
          regular_team_size?: number | null;
          resource_type: string;
          site_id: string;
        };
        Update: {
          active?: boolean;
          capacity_per_shift?: number;
          code?: string;
          display_name?: string;
          id?: string;
          regular_team_size?: number | null;
          resource_type?: string;
          site_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_resources_site_id_fkey";
            columns: ["site_id"];
            isOneToOne: false;
            referencedRelation: "internship_sites";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_shift_templates: {
        Row: {
          counting_start_time: string;
          includes_travel: boolean;
          revision: number;
          abm_departure_time: string | null;
          abm_return_time: string | null;
          active: boolean;
          activity_type_id: string;
          code: string;
          end_day_offset: number;
          id: string;
          journey_minutes: number;
          name: string;
          obm_arrival_time: string;
          obm_departure_time: string;
          program_id: string;
          start_weekdays: number[];
        };
        Insert: {
          counting_start_time?: never;
          includes_travel?: boolean;
          revision?: number;
          abm_departure_time: string | null;
          abm_return_time: string | null;
          active?: boolean;
          activity_type_id: string;
          code: string;
          end_day_offset: number;
          id?: string;
          journey_minutes: number;
          name: string;
          obm_arrival_time: string;
          obm_departure_time: string;
          program_id: string;
          start_weekdays: number[];
        };
        Update: {
          counting_start_time?: never;
          includes_travel?: boolean;
          revision?: number;
          abm_departure_time?: string | null;
          abm_return_time?: string | null;
          active?: boolean;
          activity_type_id?: string;
          code?: string;
          end_day_offset?: number;
          id?: string;
          journey_minutes?: number;
          name?: string;
          obm_arrival_time?: string;
          obm_departure_time?: string;
          program_id?: string;
          start_weekdays?: number[];
        };
        Relationships: [
          {
            foreignKeyName: "internship_shift_templates_activity_type_id_program_id_fkey";
            columns: ["activity_type_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "internship_activity_types";
            referencedColumns: ["id", "program_id"];
          },
          {
            foreignKeyName: "internship_shift_templates_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_shifts: {
        Row: {
          activity_type_id: string;
          additional_member_required: boolean;
          capacity: number;
          change_reason: string | null;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          operation_plan_id: string | null;
          planned_minutes: number | null;
          planned_supervisor_name: string | null;
          program_id: string;
          published_at: string | null;
          published_by: string | null;
          resource_id: string;
          site_id: string;
          starts_at: string;
          status: string;
          template_id: string | null;
        };
        Insert: {
          activity_type_id: string;
          additional_member_required?: boolean;
          capacity: number;
          change_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          operation_plan_id?: string | null;
          planned_minutes?: number | null;
          planned_supervisor_name?: string | null;
          program_id: string;
          published_at?: string | null;
          published_by?: string | null;
          resource_id: string;
          site_id: string;
          starts_at: string;
          status?: string;
          template_id?: string | null;
        };
        Update: {
          activity_type_id?: string;
          additional_member_required?: boolean;
          capacity?: number;
          change_reason?: string | null;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          operation_plan_id?: string | null;
          planned_minutes?: number | null;
          planned_supervisor_name?: string | null;
          program_id?: string;
          published_at?: string | null;
          published_by?: string | null;
          resource_id?: string;
          site_id?: string;
          starts_at?: string;
          status?: string;
          template_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "internship_shifts_activity_type_id_program_id_fkey";
            columns: ["activity_type_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "internship_activity_types";
            referencedColumns: ["id", "program_id"];
          },
          {
            foreignKeyName: "internship_shifts_operation_plan_id_program_id_fkey";
            columns: ["operation_plan_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "internship_operation_plans";
            referencedColumns: ["id", "program_id"];
          },
          {
            foreignKeyName: "internship_shifts_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_shifts_resource_id_site_id_fkey";
            columns: ["resource_id", "site_id"];
            isOneToOne: false;
            referencedRelation: "internship_resources";
            referencedColumns: ["id", "site_id"];
          },
          {
            foreignKeyName: "internship_shifts_site_id_program_id_fkey";
            columns: ["site_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "internship_sites";
            referencedColumns: ["id", "program_id"];
          },
          {
            foreignKeyName: "internship_shifts_template_id_program_id_fkey";
            columns: ["template_id", "program_id"];
            isOneToOne: false;
            referencedRelation: "internship_shift_templates";
            referencedColumns: ["id", "program_id"];
          },
        ];
      };
      internship_sites: {
        Row: {
          active: boolean;
          code: string;
          gbm_number: number | null;
          id: string;
          name: string;
          program_id: string;
          site_type: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          gbm_number?: number | null;
          id?: string;
          name: string;
          program_id: string;
          site_type: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          gbm_number?: number | null;
          id?: string;
          name?: string;
          program_id?: string;
          site_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_sites_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_weekly_publications: {
        Row: {
          created_at: string;
          created_by: string;
          payload: Json;
          program_id: string;
          request_id: string;
          shift_ids: string[];
          week_start: string;
        };
        Insert: {
          created_at?: string;
          created_by: string;
          payload: Json;
          program_id: string;
          request_id: string;
          shift_ids: string[];
          week_start: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          payload?: Json;
          program_id?: string;
          request_id?: string;
          shift_ids?: string[];
          week_start?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_weekly_publications_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_instruction_blocks: {
        Row: {
          updated_at: string;
          active: boolean;
          created_at: string;
          created_by: string | null;
          ends_at: string;
          id: string;
          program_id: string;
          source_reference: string;
          starts_at: string;
          title: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          ends_at: string;
          id?: string;
          program_id: string;
          source_reference: string;
          starts_at: string;
          title: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          ends_at?: string;
          id?: string;
          program_id?: string;
          source_reference?: string;
          starts_at?: string;
          title?: string;
        };
        Relationships: [];
      };
      internship_lifeguard_windows: {
        Row: {
          ends_at: string;
          program_id: string;
          reason: string;
          shift_date: string;
          starts_at: string;
        };
        Insert: {
          ends_at: string;
          program_id: string;
          reason: string;
          shift_date: string;
          starts_at: string;
        };
        Update: {
          ends_at?: string;
          program_id?: string;
          reason?: string;
          shift_date?: string;
          starts_at?: string;
        };
        Relationships: [];
      };
      internship_student_blackouts: {
        Row: {
          blocked_weekdays: number[];
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          program_id: string;
          reason: string;
          starts_on: string;
          student_id: string;
          window_minutes: number | null;
          window_start: string | null;
          window_start_dow: number | null;
        };
        Insert: {
          blocked_weekdays: number[];
          created_at?: string;
          created_by?: string | null;
          ends_on: string;
          id?: string;
          program_id: string;
          reason: string;
          starts_on: string;
          student_id: string;
          window_minutes?: number | null;
          window_start?: string | null;
          window_start_dow?: number | null;
        };
        Update: {
          blocked_weekdays?: number[];
          created_at?: string;
          created_by?: string | null;
          ends_on?: string;
          id?: string;
          program_id?: string;
          reason?: string;
          starts_on?: string;
          student_id?: string;
          window_minutes?: number | null;
          window_start?: string | null;
          window_start_dow?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: "internship_student_blackouts_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_student_blackouts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_student_blackouts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_student_blackouts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_diary_entries: {
        Row: {
          assignment_id: string | null;
          companion_ids: string[];
          created_at: string;
          description: string | null;
          featured_at: string | null;
          featured_by: string | null;
          hidden_at: string | null;
          hidden_by: string | null;
          hidden_reason: string | null;
          id: string;
          occurred_on: string;
          occurrence_type: string | null;
          occurrence_types: string[];
          other_type: string | null;
          participation: string | null;
          perception: string | null;
          protocol_number: string | null;
          severity: string | null;
          shared_at: string | null;
          status: string;
          student_id: string;
          summary: string;
          updated_at: string;
          vehicle: string | null;
          vehicles: string[];
        };
        Insert: {
          assignment_id?: string | null;
          companion_ids?: string[];
          created_at?: string;
          description?: string | null;
          featured_at?: string | null;
          featured_by?: string | null;
          hidden_at?: string | null;
          hidden_by?: string | null;
          hidden_reason?: string | null;
          id?: string;
          occurred_on?: string;
          occurrence_type?: string | null;
          occurrence_types?: string[];
          other_type?: string | null;
          participation?: string | null;
          perception?: string | null;
          protocol_number?: string | null;
          severity?: string | null;
          shared_at?: string | null;
          status?: string;
          student_id: string;
          summary?: string;
          updated_at?: string;
          vehicle?: string | null;
          vehicles?: string[];
        };
        Update: {
          assignment_id?: string | null;
          companion_ids?: string[];
          created_at?: string;
          description?: string | null;
          featured_at?: string | null;
          featured_by?: string | null;
          hidden_at?: string | null;
          hidden_by?: string | null;
          hidden_reason?: string | null;
          id?: string;
          occurred_on?: string;
          occurrence_type?: string | null;
          occurrence_types?: string[];
          other_type?: string | null;
          participation?: string | null;
          perception?: string | null;
          protocol_number?: string | null;
          severity?: string | null;
          shared_at?: string | null;
          status?: string;
          student_id?: string;
          summary?: string;
          updated_at?: string;
          vehicle?: string | null;
          vehicles?: string[];
        };
        Relationships: [
          {
            foreignKeyName: "internship_diary_entries_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "internship_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_diary_entries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
        ];
      };
      internship_diary_reactions: {
        Row: {
          created_at: string;
          entry_id: string;
          kind: string;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          entry_id: string;
          kind: string;
          user_id?: string;
        };
        Update: {
          created_at?: string;
          entry_id?: string;
          kind?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "internship_diary_reactions_entry_id_fkey";
            columns: ["entry_id"];
            isOneToOne: false;
            referencedRelation: "internship_diary_entries";
            referencedColumns: ["id"];
          },
        ];
      };
      notification_deliveries: {
        Row: {
          alert_kind: string;
          alert_on: string;
          birthday_on: string;
          channel: string;
          created_at: string;
          id: string;
          last_error: string | null;
          payload: Json;
          provider_message_id: string | null;
          recipient_key: string;
          sent_at: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          alert_kind: string;
          alert_on: string;
          birthday_on: string;
          channel: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          recipient_key: string;
          sent_at?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          alert_kind?: string;
          alert_on?: string;
          birthday_on?: string;
          channel?: string;
          created_at?: string;
          id?: string;
          last_error?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          recipient_key?: string;
          sent_at?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_deliveries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "notification_deliveries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      pending_changes: {
        Row: {
          context: string;
          created_at: string;
          entity: string;
          field: string;
          id: string;
          new_value: Json | null;
          previous_value: Json | null;
          reason: string | null;
          requested_by: string;
          resolved_at: string | null;
          resolved_by: string | null;
          status: string;
          student_id: string;
        };
        Insert: {
          context: string;
          created_at?: string;
          entity: string;
          field: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
          reason?: string | null;
          requested_by: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          student_id: string;
        };
        Update: {
          context?: string;
          created_at?: string;
          entity?: string;
          field?: string;
          id?: string;
          new_value?: Json | null;
          previous_value?: Json | null;
          reason?: string | null;
          requested_by?: string;
          resolved_at?: string | null;
          resolved_by?: string | null;
          status?: string;
          student_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "pending_changes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_changes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "pending_changes_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      profiles: {
        Row: {
          active: boolean;
          created_at: string;
          full_name: string;
          id: string;
          role: string;
          student_id: string | null;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          full_name: string;
          id: string;
          role: string;
          student_id?: string | null;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          full_name?: string;
          id?: string;
          role?: string;
          student_id?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "fk_profiles_student";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_profiles_student";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "fk_profiles_student";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      punishment_options: {
        Row: {
          active: boolean;
          created_at: string;
          created_by: string | null;
          id: string;
          label: string;
          last_used_at: string | null;
          normalized_label: string;
          updated_at: string;
          usage_count: number;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          label: string;
          last_used_at?: string | null;
          normalized_label: string;
          updated_at?: string;
          usage_count?: number;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          created_by?: string | null;
          id?: string;
          label?: string;
          last_used_at?: string | null;
          normalized_label?: string;
          updated_at?: string;
          usage_count?: number;
        };
        Relationships: [];
      };
      push_subscriptions: {
        Row: {
          auth: string;
          created_at: string;
          enabled: boolean;
          endpoint: string;
          id: string;
          p256dh: string;
          updated_at: string;
          user_agent: string | null;
          user_id: string;
        };
        Insert: {
          auth: string;
          created_at?: string;
          enabled?: boolean;
          endpoint: string;
          id?: string;
          p256dh: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id: string;
        };
        Update: {
          auth?: string;
          created_at?: string;
          enabled?: boolean;
          endpoint?: string;
          id?: string;
          p256dh?: string;
          updated_at?: string;
          user_agent?: string | null;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey";
            columns: ["user_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      qts_activities: {
        Row: {
          activity: string;
          activity_date: string;
          created_at: string;
          document_id: string;
          ends_at: string | null;
          id: string;
          instructor: string | null;
          is_break: boolean;
          location: string | null;
          sequence: number;
          source_line: string;
          starts_at: string | null;
          uniform: string | null;
          workload: string | null;
        };
        Insert: {
          activity: string;
          activity_date: string;
          created_at?: string;
          document_id: string;
          ends_at?: string | null;
          id?: string;
          instructor?: string | null;
          is_break?: boolean;
          location?: string | null;
          sequence: number;
          source_line?: string;
          starts_at?: string | null;
          uniform?: string | null;
          workload?: string | null;
        };
        Update: {
          activity?: string;
          activity_date?: string;
          created_at?: string;
          document_id?: string;
          ends_at?: string | null;
          id?: string;
          instructor?: string | null;
          is_break?: boolean;
          location?: string | null;
          sequence?: number;
          source_line?: string;
          starts_at?: string | null;
          uniform?: string | null;
          workload?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "qts_activities_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      qts_activity_adjustments: {
        Row: {
          active: boolean;
          activity_date: string;
          created_at: string;
          created_by: string | null;
          expected_activity: string;
          id: string;
          reason: string;
          replacement_activity: string;
          replacement_instructor: string | null;
          replacement_workload: string | null;
          starts_at: string;
        };
        Insert: {
          active?: boolean;
          activity_date: string;
          created_at?: string;
          created_by?: string | null;
          expected_activity: string;
          id?: string;
          reason: string;
          replacement_activity: string;
          replacement_instructor?: string | null;
          replacement_workload?: string | null;
          starts_at: string;
        };
        Update: {
          active?: boolean;
          activity_date?: string;
          created_at?: string;
          created_by?: string | null;
          expected_activity?: string;
          id?: string;
          reason?: string;
          replacement_activity?: string;
          replacement_instructor?: string | null;
          replacement_workload?: string | null;
          starts_at?: string;
        };
        Relationships: [];
      };
      schedule_assignments: {
        Row: {
          candidate_id: string | null;
          confidence: number | null;
          correction_reason: string | null;
          created_at: string;
          document_id: string;
          duty_date: string | null;
          duty_function: string | null;
          id: string;
          match_method: string;
          published_at: string;
          published_by: string | null;
          status: string;
          student_id: string;
          supersedes_assignment_id: string | null;
        };
        Insert: {
          candidate_id?: string | null;
          confidence?: number | null;
          correction_reason?: string | null;
          created_at?: string;
          document_id: string;
          duty_date?: string | null;
          duty_function?: string | null;
          id?: string;
          match_method: string;
          published_at?: string;
          published_by?: string | null;
          status?: string;
          student_id: string;
          supersedes_assignment_id?: string | null;
        };
        Update: {
          candidate_id?: string | null;
          confidence?: number | null;
          correction_reason?: string | null;
          created_at?: string;
          document_id?: string;
          duty_date?: string | null;
          duty_function?: string | null;
          id?: string;
          match_method?: string;
          published_at?: string;
          published_by?: string | null;
          status?: string;
          student_id?: string;
          supersedes_assignment_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_assignments_candidate_id_fkey";
            columns: ["candidate_id"];
            isOneToOne: false;
            referencedRelation: "schedule_candidates";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_assignments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_assignments_supersedes_assignment_id_fkey";
            columns: ["supersedes_assignment_id"];
            isOneToOne: false;
            referencedRelation: "schedule_assignments";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_audit_events: {
        Row: {
          action: string;
          actor_id: string | null;
          actor_role: string | null;
          after_data: Json | null;
          before_data: Json | null;
          created_at: string;
          document_id: string | null;
          entity: string;
          entity_id: string;
          id: number;
          reason: string | null;
          student_id: string | null;
        };
        Insert: {
          action: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          document_id?: string | null;
          entity: string;
          entity_id: string;
          id?: never;
          reason?: string | null;
          student_id?: string | null;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          actor_role?: string | null;
          after_data?: Json | null;
          before_data?: Json | null;
          created_at?: string;
          document_id?: string | null;
          entity?: string;
          entity_id?: string;
          id?: never;
          reason?: string | null;
          student_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_audit_events_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_audit_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_audit_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_audit_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_candidates: {
        Row: {
          candidate_student_ids: string[];
          confidence: number | null;
          created_at: string;
          document_id: string;
          duty_date: string | null;
          duty_function: string | null;
          id: string;
          match_reasons: Json;
          match_status: string;
          matched_student_id: string | null;
          original_line: string;
          raw_name: string | null;
          resolution_reason: string | null;
          resolved_at: string | null;
          resolved_by: string | null;
          run_id: string;
          sequence: number;
        };
        Insert: {
          candidate_student_ids?: string[];
          confidence?: number | null;
          created_at?: string;
          document_id: string;
          duty_date?: string | null;
          duty_function?: string | null;
          id?: string;
          match_reasons?: Json;
          match_status: string;
          matched_student_id?: string | null;
          original_line: string;
          raw_name?: string | null;
          resolution_reason?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          run_id: string;
          sequence: number;
        };
        Update: {
          candidate_student_ids?: string[];
          confidence?: number | null;
          created_at?: string;
          document_id?: string;
          duty_date?: string | null;
          duty_function?: string | null;
          id?: string;
          match_reasons?: Json;
          match_status?: string;
          matched_student_id?: string | null;
          original_line?: string;
          raw_name?: string | null;
          resolution_reason?: string | null;
          resolved_at?: string | null;
          resolved_by?: string | null;
          run_id?: string;
          sequence?: number;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_candidates_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_candidates_matched_student_id_fkey";
            columns: ["matched_student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_candidates_matched_student_id_fkey";
            columns: ["matched_student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_candidates_matched_student_id_fkey";
            columns: ["matched_student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_candidates_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "schedule_processing_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_documents: {
        Row: {
          checksum_sha256: string;
          class_id: string;
          created_at: string;
          id: string;
          mime_type: string;
          original_filename: string;
          period_end: string | null;
          period_start: string | null;
          processing_status: string;
          publication_status: string;
          published_at: string | null;
          published_by: string;
          schedule_type_id: string;
          size_bytes: number;
          storage_path: string;
          supersedes_document_id: string | null;
        };
        Insert: {
          checksum_sha256: string;
          class_id: string;
          created_at?: string;
          id?: string;
          mime_type?: string;
          original_filename: string;
          period_end?: string | null;
          period_start?: string | null;
          processing_status?: string;
          publication_status?: string;
          published_at?: string | null;
          published_by: string;
          schedule_type_id: string;
          size_bytes: number;
          storage_path: string;
          supersedes_document_id?: string | null;
        };
        Update: {
          checksum_sha256?: string;
          class_id?: string;
          created_at?: string;
          id?: string;
          mime_type?: string;
          original_filename?: string;
          period_end?: string | null;
          period_start?: string | null;
          processing_status?: string;
          publication_status?: string;
          published_at?: string | null;
          published_by?: string;
          schedule_type_id?: string;
          size_bytes?: number;
          storage_path?: string;
          supersedes_document_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_documents_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_documents_schedule_type_id_fkey";
            columns: ["schedule_type_id"];
            isOneToOne: false;
            referencedRelation: "schedule_types";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_documents_supersedes_document_id_fkey";
            columns: ["supersedes_document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_notification_deliveries: {
        Row: {
          attempts: number;
          channel: string;
          created_at: string;
          document_id: string;
          event_id: string;
          id: string;
          last_error: string | null;
          provider_message_id: string | null;
          recipient_key: string;
          sent_at: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          channel: string;
          created_at?: string;
          document_id: string;
          event_id: string;
          id?: string;
          last_error?: string | null;
          provider_message_id?: string | null;
          recipient_key: string;
          sent_at?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          created_at?: string;
          document_id?: string;
          event_id?: string;
          id?: string;
          last_error?: string | null;
          provider_message_id?: string | null;
          recipient_key?: string;
          sent_at?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_notification_deliveries_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_notification_deliveries_event_id_fkey";
            columns: ["event_id"];
            isOneToOne: false;
            referencedRelation: "schedule_notification_events";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_notification_deliveries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_notification_deliveries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_notification_deliveries_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_notification_events: {
        Row: {
          assignment_id: string;
          attempts: number;
          created_at: string;
          event_type: string;
          id: string;
          idempotency_key: string;
          last_error: string | null;
          payload: Json;
          provider_message_id: string | null;
          sent_at: string | null;
          status: string;
          student_id: string;
          updated_at: string;
        };
        Insert: {
          assignment_id: string;
          attempts?: number;
          created_at?: string;
          event_type: string;
          id?: string;
          idempotency_key: string;
          last_error?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: string;
          student_id: string;
          updated_at?: string;
        };
        Update: {
          assignment_id?: string;
          attempts?: number;
          created_at?: string;
          event_type?: string;
          id?: string;
          idempotency_key?: string;
          last_error?: string | null;
          payload?: Json;
          provider_message_id?: string | null;
          sent_at?: string | null;
          status?: string;
          student_id?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_notification_events_assignment_id_fkey";
            columns: ["assignment_id"];
            isOneToOne: false;
            referencedRelation: "schedule_assignments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_notification_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_notification_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_notification_events_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_officer_assignments: {
        Row: {
          created_at: string;
          display_name: string;
          document_id: string;
          duty_date: string;
          duty_function: string;
          ends_at: string;
          id: string;
          profile_id: string | null;
          run_id: string;
          sequence: number;
          shift: string;
          source_line: string;
          starts_at: string;
        };
        Insert: {
          created_at?: string;
          display_name: string;
          document_id: string;
          duty_date: string;
          duty_function: string;
          ends_at: string;
          id?: string;
          profile_id?: string | null;
          run_id: string;
          sequence: number;
          shift: string;
          source_line: string;
          starts_at: string;
        };
        Update: {
          created_at?: string;
          display_name?: string;
          document_id?: string;
          duty_date?: string;
          duty_function?: string;
          ends_at?: string;
          id?: string;
          profile_id?: string | null;
          run_id?: string;
          sequence?: number;
          shift?: string;
          source_line?: string;
          starts_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_officer_assignments_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_officer_assignments_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "schedule_officer_assignments_run_id_fkey";
            columns: ["run_id"];
            isOneToOne: false;
            referencedRelation: "schedule_processing_runs";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_processing_runs: {
        Row: {
          attempt: number;
          created_at: string;
          document_id: string;
          error_code: string | null;
          error_message: string | null;
          finished_at: string | null;
          id: string;
          method: string;
          metrics: Json;
          parser_revision: string | null;
          parser_version: string | null;
          requested_by: string | null;
          started_at: string | null;
          status: string;
        };
        Insert: {
          attempt: number;
          created_at?: string;
          document_id: string;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          method?: string;
          metrics?: Json;
          parser_revision?: string | null;
          parser_version?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Update: {
          attempt?: number;
          created_at?: string;
          document_id?: string;
          error_code?: string | null;
          error_message?: string | null;
          finished_at?: string | null;
          id?: string;
          method?: string;
          metrics?: Json;
          parser_revision?: string | null;
          parser_version?: string | null;
          requested_by?: string | null;
          started_at?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_processing_runs_document_id_fkey";
            columns: ["document_id"];
            isOneToOne: false;
            referencedRelation: "schedule_documents";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_reminder_deliveries: {
        Row: {
          attempts: number;
          channel: string;
          duty_date: string;
          id: string;
          last_error: string | null;
          lease_token: string;
          profile_id: string;
          recipient_key: string;
          sent_at: string | null;
          slot: string;
          status: string;
          updated_at: string;
        };
        Insert: {
          attempts?: number;
          channel: string;
          duty_date: string;
          id?: string;
          last_error?: string | null;
          lease_token?: string;
          profile_id: string;
          recipient_key: string;
          sent_at?: string | null;
          slot: string;
          status?: string;
          updated_at?: string;
        };
        Update: {
          attempts?: number;
          channel?: string;
          duty_date?: string;
          id?: string;
          last_error?: string | null;
          lease_token?: string;
          profile_id?: string;
          recipient_key?: string;
          sent_at?: string | null;
          slot?: string;
          status?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "schedule_reminder_deliveries_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      schedule_types: {
        Row: {
          active: boolean;
          code: string;
          created_at: string;
          created_by: string | null;
          description: string | null;
          id: string;
          name: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          code: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          code?: string;
          created_at?: string;
          created_by?: string | null;
          description?: string | null;
          id?: string;
          name?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      student_addresses: {
        Row: {
          city: string | null;
          district: string | null;
          from_other_state: boolean | null;
          landmark: string | null;
          origin_city: string | null;
          origin_in_amapa: boolean | null;
          origin_state: string | null;
          state: string | null;
          street: string | null;
          student_id: string;
          updated_at: string;
          updated_by: string | null;
          zip: string | null;
        };
        Insert: {
          city?: string | null;
          district?: string | null;
          from_other_state?: boolean | null;
          landmark?: string | null;
          origin_city?: string | null;
          origin_in_amapa?: boolean | null;
          origin_state?: string | null;
          state?: string | null;
          street?: string | null;
          student_id: string;
          updated_at?: string;
          updated_by?: string | null;
          zip?: string | null;
        };
        Update: {
          city?: string | null;
          district?: string | null;
          from_other_state?: boolean | null;
          landmark?: string | null;
          origin_city?: string | null;
          origin_in_amapa?: boolean | null;
          origin_state?: string | null;
          state?: string | null;
          street?: string | null;
          student_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          zip?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_addresses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_addresses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_addresses_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      student_contacts: {
        Row: {
          email_institutional: string | null;
          email_personal: string | null;
          notes: string | null;
          phone_secondary: string | null;
          student_id: string;
          updated_at: string;
          updated_by: string | null;
          whatsapp: string | null;
        };
        Insert: {
          email_institutional?: string | null;
          email_personal?: string | null;
          notes?: string | null;
          phone_secondary?: string | null;
          student_id: string;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp?: string | null;
        };
        Update: {
          email_institutional?: string | null;
          email_personal?: string | null;
          notes?: string | null;
          phone_secondary?: string | null;
          student_id?: string;
          updated_at?: string;
          updated_by?: string | null;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_contacts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_contacts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_contacts_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      student_equipment_status: {
        Row: {
          attachment_path: string | null;
          id: string;
          requirement_id: string;
          status: string;
          student_id: string;
          student_notes: string | null;
          updated_at: string;
          updated_by: string | null;
          validated_at: string | null;
          validated_by: string | null;
          validation_status: string;
        };
        Insert: {
          attachment_path?: string | null;
          id?: string;
          requirement_id: string;
          status?: string;
          student_id: string;
          student_notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          validation_status?: string;
        };
        Update: {
          attachment_path?: string | null;
          id?: string;
          requirement_id?: string;
          status?: string;
          student_id?: string;
          student_notes?: string | null;
          updated_at?: string;
          updated_by?: string | null;
          validated_at?: string | null;
          validated_by?: string | null;
          validation_status?: string;
        };
        Relationships: [
          {
            foreignKeyName: "student_equipment_status_requirement_id_fkey";
            columns: ["requirement_id"];
            isOneToOne: false;
            referencedRelation: "equipment_requirements";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_equipment_status_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_equipment_status_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_equipment_status_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      student_logistics: {
        Row: {
          course_address: string | null;
          gandola_size: string | null;
          has_family_in_ap: boolean | null;
          has_fixed_residence_macapa: boolean | null;
          local_contact: string | null;
          needs_housing: boolean | null;
          pants_size: string | null;
          student_id: string;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: {
          course_address?: string | null;
          gandola_size?: string | null;
          has_family_in_ap?: boolean | null;
          has_fixed_residence_macapa?: boolean | null;
          local_contact?: string | null;
          needs_housing?: boolean | null;
          pants_size?: string | null;
          student_id: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          course_address?: string | null;
          gandola_size?: string | null;
          has_family_in_ap?: boolean | null;
          has_fixed_residence_macapa?: boolean | null;
          local_contact?: string | null;
          needs_housing?: boolean | null;
          pants_size?: string | null;
          student_id?: string;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "student_logistics_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_logistics_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_logistics_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      student_weight_history: {
        Row: {
          created_at: string;
          created_by: string | null;
          created_by_name: string | null;
          created_by_role: string | null;
          id: string;
          measured_at: string;
          notes: string | null;
          source: string;
          student_id: string;
          updated_at: string;
          weight_kg: number;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          created_by_name?: string | null;
          created_by_role?: string | null;
          id?: string;
          measured_at?: string;
          notes?: string | null;
          source: string;
          student_id: string;
          updated_at?: string;
          weight_kg: number;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          created_by_name?: string | null;
          created_by_role?: string | null;
          id?: string;
          measured_at?: string;
          notes?: string | null;
          source?: string;
          student_id?: string;
          updated_at?: string;
          weight_kg?: number;
        };
        Relationships: [
          {
            foreignKeyName: "student_weight_history_created_by_fkey";
            columns: ["created_by"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_weight_history_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_weight_history_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "student_weight_history_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          birth_date: string | null;
          class_id: string;
          coordination_notes: string | null;
          course_status: string;
          cpf: string | null;
          created_at: string;
          created_by: string | null;
          deleted_at: string | null;
          education_level: string | null;
          enrollment_date: string | null;
          enrollment_id: string | null;
          enrollment_status: string;
          father_name: string | null;
          full_name: string;
          graduation_name: string | null;
          graduation_type: string | null;
          had_prior_military_service: boolean | null;
          has_religious_restriction: boolean | null;
          has_specialization: boolean | null;
          id: string;
          is_test: boolean;
          marital_status: string | null;
          mother_name: string | null;
          nationality: string | null;
          naturality_city: string | null;
          naturality_state: string | null;
          pelotao: string | null;
          photo_path: string | null;
          pis: string | null;
          presentation_date: string | null;
          prior_military_branch: string | null;
          prior_military_duration: string | null;
          prior_military_institution: string | null;
          prior_military_notes: string | null;
          prior_military_rank: string | null;
          professional_experience: string | null;
          religion: string | null;
          religion_other: string | null;
          religious_restriction_notes: string | null;
          rg: string | null;
          sex: string | null;
          situation: string;
          specialization_institution: string | null;
          specialization_name: string | null;
          specialization_period: string | null;
          spouse_name: string | null;
          student_number: number | null;
          updated_at: string;
          updated_by: string | null;
          voter_id: string | null;
          voter_section: string | null;
          voter_zone: string | null;
          war_name: string;
        };
        Insert: {
          birth_date?: string | null;
          class_id: string;
          coordination_notes?: string | null;
          course_status?: string;
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          education_level?: string | null;
          enrollment_date?: string | null;
          enrollment_id?: string | null;
          enrollment_status?: string;
          father_name?: string | null;
          full_name: string;
          graduation_name?: string | null;
          graduation_type?: string | null;
          had_prior_military_service?: boolean | null;
          has_religious_restriction?: boolean | null;
          has_specialization?: boolean | null;
          id?: string;
          is_test?: boolean;
          marital_status?: string | null;
          mother_name?: string | null;
          nationality?: string | null;
          naturality_city?: string | null;
          naturality_state?: string | null;
          pelotao?: string | null;
          photo_path?: string | null;
          pis?: string | null;
          presentation_date?: string | null;
          prior_military_branch?: string | null;
          prior_military_duration?: string | null;
          prior_military_institution?: string | null;
          prior_military_notes?: string | null;
          prior_military_rank?: string | null;
          professional_experience?: string | null;
          religion?: string | null;
          religion_other?: string | null;
          religious_restriction_notes?: string | null;
          rg?: string | null;
          sex?: string | null;
          situation?: string;
          specialization_institution?: string | null;
          specialization_name?: string | null;
          specialization_period?: string | null;
          spouse_name?: string | null;
          student_number?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          voter_id?: string | null;
          voter_section?: string | null;
          voter_zone?: string | null;
          war_name: string;
        };
        Update: {
          birth_date?: string | null;
          class_id?: string;
          coordination_notes?: string | null;
          course_status?: string;
          cpf?: string | null;
          created_at?: string;
          created_by?: string | null;
          deleted_at?: string | null;
          education_level?: string | null;
          enrollment_date?: string | null;
          enrollment_id?: string | null;
          enrollment_status?: string;
          father_name?: string | null;
          full_name?: string;
          graduation_name?: string | null;
          graduation_type?: string | null;
          had_prior_military_service?: boolean | null;
          has_religious_restriction?: boolean | null;
          has_specialization?: boolean | null;
          id?: string;
          is_test?: boolean;
          marital_status?: string | null;
          mother_name?: string | null;
          nationality?: string | null;
          naturality_city?: string | null;
          naturality_state?: string | null;
          pelotao?: string | null;
          photo_path?: string | null;
          pis?: string | null;
          presentation_date?: string | null;
          prior_military_branch?: string | null;
          prior_military_duration?: string | null;
          prior_military_institution?: string | null;
          prior_military_notes?: string | null;
          prior_military_rank?: string | null;
          professional_experience?: string | null;
          religion?: string | null;
          religion_other?: string | null;
          religious_restriction_notes?: string | null;
          rg?: string | null;
          sex?: string | null;
          situation?: string;
          specialization_institution?: string | null;
          specialization_name?: string | null;
          specialization_period?: string | null;
          spouse_name?: string | null;
          student_number?: number | null;
          updated_at?: string;
          updated_by?: string | null;
          voter_id?: string | null;
          voter_section?: string | null;
          voter_zone?: string | null;
          war_name?: string;
        };
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      vehicles: {
        Row: {
          available_for_deployment: boolean | null;
          cnh_attached: boolean | null;
          cnh_category: string | null;
          cnh_valid_until: string | null;
          has_cnh: boolean | null;
          has_vehicle: boolean | null;
          notes: string | null;
          plate: string | null;
          student_id: string;
          updated_at: string;
          vehicle_brand_model: string | null;
          vehicle_type: string | null;
        };
        Insert: {
          available_for_deployment?: boolean | null;
          cnh_attached?: boolean | null;
          cnh_category?: string | null;
          cnh_valid_until?: string | null;
          has_cnh?: boolean | null;
          has_vehicle?: boolean | null;
          notes?: string | null;
          plate?: string | null;
          student_id: string;
          updated_at?: string;
          vehicle_brand_model?: string | null;
          vehicle_type?: string | null;
        };
        Update: {
          available_for_deployment?: boolean | null;
          cnh_attached?: boolean | null;
          cnh_category?: string | null;
          cnh_valid_until?: string | null;
          has_cnh?: boolean | null;
          has_vehicle?: boolean | null;
          notes?: string | null;
          plate?: string | null;
          student_id?: string;
          updated_at?: string;
          vehicle_brand_model?: string | null;
          vehicle_type?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "vehicles_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicles_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "vehicles_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      internship_official_workload: {
        Row: {
          approved_minutes: number | null;
          assignment_id: string | null;
          calculated_minutes: number | null;
          planned_minutes: number | null;
          program_id: string | null;
          record_id: string | null;
          student_id: string | null;
          validated_at: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "internship_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_assignments_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: false;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "internship_shifts_program_id_fkey";
            columns: ["program_id"];
            isOneToOne: false;
            referencedRelation: "internship_programs";
            referencedColumns: ["id"];
          },
        ];
      };
      v_fo_reason_stats: {
        Row: {
          active: boolean | null;
          distinct_students: number | null;
          first_used_at: string | null;
          kind: string | null;
          label: string | null;
          last_used_at: string | null;
          reason_id: string | null;
          total_records: number | null;
          usage_count: number | null;
          uses_last_30d: number | null;
          uses_last_7d: number | null;
        };
        Relationships: [];
      };
      v_health_indicator_secretaria: {
        Row: {
          has_restriction: boolean | null;
          student_id: string | null;
          validation_status: string | null;
        };
        Insert: {
          has_restriction?: never;
          student_id?: string | null;
          validation_status?: string | null;
        };
        Update: {
          has_restriction?: never;
          student_id?: string | null;
          validation_status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "health_restrictions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "students";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_restrictions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_card_instructor";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "health_restrictions_student_id_fkey";
            columns: ["student_id"];
            isOneToOne: true;
            referencedRelation: "v_student_class_basic";
            referencedColumns: ["id"];
          },
        ];
      };
      v_student_card_instructor: {
        Row: {
          canga_number: number | null;
          canga_war_name: string | null;
          class_id: string | null;
          email_institutional: string | null;
          full_name: string | null;
          has_restriction: boolean | null;
          has_vehicle: boolean | null;
          id: string | null;
          operational_summary: string | null;
          origin_label: string | null;
          pelotao: string | null;
          photo_path: string | null;
          student_number: number | null;
          war_name: string | null;
          whatsapp: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
      v_student_class_basic: {
        Row: {
          class_id: string | null;
          id: string | null;
          pelotao: string | null;
          photo_path: string | null;
          student_number: number | null;
          war_name: string | null;
        };
        Insert: {
          class_id?: string | null;
          id?: string | null;
          pelotao?: string | null;
          photo_path?: string | null;
          student_number?: number | null;
          war_name?: string | null;
        };
        Update: {
          class_id?: string | null;
          id?: string | null;
          pelotao?: string | null;
          photo_path?: string | null;
          student_number?: number | null;
          war_name?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_class_id_fkey";
            columns: ["class_id"];
            isOneToOne: false;
            referencedRelation: "classes";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Functions: {
      internship_is_coordinator: { Args: never; Returns: boolean };
      internship_request_pair_swap: {
        Args: { p_first_assignment_id: string; p_second_assignment_id: string; p_reason: string };
        Returns: string;
      };
      internship_homologate_pair_swap: {
        Args: { p_first_assignment_id: string; p_second_assignment_id: string; p_reason: string };
        Returns: string;
      };
      internship_request_change: {
        Args: {
          p_assignment_id: string;
          p_change_type: string;
          p_new_student_id?: string | null;
          p_resource_id?: string | null;
          p_starts_at?: string | null;
          p_ends_at?: string | null;
          p_handover_at?: string | null;
          p_supervisor_name?: string | null;
          p_reason_kind?: string | null;
          p_reason_details?: string | null;
          p_impediment_until?: string | null;
          p_reason?: string | null;
        };
        Returns: string;
      };
      internship_decide_change: {
        Args: { p_request_id: string; p_approve: boolean; p_note?: string | null };
        Returns: string | null;
      };
      internship_diary_moderate: {
        Args: { p_entry_id: string; p_action: string; p_reason?: string | null };
        Returns: undefined;
      };
      internship_confirm_instruction_standby: {Args:{p_instruction_id:string;p_assignment_id:string;p_expected_context:Json;p_confirmed:boolean};Returns:undefined};
      internship_review_instruction_conflicts: {Args:{p_program_id:string};Returns:{instruction_id:string;instruction_title:string;assignment_id:string;service_id:string;service_kind:string;site_name:string;war_name:string;starts_at:string;ends_at:string;review_context:Json;standby_confirmed:boolean}[]};
      internship_reschedule_lifeguard_day: {Args:{p_program_id:string;p_shift_date:string;p_starts_at:string;p_ends_at:string;p_expected_assignments:string[];p_expected_start:string;p_expected_end:string;p_reason:string};Returns:number};

      internship_save_instruction: { Args: {p_program_id:string;p_title:string;p_starts_at:string;p_ends_at:string;p_source_reference?:string;p_id?:string;p_expected_updated_at?:string;p_active?:boolean}; Returns:string };
      internship_instruction_conflicts: { Args: {p_program_id:string}; Returns: {instruction_id:string;instruction_title:string;assignment_id:string;service_id:string;service_kind:string;site_name:string;war_name:string;starts_at:string;ends_at:string}[] };

      internship_formalize_published_lifeguard_plan: {
        Args: { p_program_id: string; p_shift_date: string; p_document_reference: string; p_officer_name: string };
        Returns: string;
      };
      internship_finalize_lifeguard_draft: {
        Args: { p_program_id: string; p_shift_date: string; p_document_reference: string; p_officer_name: string };
        Returns: string;
      };
      internship_schedule_restart_preview: { Args: { p_program_id: string }; Returns: Json };
      internship_schedule_restart: { Args: { p_program_id: string; p_snapshot: string; p_reason: string }; Returns: string };
      permanence_dashboard_schedule: {Args: Record<PropertyKey, never>;Returns:Json};
      duty_replace_assignment: {Args: {p_assignment_id:string;p_student_id:string;p_reason:string}; Returns:string};
      permanence_planning_context: { Args: { p_program_id: string }; Returns: Json };
      permanence_stage_conflicts: {
        Args: { p_program_id: string };
        Returns: {
          duty_assignment_id: string;
          roster_id: string;
          student_id: string;
          student_number: number | null;
          war_name: string;
          duty_role: string;
          duty_starts_at: string;
          duty_ends_at: string;
          shift_id: string;
          stage_starts_at: string;
          stage_ends_at: string;
          conflict_kind: string;
        }[];
      };
      permanence_publish: { Args: {p_program_id: string; p_starts_at: string; p_ends_at: string; p_location: string; p_uniform_code: string; p_students: string[]; p_roster_id?: string; p_reason?: string}; Returns: string };
      permanence_publish_batch: { Args: {p_program_id: string; p_location: string; p_uniform_code: string; p_services: Json}; Returns: number };
      permanence_cancel: { Args: {p_roster_id:string;p_reason:string}; Returns: undefined };
      permanence_cancel_batch: { Args: {p_program_id:string;p_roster_ids:string[];p_assignment_ids:string[];p_reason:string}; Returns: number };

      internship_evaluation_assignment: { Args: { p_assignment_id: string }; Returns: Json };
      internship_create_evaluation_invite: { Args: { p_assignment_id: string; p_recipient_name: string; p_recipient_contact: string }; Returns: Json };
      internship_create_cadet_evaluation_invite: { Args: { p_assignment_id: string; p_recipient_name: string; p_recipient_contact: string }; Returns: Json };
      internship_my_evaluation_invites: { Args: Record<PropertyKey, never>; Returns: Json };
      internship_read_evaluation_invite: { Args: { p_token: string }; Returns: Json };
      internship_evaluation_whatsapp_delivery: { Args: { p_token: string }; Returns: Json };
      internship_submit_evaluation: { Args: { p_token: string; p_evaluator_name: string; p_evaluator_unit: string; p_ratings: Json; p_guidance: string; p_incident: boolean; p_incident_note: string; p_confirmed: boolean }; Returns: string };
      internship_submit_evaluation_v2: { Args: { p_token: string; p_evaluator_name: string; p_evaluator_unit: string; p_ratings: Json; p_guidance: string; p_incident: boolean; p_incident_note: string; p_confirmed: boolean; p_details: Json }; Returns: string };
      internship_record_paper_evaluation: { Args: { p_assignment_id: string; p_evaluator_name: string; p_evaluator_unit: string; p_ratings: Json; p_guidance: string; p_incident: boolean; p_incident_note: string; p_paper_reference: string }; Returns: string };
      internship_record_paper_evaluation_v2: { Args: { p_assignment_id: string; p_evaluator_name: string; p_evaluator_unit: string; p_ratings: Json; p_guidance: string; p_incident: boolean; p_incident_note: string; p_paper_reference: string; p_details: Json }; Returns: string };
      internship_review_evaluation: { Args: { p_id: string; p_decision: string; p_note: string; p_identity_confirmed: boolean }; Returns: undefined };
      internship_review_evaluation_with_whatsapp: { Args: { p_id: string; p_decision: string; p_note: string; p_identity_confirmed: boolean; p_whatsapp_sender_phone: string | null }; Returns: undefined };
      internship_revoke_evaluation_invite: { Args: { p_id: string }; Returns: undefined };
      internship_my_evaluations: { Args: Record<PropertyKey, never>; Returns: Json };
      _storage_student_id: { Args: { object_name: string }; Returns: string };
      academic_active_role: { Args: never; Returns: string };
      academic_can_grade: { Args: { p_offering_id: string }; Returns: boolean };
      academic_can_read_offering: {
        Args: { p_offering_id: string };
        Returns: boolean;
      };
      academic_close_year: {
        Args: { p_academic_year_id: string; p_reason: string };
        Returns: string;
      };
      academic_configure_policy: {
        Args: {
          p_decision_ref: string;
          p_name: string;
          p_offering_id: string;
          p_parameters: Json;
        };
        Returns: string;
      };
      academic_create_manual_session: {
        Args: {
          p_ends_at: string;
          p_location?: string;
          p_offering_id: string;
          p_rescheduled_from_id?: string;
          p_scheduled_on: string;
          p_starts_at: string;
          p_title: string;
        };
        Returns: string;
      };
      academic_create_offering_ri: {
        Args: {
          p_academic_year: number;
          p_class_id: string;
          p_decision_ref: string;
          p_discipline_id: string;
          p_vc_count: number;
          p_workload_hours: number;
        };
        Returns: string;
      };
      academic_create_year:
        | {
            Args: {
              p_course_id: string;
              p_ends_on: string;
              p_source_ref: string;
              p_starts_on: string;
              p_status?: string;
              p_year: number;
            };
            Returns: string;
          }
        | {
            Args: {
              p_course_id: string;
              p_ends_on: string;
              p_source_ref: string;
              p_source_verified: boolean;
              p_starts_on: string;
              p_status: string;
              p_year: number;
            };
            Returns: string;
          };
      academic_current_student: { Args: never; Returns: string };
      academic_import_qts_sessions: {
        Args: { p_document_id: string };
        Returns: number;
      };
      academic_instruction_hours: {
        Args: { p_end: string; p_start: string };
        Returns: number;
      };
      academic_link_qts_document: {
        Args: {
          p_academic_year_id: string;
          p_document_id: string;
          p_reason: string;
        };
        Returns: number;
      };
      academic_map_qts_session: {
        Args: {
          p_classification: string;
          p_expected_revision: number;
          p_offering_id: string;
          p_reason: string;
          p_session_id: string;
        };
        Returns: string;
      };
      academic_normalize_title: { Args: { p_value: string }; Returns: string };
      academic_open_year: {
        Args: { p_academic_year_id: string; p_reason: string };
        Returns: string;
      };
      academic_propose_session: {
        Args: {
          p_actual_ends_at: string;
          p_actual_starts_at: string;
          p_assignment_ids: Json;
          p_content: string;
          p_location: string;
          p_outcome: string;
          p_session_id: string;
        };
        Returns: string;
      };
      academic_reopen_year: {
        Args: { p_academic_year_id: string; p_reason: string };
        Returns: string;
      };
      academic_require_open_year: {
        Args: { p_academic_year_id: string };
        Returns: {
          change_reason: string | null;
          closed_at: string | null;
          closed_by: string | null;
          course_id: string;
          created_at: string;
          created_by: string | null;
          ends_on: string;
          id: string;
          revision: number;
          source_ref: string;
          source_verified: boolean;
          starts_on: string;
          status: string;
          year: number;
        };
        SetofOptions: {
          from: "*";
          to: "academic_years";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      academic_save_attendance: {
        Args: {
          p_enrollment_id: string;
          p_expected_revision: number;
          p_justified: number;
          p_reason: string;
          p_unjustified: number;
        };
        Returns: {
          change_reason: string | null;
          id: string;
          justified_absences: number | null;
          offering_id: string;
          revision: number;
          student_id: string;
          student_label: string;
          unjustified_absences: number | null;
        };
        SetofOptions: {
          from: "*";
          to: "academic_enrollments";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      academic_save_calendar_event: {
        Args: {
          p_academic_year_id: string;
          p_blocks_instruction: boolean;
          p_class_id: string;
          p_event_date: string;
          p_event_id: string;
          p_event_type: string;
          p_reason: string;
          p_source_ref: string;
          p_title: string;
        };
        Returns: string;
      };
      academic_save_discipline_alias: {
        Args: { p_alias: string; p_discipline_id: string };
        Returns: string;
      };
      academic_save_grade: {
        Args: {
          p_assessment_id: string;
          p_enrollment_id: string;
          p_expected_revision: number;
          p_reason: string;
          p_score: number;
        };
        Returns: {
          assessment_id: string;
          change_reason: string | null;
          enrollment_id: string;
          id: string;
          offering_id: string;
          revision: number;
          score: number | null;
          updated_at: string;
        };
        SetofOptions: {
          from: "*";
          to: "academic_grades";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      academic_set_offering_year: {
        Args: {
          p_academic_year_id: string;
          p_offering_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      academic_update_year:
        | {
            Args: {
              p_academic_year_id: string;
              p_ends_on: string;
              p_expected_revision: number;
              p_reason: string;
              p_source_ref: string;
              p_starts_on: string;
            };
            Returns: string;
          }
        | {
            Args: {
              p_academic_year_id: string;
              p_ends_on: string;
              p_expected_revision: number;
              p_reason: string;
              p_source_ref: string;
              p_source_verified: boolean;
              p_starts_on: string;
            };
            Returns: string;
          };
      academic_valid_parameters: { Args: { p: Json }; Returns: boolean };
      academic_validate_session: {
        Args: {
          p_attendance: Json;
          p_expected_revision: number;
          p_outcome: string;
          p_reason: string;
          p_session_id: string;
        };
        Returns: string;
      };
      can_read_announcement: {
        Args: { target: Database["public"]["Tables"]["announcements"]["Row"] };
        Returns: boolean;
      };
      coordination_dashboard_summary: {
        Args: never;
        Returns: {
          completed_profiles: number;
          documents_validated: number;
          open_pending_items: number;
          pending_health_validations: number;
          students_equipment_completed: number;
          students_quarantine_equipment: number;
          students_with_documents: number;
          students_without_canga: number;
          total_students: number;
        }[];
      };
      current_role: { Args: never; Returns: string };
      current_student_id: { Args: never; Returns: string };
      expire_follow_up_deadlines: { Args: never; Returns: number };
      internship_cancel_assignment: {
        Args: { p_assignment_id: string; p_reason: string };
        Returns: string;
      };
      internship_check_assignment: {
        Args: {
          p_assignment_id: string;
          p_shift_id: string;
          p_source: string;
          p_student_id: string;
        };
        Returns: undefined;
      };
      internship_configure_cfo_2026_beaches: {
        Args: { p_names: string[] };
        Returns: string;
      };
      internship_coordination_schedule: {
        Args: { p_program_id: string };
        Returns: {
          abm_departure_time: string;
          abm_return_time: string;
          activity_code: string;
          activity_name: string;
          approved_minutes: number;
          assignment_id: string;
          assignment_source: string;
          assignment_status: string;
          cadet_report_count: number;
          document_reference: string;
          ends_at: string;
          movement_reason: string;
          obm_arrival_time: string;
          obm_departure_time: string;
          performed_minutes: number;
          planned_minutes: number;
          resource_name: string;
          shift_date: string;
          shift_id: string;
          shift_status: string;
          site_name: string;
          starts_at: string;
          student_id: string;
          student_number: number;
          supervisor_name: string;
          template_code: string;
          validation_status: string;
          war_name: string;
        }[];
      };
      internship_coordination_workload: {
        Args: { p_program_id: string };
        Returns: {
          assigned_shifts: number;
          awaiting_homologation: number;
          concluded: boolean;
          excess_minutes: number;
          missing_required_minutes: number;
          missing_target_minutes: number;
          open_occurrences: number;
          performed_minutes: number;
          planned_minutes: number;
          required_minutes: number;
          student_id: string;
          student_number: number;
          target_minutes: number;
          validated_minutes: number;
          war_name: string;
        }[];
      };
      internship_has_role: { Args: { p_roles: string[] }; Returns: boolean };
      internship_homologate_execution: {
        Args: {
          p_actual_ends_at: string;
          p_actual_starts_at: string;
          p_approved_minutes: number;
          p_assignment_id: string;
          p_attendance_status: string;
          p_decision_reason: string;
          p_occurrence_justified: boolean;
          p_occurrence_reason: string;
          p_paper_reference: string;
          p_supervisor_name: string;
        };
        Returns: string;
      };
      internship_initialize_cfo_2026: { Args: never; Returns: string };
      internship_my_shifts: {
        Args: never;
        Returns: {
          activity_code: string;
          activity_name: string;
          assignment_id: string;
          ends_at: string;
          planned_minutes: number;
          resource_name: string;
          shift_id: string;
          site_name: string;
          starts_at: string;
          supervisor_name: string;
        }[];
      };
      internship_my_workload: {
        Args: never;
        Returns: {
          performed_minutes: number;
          planned_minutes: number;
          required_minutes: number;
          target_minutes: number;
          validated_minutes: number;
        }[];
      };
      internship_own_published_assignment: {
        Args: { p_assignment_id: string };
        Returns: boolean;
      };
      internship_own_published_shift: {
        Args: { p_shift_id: string };
        Returns: boolean;
      };
      internship_publish_cfo_2026: { Args: never; Returns: string };
      internship_reschedule_gbm_assignment: {
        Args: {
          p_assignment_id: string;
          p_ends_at: string;
          p_reason: string;
          p_resource_id: string;
          p_source: string;
          p_starts_at: string;
          p_supervisor_name: string;
        };
        Returns: string;
      };
      internship_record_point: {
        Args: {
          p_accuracy_m: number;
          p_assignment_id: string;
          p_latitude: number;
          p_longitude: number;
          p_point_type: string;
          p_supervisor_name?: string;
        };
        Returns: string;
      };
      internship_record_point_with_reason: {
        Args: {
          p_accuracy_m: number;
          p_assignment_id: string;
          p_early_exit_reason: string | null;
          p_latitude: number;
          p_longitude: number;
          p_point_type: string;
          p_supervisor_name: string | null;
        };
        Returns: string;
      };
      internship_can_manage: { Args: Record<PropertyKey, never>; Returns: boolean };
      internship_planning_cadets: {
        Args: { p_program_id: string };
        Returns: { id: string; war_name: string; student_number: number }[];
      };
      internship_planning_birthdays: {
        Args: { p_program_id: string };
        Returns: { student_id: string; birth_month_day: string }[];
      };
      internship_planning_constraints: {
        Args: { p_program_id: string };
        Returns: {
          id: string;
          student_id: string;
          starts_on: string;
          ends_on: string;
          kind: string;
        }[];
      };
      internship_publish_week: {
        Args: { p_program_id: string; p_week_start: string; p_request_id: string; p_lines: Json };
        Returns: string[];
      };
      internship_dashboard_schedule: {
        Args: { p_from: string; p_to: string };
        Returns: {
          assignment_id: string;
          student_id: string;
          student_number: number;
          war_name: string;
          activity_name: string;
          site_name: string;
          resource_name: string;
          starts_at: string;
          ends_at: string;
          uniform_code: string;
          validated_minutes: number;
        }[];
      };
      internship_schedule_gbm_from_template_uniform: {
        Args: { p_program_id: string; p_template_code: string; p_site_id: string; p_shift_date: string; p_student_id: string; p_supervisor_name: string; p_uniform_code: string };
        Returns: string;
      };
      internship_schedule_gbm_shift_uniform: {
        Args: { p_program_id: string; p_activity_code: string; p_site_id: string; p_resource_id: string; p_starts_at: string; p_ends_at: string; p_student_id: string; p_supervisor_name: string; p_uniform_code: string };
        Returns: string;
      };
      internship_schedule_lifeguard_day_uniform: {
        Args: { p_program_id: string; p_shift_date: string; p_student_ids: string[]; p_document_reference: string; p_officer_name: string; p_uniform_code: string };
        Returns: string;
      };
      internship_set_shift_uniform: {
        Args: { p_shift_id: string; p_uniform_code: string };
        Returns: undefined;
      };
      internship_schedule_gbm_from_template: {
        Args: {
          p_program_id: string;
          p_shift_date: string;
          p_site_id: string;
          p_student_id: string;
          p_supervisor_name: string;
          p_template_code: string;
        };
        Returns: string;
      };
      internship_schedule_gbm_shift: {
        Args: {
          p_activity_code: string;
          p_ends_at: string;
          p_program_id: string;
          p_resource_id: string;
          p_site_id: string;
          p_starts_at: string;
          p_student_id: string;
          p_supervisor_name: string;
          p_template_id?: string;
        };
        Returns: string;
      };
      internship_schedule_lifeguard_day: {
        Args: {
          p_document_reference: string;
          p_officer_name: string;
          p_program_id: string;
          p_shift_date: string;
          p_student_ids: string[];
        };
        Returns: string;
      };
      internship_handover_assignment: {
        Args: { p_assignment_id: string; p_new_student_id: string; p_handover_at: string; p_reason: string };
        Returns: string;
      };
      internship_substitute_assignment: {
        Args: {
          p_assignment_id: string;
          p_new_student_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      internship_fill_cancelled_vacancy: {
        Args: {
          p_assignment_id: string;
          p_new_student_id: string;
          p_reason: string;
        };
        Returns: string;
      };
      internship_replace_with_impediment: {
        Args: {
          p_assignment_id: string;
          p_new_student_id: string;
          p_reason_kind: string;
          p_reason_details: string;
          p_impediment_until: string;
        };
        Returns: string;
      };
      is_admin: { Args: never; Returns: boolean };
      is_coord: { Args: never; Returns: boolean };
      normalize_label: { Args: { input: string }; Returns: string };
      qts_add_activity_adjustment: {
        Args: {
          p_activity_date: string;
          p_expected_activity: string;
          p_reason?: string;
          p_replacement_activity: string;
          p_replacement_instructor?: string;
          p_replacement_workload?: string;
          p_starts_at: string;
        };
        Returns: string;
      };
      qts_calendar: {
        Args: { p_end: string; p_start: string };
        Returns: {
          activity: string;
          activity_date: string;
          document_id: string;
          ends_at: string;
          id: string;
          instructor: string;
          is_break: boolean;
          location: string;
          original_filename: string;
          sequence: number;
          starts_at: string;
          uniform: string;
          workload: string;
        }[];
      };
      qts_publish_provisional_document: {
        Args: { p_activities: Json; p_document_id: string; p_reason?: string };
        Returns: string;
      };
      qts_publish_reviewed_document: {
        Args: {
          p_academic_year_id: string;
          p_activities: Json;
          p_document_id: string;
        };
        Returns: string;
      };
      qts_published_documents: {
        Args: { p_end: string; p_start: string };
        Returns: {
          id: string;
          original_filename: string;
          period_end: string;
          period_start: string;
          storage_path: string;
        }[];
      };
      schedule_active_role: { Args: never; Returns: string };
      schedule_calendar: {
        Args: { p_end: string; p_start: string };
        Returns: {
          date: string;
          duty: string;
          id: string;
          kind: string;
          mine: boolean;
          person: string;
        }[];
      };
      schedule_can_read_document: {
        Args: { p_document_id: string };
        Returns: boolean;
      };
      schedule_can_publish: { Args: Record<PropertyKey, never>; Returns: boolean };
      schedule_publishing_people: {
        Args: Record<PropertyKey, never>;
        Returns: {
          kind: string;
          id: string;
          class_id: string | null;
          student_number: number | null;
          war_name: string | null;
          full_name: string | null;
          enrollment_id: string | null;
          service_alias: string | null;
          registration: string | null;
          profile_id: string | null;
        }[];
      };
      schedule_cancel_assignment: {
        Args: { p_assignment_id: string; p_reason: string };
        Returns: undefined;
      };
      schedule_claim_document_notification: {
        Args: { p_document_id: string };
        Returns: {
          duty_date: string;
          duty_function: string;
          event_id: string;
          event_type: string;
          idempotency_key: string;
          original_filename: string;
          schedule_type_name: string;
          student_id: string;
        }[];
      };
      schedule_claim_notification_event: {
        Args: never;
        Returns: {
          duty_date: string;
          duty_function: string;
          event_id: string;
          event_type: string;
          idempotency_key: string;
          original_filename: string;
          schedule_type_name: string;
          student_id: string;
        }[];
      };
      schedule_claim_processing_run: {
        Args: { p_parser_revision: string };
        Returns: {
          attempt: number;
          class_id: string;
          document_id: string;
          method: string;
          period_start: string;
          run_id: string;
          schedule_type_name: string;
          storage_path: string;
        }[];
      };
      schedule_claim_processing_run_for_document: {
        Args: { p_document_id: string; p_parser_revision: string };
        Returns: {
          attempt: number;
          class_id: string;
          document_id: string;
          method: string;
          period_start: string;
          run_id: string;
          schedule_type_name: string;
          storage_path: string;
        }[];
      };
      schedule_complete_notification_delivery: {
        Args: {
          p_delivery_id: string;
          p_error_message?: string;
          p_permanent?: boolean;
          p_provider_message_id?: string;
          p_sent: boolean;
        };
        Returns: undefined;
      };
      schedule_complete_processing_run: {
        Args: {
          p_candidates?: Json;
          p_error_code?: string;
          p_error_message?: string;
          p_metrics?: Json;
          p_run_id: string;
          p_status: string;
        };
        Returns: number;
      };
      schedule_confirm_candidate: {
        Args: { p_candidate_id: string; p_reason: string; p_student_id: string };
        Returns: string;
      };
      schedule_correct_assignment: {
        Args: {
          p_assignment_id: string;
          p_duty_date: string;
          p_duty_function: string;
          p_reason: string;
          p_student_id: string;
        };
        Returns: string;
      };
      schedule_fail_upload: {
        Args: { p_document_id: string; p_reason: string };
        Returns: {
          checksum_sha256: string;
          class_id: string;
          created_at: string;
          id: string;
          mime_type: string;
          original_filename: string;
          period_end: string | null;
          period_start: string | null;
          processing_status: string;
          publication_status: string;
          published_at: string | null;
          published_by: string;
          schedule_type_id: string;
          size_bytes: number;
          storage_path: string;
          supersedes_document_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "schedule_documents";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      schedule_finalize_document: {
        Args: { p_document_id: string };
        Returns: {
          checksum_sha256: string;
          class_id: string;
          created_at: string;
          id: string;
          mime_type: string;
          original_filename: string;
          period_end: string | null;
          period_start: string | null;
          processing_status: string;
          publication_status: string;
          published_at: string | null;
          published_by: string;
          schedule_type_id: string;
          size_bytes: number;
          storage_path: string;
          supersedes_document_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "schedule_documents";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      schedule_finalize_notification_event: {
        Args: { p_event_id: string };
        Returns: string;
      };
      schedule_is_current_officer_run: {
        Args: { p_document_id: string; p_run_id: string };
        Returns: boolean;
      };
      schedule_live_roster: {
        Args: { p_end: string; p_start: string };
        Returns: {
          account_role: string;
          class_id: string;
          duty: string;
          duty_date: string;
          id: string;
          kind: string;
          person: string;
          profile_id: string;
          student_id: string;
        }[];
      };
      schedule_publish_auto_candidate: {
        Args: { p_candidate_id: string };
        Returns: string;
      };
      schedule_publish_reviewed_import: {
        Args: { p_document_id: string; p_extraction?: Json; p_rows: Json };
        Returns: string;
      };
      schedule_register_document: {
        Args: {
          p_checksum_sha256: string;
          p_class_id: string;
          p_original_filename: string;
          p_period_end?: string;
          p_period_start?: string;
          p_schedule_type_id: string;
          p_size_bytes: number;
          p_supersedes_document_id?: string;
        };
        Returns: {
          checksum_sha256: string;
          class_id: string;
          created_at: string;
          id: string;
          mime_type: string;
          original_filename: string;
          period_end: string | null;
          period_start: string | null;
          processing_status: string;
          publication_status: string;
          published_at: string | null;
          published_by: string;
          schedule_type_id: string;
          size_bytes: number;
          storage_path: string;
          supersedes_document_id: string | null;
        };
        SetofOptions: {
          from: "*";
          to: "schedule_documents";
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      schedule_request_reprocess: {
        Args: { p_document_id: string; p_method?: string };
        Returns: string;
      };
      schedule_reserve_notification_delivery: {
        Args: { p_channel: string; p_event_id: string; p_recipient_key: string };
        Returns: string;
      };
      schedule_reserve_reminder: {
        Args: {
          p_channel: string;
          p_duty_date: string;
          p_profile_id: string;
          p_recipient_key: string;
          p_slot: string;
        };
        Returns: {
          id: string;
          lease_token: string;
        }[];
      };
      schedule_retire_duplicate_document: {
        Args: { p_document_id: string; p_reason: string };
        Returns: string;
      };
      schedule_same_active_class: {
        Args: { p_student_id: string };
        Returns: boolean;
      };
      student_dashboard_summary: {
        Args: never;
        Returns: {
          documents_completion_percent: number;
          equipment_completion_percent: number;
          missing_document_types: string[];
          pending_quarantine_equipment: number;
          profile_completion_percent: number;
          quarantine_equipment_completion_percent: number;
        }[];
      };
      submit_follow_up_manifestation: {
        Args: { p_body: string; p_record_id: string };
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  storage: {
    Tables: {
      buckets: {
        Row: {
          allowed_mime_types: string[] | null;
          avif_autodetection: boolean | null;
          created_at: string | null;
          file_size_limit: number | null;
          id: string;
          name: string;
          owner: string | null;
          owner_id: string | null;
          public: boolean | null;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string | null;
          versioning_status: string;
        };
        Insert: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id: string;
          name: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Update: {
          allowed_mime_types?: string[] | null;
          avif_autodetection?: boolean | null;
          created_at?: string | null;
          file_size_limit?: number | null;
          id?: string;
          name?: string;
          owner?: string | null;
          owner_id?: string | null;
          public?: boolean | null;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string | null;
          versioning_status?: string;
        };
        Relationships: [];
      };
      buckets_analytics: {
        Row: {
          created_at: string;
          deleted_at: string | null;
          format: string;
          id: string;
          name: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          deleted_at?: string | null;
          format?: string;
          id?: string;
          name?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      buckets_vectors: {
        Row: {
          created_at: string;
          id: string;
          type: Database["storage"]["Enums"]["buckettype"];
          updated_at: string;
        };
        Insert: {
          created_at?: string;
          id: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          type?: Database["storage"]["Enums"]["buckettype"];
          updated_at?: string;
        };
        Relationships: [];
      };
      iceberg_namespaces: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          metadata: Json;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          metadata?: Json;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_namespaces_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
        ];
      };
      iceberg_tables: {
        Row: {
          bucket_name: string;
          catalog_id: string;
          created_at: string;
          id: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id: string | null;
          shard_id: string | null;
          shard_key: string | null;
          updated_at: string;
        };
        Insert: {
          bucket_name: string;
          catalog_id: string;
          created_at?: string;
          id?: string;
          location: string;
          name: string;
          namespace_id: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Update: {
          bucket_name?: string;
          catalog_id?: string;
          created_at?: string;
          id?: string;
          location?: string;
          name?: string;
          namespace_id?: string;
          remote_table_id?: string | null;
          shard_id?: string | null;
          shard_key?: string | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "iceberg_tables_catalog_id_fkey";
            columns: ["catalog_id"];
            isOneToOne: false;
            referencedRelation: "buckets_analytics";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "iceberg_tables_namespace_id_fkey";
            columns: ["namespace_id"];
            isOneToOne: false;
            referencedRelation: "iceberg_namespaces";
            referencedColumns: ["id"];
          },
        ];
      };
      migrations: {
        Row: {
          executed_at: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Insert: {
          executed_at?: string | null;
          hash: string;
          id: number;
          name: string;
        };
        Update: {
          executed_at?: string | null;
          hash?: string;
          id?: number;
          name?: string;
        };
        Relationships: [];
      };
      objects: {
        Row: {
          archived_at: string | null;
          bucket_id: string | null;
          created_at: string | null;
          id: string;
          is_delete_marker: boolean;
          is_versioned: boolean;
          last_accessed_at: string | null;
          metadata: Json | null;
          name: string | null;
          owner: string | null;
          owner_id: string | null;
          path_tokens: string[] | null;
          updated_at: string | null;
          user_metadata: Json | null;
          version: string | null;
        };
        Insert: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Update: {
          archived_at?: string | null;
          bucket_id?: string | null;
          created_at?: string | null;
          id?: string;
          is_delete_marker?: boolean;
          is_versioned?: boolean;
          last_accessed_at?: string | null;
          metadata?: Json | null;
          name?: string | null;
          owner?: string | null;
          owner_id?: string | null;
          path_tokens?: string[] | null;
          updated_at?: string | null;
          user_metadata?: Json | null;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "objects_bucketId_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads: {
        Row: {
          bucket_id: string;
          created_at: string;
          id: string;
          in_progress_size: number;
          key: string;
          metadata: Json | null;
          owner_id: string | null;
          upload_signature: string;
          user_metadata: Json | null;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          id: string;
          in_progress_size?: number;
          key: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature: string;
          user_metadata?: Json | null;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          id?: string;
          in_progress_size?: number;
          key?: string;
          metadata?: Json | null;
          owner_id?: string | null;
          upload_signature?: string;
          user_metadata?: Json | null;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
        ];
      };
      s3_multipart_uploads_parts: {
        Row: {
          bucket_id: string;
          created_at: string;
          etag: string;
          id: string;
          key: string;
          owner_id: string | null;
          part_number: number;
          size: number;
          upload_id: string;
          version: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          etag: string;
          id?: string;
          key: string;
          owner_id?: string | null;
          part_number: number;
          size?: number;
          upload_id: string;
          version: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          etag?: string;
          id?: string;
          key?: string;
          owner_id?: string | null;
          part_number?: number;
          size?: number;
          upload_id?: string;
          version?: string;
        };
        Relationships: [
          {
            foreignKeyName: "s3_multipart_uploads_parts_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "s3_multipart_uploads_parts_upload_id_fkey";
            columns: ["upload_id"];
            isOneToOne: false;
            referencedRelation: "s3_multipart_uploads";
            referencedColumns: ["id"];
          },
        ];
      };
      vector_indexes: {
        Row: {
          bucket_id: string;
          created_at: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id: string;
          metadata_configuration: Json | null;
          name: string;
          updated_at: string;
        };
        Insert: {
          bucket_id: string;
          created_at?: string;
          data_type: string;
          dimension: number;
          distance_metric: string;
          id?: string;
          metadata_configuration?: Json | null;
          name: string;
          updated_at?: string;
        };
        Update: {
          bucket_id?: string;
          created_at?: string;
          data_type?: string;
          dimension?: number;
          distance_metric?: string;
          id?: string;
          metadata_configuration?: Json | null;
          name?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "vector_indexes_bucket_id_fkey";
            columns: ["bucket_id"];
            isOneToOne: false;
            referencedRelation: "buckets_vectors";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      allow_any_operation: {
        Args: { expected_operations: string[] };
        Returns: boolean;
      };
      allow_only_operation: {
        Args: { expected_operation: string };
        Returns: boolean;
      };
      can_insert_object: {
        Args: { bucketid: string; metadata: Json; name: string; owner: string };
        Returns: undefined;
      };
      extension: { Args: { name: string }; Returns: string };
      filename: { Args: { name: string }; Returns: string };
      foldername: { Args: { name: string }; Returns: string[] };
      get_common_prefix: {
        Args: { p_delimiter: string; p_key: string; p_prefix: string };
        Returns: string;
      };
      get_size_by_bucket: {
        Args: never;
        Returns: {
          bucket_id: string;
          size: number;
        }[];
      };
      list_multipart_uploads_with_delimiter: {
        Args: {
          bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_key_token?: string;
          next_upload_token?: string;
          prefix_param: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
        }[];
      };
      list_objects_with_delimiter: {
        Args: {
          _bucket_id: string;
          delimiter_param: string;
          max_keys?: number;
          next_token?: string;
          prefix_param: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      operation: { Args: never; Returns: string };
      search: {
        Args: {
          bucketname: string;
          levels?: number;
          limits?: number;
          offsets?: number;
          prefix: string;
          search?: string;
          sortcolumn?: string;
          sortorder?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_by_timestamp: {
        Args: {
          p_bucket_id: string;
          p_level: number;
          p_limit: number;
          p_prefix: string;
          p_sort_column: string;
          p_sort_column_after: string;
          p_sort_order: string;
          p_start_after: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
      search_v2: {
        Args: {
          bucket_name: string;
          levels?: number;
          limits?: number;
          prefix: string;
          sort_column?: string;
          sort_column_after?: string;
          sort_order?: string;
          start_after?: string;
        };
        Returns: {
          created_at: string;
          id: string;
          key: string;
          last_accessed_at: string;
          metadata: Json;
          name: string;
          updated_at: string;
        }[];
      };
    };
    Enums: {
      buckettype: "STANDARD" | "ANALYTICS" | "VECTOR";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
  storage: {
    Enums: {
      buckettype: ["STANDARD", "ANALYTICS", "VECTOR"],
    },
  },
} as const;
