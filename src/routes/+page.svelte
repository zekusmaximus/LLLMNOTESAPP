<script lang="ts">
    import { onMount } from 'svelte';
    import { supabase } from '$lib/supabase';
  
    // Define types for our data
    interface Project {
      id: string;
      title: string;
      description: string | null;
      created_at: string;
      updated_at: string;
      is_archived: boolean;
    }
  
    let projects: Project[] = [];
    let loading: boolean = true;
    let error: string | null = null;
    
    // Form state for creating a new project
    let newProject = {
      title: '',
      description: ''
    };
    let creating: boolean = false;
  
    onMount(async () => {
      try {
        loading = true;
        const { data, error: fetchError } = await supabase
          .from('projects')
          .select('*')
          .eq('is_archived', false)
          .order('updated_at', { ascending: false });
        
        if (fetchError) throw fetchError;
        projects = data || [];
      } catch (e) {
        console.error('Error fetching projects:', e);
        error = 'Could not load projects. Please try again.';
      } finally {
        loading = false;
      }
    });
  
    async function createProject() {
      if (!newProject.title.trim()) {
        return;
      }
  
      try {
        creating = true;
        const { data, error: insertError } = await supabase
          .from('projects')
          .insert([{ 
            title: newProject.title,
            description: newProject.description
          }])
          .select();
        
        if (insertError) throw insertError;
        
        // Add new project to the list
        if (data && data.length > 0) {
          projects = [data[0], ...projects];
        }
        
        // Reset form
        newProject.title = '';
        newProject.description = '';
      } catch (e) {
        console.error('Error creating project:', e);
        error = 'Could not create project. Please try again.';
      } finally {
        creating = false;
      }
    }
  
    function formatDate(dateString: string): string {
      return new Date(dateString).toLocaleDateString();
    }
  </script>
  
  <div class="min-h-screen bg-gray-100">
    <header class="bg-white shadow">
      <div class="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        <h1 class="text-3xl font-bold text-gray-900">Project Notes App</h1>
      </div>
    </header>
    
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <!-- Error message -->
      {#if error}
        <div class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      {/if}
      
      <!-- New Project Form -->
      <div class="bg-white shadow sm:rounded-lg mb-6 p-6">
        <h2 class="text-lg font-medium text-gray-900 mb-4">Create New Project</h2>
        <form on:submit|preventDefault={createProject} class="space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-gray-700">Project Title</label>
            <input
              bind:value={newProject.title}
              type="text"
              id="title"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter project title"
              required
            />
          </div>
          
          <div>
            <label for="description" class="block text-sm font-medium text-gray-700">Description (optional)</label>
            <textarea
              bind:value={newProject.description}
              id="description"
              rows="3"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm p-2 border focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Enter project description"
            ></textarea>
          </div>
          
          <button
            type="submit"
            disabled={creating}
            class="inline-flex justify-center rounded-md border border-transparent bg-indigo-600 py-2 px-4 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50"
          >
            {creating ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
      
      <!-- Projects List -->
      <div class="bg-white shadow sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6">
          <h2 class="text-lg font-medium text-gray-900">Your Projects</h2>
        </div>
        
        {#if loading}
          <div class="px-4 py-5 sm:p-6 text-center text-gray-500">
            Loading projects...
          </div>
        {:else if projects.length === 0}
          <div class="px-4 py-5 sm:p-6 text-center text-gray-500">
            No projects yet. Create your first project above.
          </div>
        {:else}
          <ul class="divide-y divide-gray-200">
            {#each projects as project}
              <li>
                <a href="/project/{project.id}" class="block hover:bg-gray-50">
                  <div class="px-4 py-4 sm:px-6">
                    <div class="flex items-center justify-between">
                      <p class="text-sm font-medium text-indigo-600 truncate">
                        {project.title}
                      </p>
                      <div class="ml-2 flex-shrink-0 flex">
                        <p class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                          Updated: {formatDate(project.updated_at)}
                        </p>
                      </div>
                    </div>
                    <div class="mt-2 sm:flex sm:justify-between">
                      <div class="sm:flex">
                        <p class="flex items-center text-sm text-gray-500">
                          {project.description || 'No description'}
                        </p>
                      </div>
                      <div class="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>
                          Created: {formatDate(project.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>
                </a>
              </li>
            {/each}
          </ul>
        {/if}
      </div>
    </main>
  </div>