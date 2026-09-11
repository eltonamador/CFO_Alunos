export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
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
      academic_offerings: {
        Row: {
          academic_year: number;
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
      _storage_student_id: { Args: { object_name: string }; Returns: string };
      academic_active_role: { Args: never; Returns: string };
      academic_can_grade: { Args: { p_offering_id: string }; Returns: boolean };
      academic_can_read_offering: {
        Args: { p_offering_id: string };
        Returns: boolean;
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
      academic_current_student: { Args: never; Returns: string };
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
      academic_valid_parameters: { Args: { p: Json }; Returns: boolean };
      can_read_announcement: {
        Args: { target: Database["public"]["Tables"]["announcements"]["Row"] };
        Returns: boolean;
      };
      current_role: { Args: never; Returns: string };
      current_student_id: { Args: never; Returns: string };
      expire_follow_up_deadlines: { Args: never; Returns: number };
      is_admin: { Args: never; Returns: boolean };
      is_coord: { Args: never; Returns: boolean };
      normalize_label: { Args: { input: string }; Returns: string };
      schedule_active_role: { Args: never; Returns: string };
      schedule_can_read_document: {
        Args: { p_document_id: string };
        Returns: boolean;
      };
      schedule_cancel_assignment: {
        Args: { p_assignment_id: string; p_reason: string };
        Returns: undefined;
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
      schedule_publish_auto_candidate: {
        Args: { p_candidate_id: string };
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
