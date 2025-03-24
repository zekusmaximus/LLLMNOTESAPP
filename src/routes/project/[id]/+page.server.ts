import { error } from '@sveltejs/kit';
import { supabase } from '$lib/supabase';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  const { id } = params;
  
  // Load project data
  const { data: project, error: projectError } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .single();
  
  if (projectError) {
    console.error('Error fetching project:', projectError);
    throw error(404, 'Project not found');
  }
  
  // Load notes for this project
  const { data: notes, error: notesError } = await supabase
    .from('notes')
    .select(`
      *,
      llm_sources (id, name),
      topics (id, name)
    `)
    .eq('project_id', id)
    .order('updated_at', { ascending: false });
  
  if (notesError) {
    console.error('Error fetching notes:', notesError);
    throw error(500, 'Failed to load notes');
  }
  
  // Load LLM sources for dropdown
  const { data: llmSources, error: llmError } = await supabase
    .from('llm_sources')
    .select('*')
    .order('name');
  
  if (llmError) {
    console.error('Error fetching LLM sources:', llmError);
    throw error(500, 'Failed to load LLM sources');
  }
  
  // Load topics for dropdown
  const { data: topics, error: topicsError } = await supabase
    .from('topics')
    .select('*')
    .order('name');
  
  if (topicsError) {
    console.error('Error fetching topics:', topicsError);
    throw error(500, 'Failed to load topics');
  }
  
  return {
    project,
    notes,
    llmSources,
    topics
  };
};