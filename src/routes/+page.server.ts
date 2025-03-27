import { supabase } from '$lib/supabase';

// Define the return type explicitly
export async function load() {
  // Fetch projects
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('*')
    .eq('is_archived', false)
    .order('updated_at', { ascending: false });

  if (projectsError) {
    console.error('Error fetching projects:', projectsError);
    return { projects: [] };
  }

  // For each project, fetch the most recent note
  const projectsWithRecentNotes = await Promise.all(
    projects.map(async (project) => {
      const { data: recentNotes, error: notesError } = await supabase
        .from('notes')
        .select(`
          *,
          llm_sources (id, name),
          topics (id, name)
        `)
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1);

      if (notesError) {
        console.error(`Error fetching notes for project ${project.id}:`, notesError);
        return { ...project, recentNote: null };
      }

      return {
        ...project,
        recentNote: recentNotes.length > 0 ? recentNotes[0] : null
      };
    })
  );

  return {
    projects: projectsWithRecentNotes
  };
};