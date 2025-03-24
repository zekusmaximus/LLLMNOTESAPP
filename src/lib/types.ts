// src/lib/types.ts
export interface Project {
    id: string;
    title: string;
    description: string | null;
    created_at: string;
    updated_at: string;
    is_archived: boolean;
  }
  
  export interface Note {
    id: string;
    project_id: string;
    content: string;
    llm_source_id: string;
    topic_id: string;
    created_at: string;
    updated_at: string;
    tags?: Tag[]; // Add this line if not already present
  }
  
  export interface LlmSource {
    id: string;
    name: string;
  }
  
  export interface Topic {
    id: string;
    name: string;
  }
  
  export interface Tag {
    id: string;
    name: string;
  }