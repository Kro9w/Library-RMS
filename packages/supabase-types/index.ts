export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      _prisma_migrations: {
        Row: {
          applied_steps_count: number
          checksum: string
          finished_at: string | null
          id: string
          logs: string | null
          migration_name: string
          rolled_back_at: string | null
          started_at: string
        }
        Insert: {
          applied_steps_count?: number
          checksum: string
          finished_at?: string | null
          id: string
          logs?: string | null
          migration_name: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Update: {
          applied_steps_count?: number
          checksum?: string
          finished_at?: string | null
          id?: string
          logs?: string | null
          migration_name?: string
          rolled_back_at?: string | null
          started_at?: string
        }
        Relationships: []
      }
      Document: {
        Row: {
          content: string
          controlNumber: string | null
          createdAt: string
          documentTypeId: string | null
          fileName: string
          fileSize: number | null
          fileType: string | null
          id: string
          organizationId: string
          reviewRequesterId: string | null
          s3Bucket: string
          s3Key: string
          status: string | null
          title: string
          updatedAt: string
          uploadedById: string
        }
        Insert: {
          content: string
          controlNumber?: string | null
          createdAt?: string
          documentTypeId?: string | null
          fileName: string
          fileSize?: number | null
          fileType?: string | null
          id: string
          organizationId: string
          reviewRequesterId?: string | null
          s3Bucket: string
          s3Key: string
          status?: string | null
          title: string
          updatedAt: string
          uploadedById: string
        }
        Update: {
          content?: string
          controlNumber?: string | null
          createdAt?: string
          documentTypeId?: string | null
          fileName?: string
          fileSize?: number | null
          fileType?: string | null
          id?: string
          organizationId?: string
          reviewRequesterId?: string | null
          s3Bucket?: string
          s3Key?: string
          status?: string | null
          title?: string
          updatedAt?: string
          uploadedById?: string
        }
        Relationships: [
          {
            foreignKeyName: "Document_documentTypeId_fkey"
            columns: ["documentTypeId"]
            isOneToOne: false
            referencedRelation: "DocumentType"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Document_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Document_reviewRequesterId_fkey"
            columns: ["reviewRequesterId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Document_uploadedById_fkey"
            columns: ["uploadedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      DocumentAccess: {
        Row: {
          accessType: string
          createdAt: string
          documentId: string
          id: string
          updatedAt: string
          userId: string
        }
        Insert: {
          accessType: string
          createdAt?: string
          documentId: string
          id: string
          updatedAt: string
          userId: string
        }
        Update: {
          accessType?: string
          createdAt?: string
          documentId?: string
          id?: string
          updatedAt?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DocumentAccess_documentId_fkey"
            columns: ["documentId"]
            isOneToOne: false
            referencedRelation: "Document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DocumentAccess_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      DocumentTag: {
        Row: {
          documentId: string
          id: string
          tagId: string
        }
        Insert: {
          documentId: string
          id: string
          tagId: string
        }
        Update: {
          documentId?: string
          id?: string
          tagId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DocumentTag_documentId_fkey"
            columns: ["documentId"]
            isOneToOne: false
            referencedRelation: "Document"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "DocumentTag_tagId_fkey"
            columns: ["tagId"]
            isOneToOne: false
            referencedRelation: "Tag"
            referencedColumns: ["id"]
          },
        ]
      }
      DocumentType: {
        Row: {
          color: string
          id: string
          name: string
          organizationId: string
        }
        Insert: {
          color: string
          id: string
          name: string
          organizationId: string
        }
        Update: {
          color?: string
          id?: string
          name?: string
          organizationId?: string
        }
        Relationships: [
          {
            foreignKeyName: "DocumentType_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organization"
            referencedColumns: ["id"]
          },
        ]
      }
      Log: {
        Row: {
          action: string
          createdAt: string
          id: string
          organizationId: string
          userId: string
          userRole: string
        }
        Insert: {
          action: string
          createdAt?: string
          id: string
          organizationId: string
          userId: string
          userRole: string
        }
        Update: {
          action?: string
          createdAt?: string
          id?: string
          organizationId?: string
          userId?: string
          userRole?: string
        }
        Relationships: [
          {
            foreignKeyName: "Log_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organization"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Log_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Organization: {
        Row: {
          acronym: string
          id: string
          name: string
        }
        Insert: {
          acronym: string
          id: string
          name: string
        }
        Update: {
          acronym?: string
          id?: string
          name?: string
        }
        Relationships: []
      }
      Remark: {
        Row: {
          authorId: string
          createdAt: string
          documentId: string
          id: string
          message: string
        }
        Insert: {
          authorId: string
          createdAt?: string
          documentId: string
          id: string
          message: string
        }
        Update: {
          authorId?: string
          createdAt?: string
          documentId?: string
          id?: string
          message?: string
        }
        Relationships: [
          {
            foreignKeyName: "Remark_authorId_fkey"
            columns: ["authorId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Remark_documentId_fkey"
            columns: ["documentId"]
            isOneToOne: false
            referencedRelation: "Document"
            referencedColumns: ["id"]
          },
        ]
      }
      Role: {
        Row: {
          canManageDocuments: boolean
          canManageRoles: boolean
          canManageUsers: boolean
          id: string
          name: string
          organizationId: string
        }
        Insert: {
          canManageDocuments?: boolean
          canManageRoles?: boolean
          canManageUsers?: boolean
          id: string
          name: string
          organizationId: string
        }
        Update: {
          canManageDocuments?: boolean
          canManageRoles?: boolean
          canManageUsers?: boolean
          id?: string
          name?: string
          organizationId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Role_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organization"
            referencedColumns: ["id"]
          },
        ]
      }
      Tag: {
        Row: {
          id: string
          isGlobal: boolean
          isLocked: boolean
          name: string
        }
        Insert: {
          id: string
          isGlobal?: boolean
          isLocked?: boolean
          name: string
        }
        Update: {
          id?: string
          isGlobal?: boolean
          isLocked?: boolean
          name?: string
        }
        Relationships: []
      }
      User: {
        Row: {
          email: string
          id: string
          imageUrl: string | null
          name: string | null
          organizationId: string | null
        }
        Insert: {
          email: string
          id: string
          imageUrl?: string | null
          name?: string | null
          organizationId?: string | null
        }
        Update: {
          email?: string
          id?: string
          imageUrl?: string | null
          name?: string | null
          organizationId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "User_organizationId_fkey"
            columns: ["organizationId"]
            isOneToOne: false
            referencedRelation: "Organization"
            referencedColumns: ["id"]
          },
        ]
      }
      UserRole: {
        Row: {
          roleId: string
          userId: string
        }
        Insert: {
          roleId: string
          userId: string
        }
        Update: {
          roleId?: string
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "UserRole_roleId_fkey"
            columns: ["roleId"]
            isOneToOne: false
            referencedRelation: "Role"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "UserRole_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
