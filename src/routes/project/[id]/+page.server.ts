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
  
  // Load all tags
  const { data: tags, error: tagsError } = await supabase
    .from('tags')
    .select('*')
    .order('name');
  
  if (tagsError) {
    console.error('Error fetching tags:', tagsError);
    throw error(500, 'Failed to load tags');
  }
  
  // Load note_tags relationships
  const { data: noteTags, error: noteTagsError } = await supabase
    .from('note_tags')
    .select('*')
    .in('note_id', notes.map(note => note.id));
  
  if (noteTagsError) {
    console.error('Error fetching note_tags:', noteTagsError);
    throw error(500, 'Failed to load note tags');
  }
  
  // Attach tags to notes
  for (const note of notes) {
    const noteTagIds = noteTags
      .filter(nt => nt.note_id === note.id)
      .map(nt => nt.tag_id);
    
    note.tags = tags.filter(tag => noteTagIds.includes(tag.id));
  }
  
  return {
    project,
    notes,
    llmSources,
    topics,
    tags
  };
};